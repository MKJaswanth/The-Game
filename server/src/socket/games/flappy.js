import { getRoom } from '../rooms.js';
import { recordScore } from '../../routes/scores.js';

/**
 * M12 — Flappy Race 🐦
 * Server-authoritative side-scrolling flight race for 1–4 players.
 *
 * The server owns physics, the pipe course, scoring and crash detection; the
 * client only sends flap impulses and renders interpolated snapshots. That
 * keeps the race fair (no client-side cheating) and keeps every player flying
 * the exact same course.
 */

const activeFlappyGames = new Map();

/* ---------- World tuning (logical pixels, logical seconds) ---------- */
export const WORLD_W = 420;
export const WORLD_H = 560;
export const BIRD_X = 110;
export const BIRD_R = 12;

const TICK_HZ = 30;
const DT = 1 / TICK_HZ;

const GRAVITY = 1450;        // px/s²
const FLAP_VY = -420;        // px/s
const MAX_FALL_VY = 720;     // px/s
const BASE_SCROLL = 165;     // px/s
const MAX_SCROLL = 265;      // px/s
const SCROLL_RAMP = 1.8;     // px/s gained per pipe passed

const PIPE_W = 62;
const PIPE_SPACING = 235;    // px between pipe columns
const BASE_GAP = 168;        // px of open space
const MIN_GAP = 132;
const GAP_SHRINK = 2.4;      // px removed per pipe passed
const START_PAD = 300;       // head start before the first pipe

const COUNTDOWN_MS = 2400;
const MAX_RACE_MS = 180000;  // safety net so a race can never hang forever

export function getFlappyGame(roomCode) {
  return activeFlappyGames.get(roomCode?.toUpperCase()?.trim());
}

function scrollSpeed(pipeCount) {
  return Math.min(MAX_SCROLL, BASE_SCROLL + pipeCount * SCROLL_RAMP);
}

function pipeGap(pipeCount) {
  return Math.max(MIN_GAP, BASE_GAP - pipeCount * GAP_SHRINK);
}

function randomGapY(gapH) {
  const margin = 70;
  return margin + Math.random() * (WORLD_H - gapH - margin * 2);
}

let pipeSeq = 0;

function makePipe(gapH, x) {
  return {
    id: `p${++pipeSeq}`,
    x,
    gapY: randomGapY(gapH),
    gapH,
    passed: {} // nickname -> true once scored
  };
}

/**
 * M12-06/M12-07: broadcast a compact snapshot of the race.
 */
function broadcastFlappyState(io, game) {
  const snapshot = {
    roomCode: game.roomCode,
    status: game.status,
    worldX: Math.round(game.worldX * 10) / 10,
    scrollSpeed: Math.round(game.scrollSpeed),
    countdownMs: game.countdownUntil ? Math.max(0, game.countdownUntil - Date.now()) : 0,
    elapsedMs: game.startedAt ? Date.now() - game.startedAt : 0,
    pipes: game.pipes.map((p) => ({
      id: p.id,
      x: Math.round(p.x),
      gapY: Math.round(p.gapY),
      gapH: Math.round(p.gapH)
    })),
    birds: game.players.map((nick) => {
      const b = game.birds[nick];
      return {
        nickname: nick,
        y: Math.round(b.y * 10) / 10,
        alive: b.alive,
        score: b.score,
        finishedAt: b.crashedAt
      };
    }),
    winner: game.winner,
    standings: game.standings
  };
  io.to(game.roomCode).emit('flappy:state', snapshot);
}

/**
 * M12-01/M12-02: start a race — build the course, reset every bird.
 */
export function startFlappyGame(io, roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  const room = getRoom(code);
  if (!room) return null;

  const players = room.players.map((p) => p.nickname);
  if (players.length === 0) return null;

  // Tear the previous race down silently. Passing `io` here broadcasts
  // `flappy:closed`, which the client reads as "the room is gone" — a rematch
  // would bounce every racer back to the hub instead of restarting the course.
  stopFlappyGame(code);

  const gapH = pipeGap(0);
  const birds = {};
  for (const nick of players) {
    birds[nick] = {
      nickname: nick,
      y: WORLD_H * 0.45,
      vy: 0,
      alive: true,
      score: 0,
      crashedAt: null
    };
  }

  const first = makePipe(gapH, WORLD_W + START_PAD);
  const second = makePipe(gapH - GAP_SHRINK, WORLD_W + START_PAD + PIPE_SPACING);

  const game = {
    roomCode: code,
    players,
    birds,
    pipes: [first, second],
    worldX: 0,
    pipeCount: 0,
    scrollSpeed: BASE_SCROLL,
    status: 'countdown',
    countdownUntil: Date.now() + COUNTDOWN_MS,
    startedAt: null,
    finishedAt: null,
    winner: null,
    standings: [],
    tickTimer: null,
    rematchVotes: new Set()
  };

  activeFlappyGames.set(code, game);

  game.tickTimer = setInterval(() => tick(io, game), 1000 / TICK_HZ);

  console.log(
    `[Flappy] Race started in room ${code} with ${players.length} bird${players.length > 1 ? 's' : ''}`
  );

  broadcastFlappyState(io, game);
  return game;
}

export function stopFlappyGame(roomCode, io = null) {
  const code = roomCode?.toUpperCase()?.trim();
  const game = activeFlappyGames.get(code);
  if (!game) return;
  if (game.tickTimer) clearInterval(game.tickTimer);
  game.tickTimer = null;
  activeFlappyGames.delete(code);
  if (io) io.to(code).emit('flappy:closed', { roomCode: code });
}

/**
 * The whole simulation, one 30 Hz step (M12-02 … M12-08).
 */
function tick(io, game) {
  const now = Date.now();

  if (game.status === 'countdown') {
    if (now >= game.countdownUntil) {
      game.status = 'racing';
      game.startedAt = now;
      game.countdownUntil = null;
      // little launch pop so the race visibly begins
      for (const nick of game.players) {
        if (game.birds[nick].alive) game.birds[nick].vy = FLAP_VY * 0.55;
      }
    }
    broadcastFlappyState(io, game);
    return;
  }

  if (game.status !== 'racing') return;

  const speed = game.scrollSpeed;
  game.worldX += speed * DT;

  /* --- pipes: scroll left, spawn ahead, score passers --- */
  for (const pipe of game.pipes) pipe.x -= speed * DT;

  const lastPipe = game.pipes[game.pipes.length - 1];
  if (!lastPipe || lastPipe.x < WORLD_W - PIPE_SPACING) {
    game.pipes.push(makePipe(pipeGap(game.pipeCount), (lastPipe?.x ?? WORLD_W) + PIPE_SPACING));
  }

  game.pipes = game.pipes.filter((p) => p.x + PIPE_W > -40);

  /* --- birds: gravity, ceiling, ground, pipes --- */
  let aliveCount = 0;

  for (const nick of game.players) {
    const bird = game.birds[nick];
    if (!bird.alive) continue;

    bird.vy = Math.min(MAX_FALL_VY, bird.vy + GRAVITY * DT);
    bird.y += bird.vy * DT;

    // ceiling is safe, ground is not
    if (bird.y - BIRD_R < 0) {
      bird.y = BIRD_R;
      bird.vy = 0;
    }

    if (bird.y + BIRD_R >= WORLD_H) {
      crash(game, bird, now);
      continue;
    }

    for (const pipe of game.pipes) {
      // scoring: pipe column fully behind the bird
      if (!pipe.passed[nick] && pipe.x + PIPE_W < BIRD_X - BIRD_R) {
        pipe.passed[nick] = true;
        bird.score += 1;
        game.pipeCount += 1;
        game.scrollSpeed = scrollSpeed(game.pipeCount);
      }

      const overlapsX =
        BIRD_X + BIRD_R > pipe.x && BIRD_X - BIRD_R < pipe.x + PIPE_W;
      if (!overlapsX) continue;

      const inGap =
        bird.y - BIRD_R > pipe.gapY && bird.y + BIRD_R < pipe.gapY + pipe.gapH;
      if (!inGap) {
        crash(game, bird, now);
        break;
      }
    }

    if (bird.alive) aliveCount += 1;
  }

  /* --- end conditions (M12-07/M12-08) --- */
  const timedOut = game.startedAt && now - game.startedAt > MAX_RACE_MS;
  if (aliveCount === 0 || timedOut) {
    finishRace(io, game, timedOut);
    return;
  }

  broadcastFlappyState(io, game);
}

function crash(game, bird, now) {
  bird.alive = false;
  bird.vy = 0;
  bird.crashedAt = now;
  const room = getRoom(game.roomCode);
  console.log(`[Flappy] ${bird.nickname} crashed with ${bird.score} pipes in ${room?.code || game.roomCode}`);
}

/**
 * M12-08: winner = last bird standing, else highest score, else longest survival.
 */
async function finishRace(io, game, timedOut = false) {
  if (game.status === 'finished') return;
  game.status = 'finished';
  game.finishedAt = Date.now();
  if (game.tickTimer) clearInterval(game.tickTimer);
  game.tickTimer = null;

  const alive = game.players.filter((n) => game.birds[n].alive);

  const standings = game.players
    .map((nick) => {
      const b = game.birds[nick];
      return {
        nickname: nick,
        score: b.score,
        survivalMs: b.crashedAt && game.startedAt ? b.crashedAt - game.startedAt : game.finishedAt - (game.startedAt || game.finishedAt),
        alive: b.alive,
        isWinner: false
      };
    })
    .sort((a, b) => {
      // last bird standing first
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return b.survivalMs - a.survivalMs;
    });

  if (standings.length > 0) {
    standings[0].isWinner = true;
    // a dead bird only wins a tie-break race if nobody is still flying
    if (alive.length > 1) {
      standings.forEach((s) => (s.isWinner = s.alive));
    }
    game.winner = standings[0].nickname;
  }
  game.standings = standings;

  console.log(
    `[Flappy] Race finished in room ${game.roomCode}${timedOut ? ' (time cap)' : ''} — winner: ${game.winner}`
  );

  /* M12-10: persist every racer's score */
  try {
    for (const s of standings) {
      await recordScore(s.nickname, 'flappy', s.score, s.isWinner);
    }
  } catch (err) {
    console.warn(`[Flappy] Could not record scores: ${err.message}`);
  }

  broadcastFlappyState(io, game);
  io.to(game.roomCode).emit('flappy:end', {
    roomCode: game.roomCode,
    winner: game.winner,
    standings
  });
}

/**
 * M12-01: flap input — the only thing clients are allowed to change.
 */
export function flap(roomCode, nickname) {
  const game = getFlappyGame(roomCode);
  if (!game) return { success: false, error: 'No Flappy race found in this room.' };
  if (game.status !== 'racing') return { success: false, error: 'The race is not running yet.' };

  const bird = game.birds[nickname];
  if (!bird) return { success: false, error: 'You are not racing.' };
  if (!bird.alive) return { success: false, error: 'You already crashed — spectating.' };

  bird.vy = FLAP_VY;
  return { success: true };
}

/**
 * Rematch: everyone currently in the room reboots onto a fresh course.
 */
export function rematchFlappy(io, roomCode, nickname) {
  const game = getFlappyGame(roomCode);
  if (!game) {
    // race was already cleaned up — just start a new one
    const started = startFlappyGame(io, roomCode);
    return started
      ? { success: true }
      : { success: false, error: 'Could not start a new race.' };
  }
  if (game.status !== 'finished') return { success: false, error: 'The race is still running.' };

  game.rematchVotes.add(nickname);
  const needed = Math.max(1, game.players.length);
  if (game.rematchVotes.size >= needed) {
    startFlappyGame(io, roomCode);
    return { success: true, restarted: true };
  }
  return {
    success: true,
    waiting: true,
    votes: game.rematchVotes.size,
    needed
  };
}

export function handleFlappyPlayerLeave(io, roomCode, nickname) {
  const game = getFlappyGame(roomCode);
  if (!game) return;
  if (game.status === 'finished') return;

  const bird = game.birds[nickname];
  if (bird && bird.alive) {
    bird.alive = false;
    bird.crashedAt = Date.now();
  }

  const others = game.players.filter((n) => n !== nickname);
  game.players = others;
  delete game.birds[nickname];

  if (others.length === 0) {
    stopFlappyGame(roomCode);
    return;
  }

  if (game.status === 'racing' && !others.some((n) => game.birds[n]?.alive)) {
    finishRace(io, game);
    return;
  }

  broadcastFlappyState(io, game);
}

/**
 * Register Socket.IO handlers for Flappy Race.
 */
export function registerFlappyHandlers(io, socket) {
  const resolvePlayer = (roomCode) => {
    const room = getRoom(roomCode);
    return room?.players.find((p) => p.socketId === socket.id) || null;
  };

  // Fetch (or lazily start) the current race
  socket.on('flappy:get', ({ roomCode }, callback) => {
    let game = getFlappyGame(roomCode);
    if (!game) {
      const room = getRoom(roomCode);
      if (room && room.gameType === 'flappy') {
        game = startFlappyGame(io, roomCode);
      }
    }
    if (!game) {
      if (typeof callback === 'function') callback({ success: false, error: 'No race found' });
      return;
    }
    if (typeof callback === 'function') callback({ success: true });
    broadcastFlappyState(io, game);
  });

  // Flap!
  socket.on('flappy:flap', ({ roomCode }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = flap(roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });

  // Race again
  socket.on('flappy:rematch', ({ roomCode }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = rematchFlappy(io, roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });
}
