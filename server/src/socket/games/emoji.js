import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRoom } from '../rooms.js';
import { recordScore } from '../../routes/scores.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// M14-01: the authored answer bank (114 phrases, each with a ready-made emoji hint).
let answers = [];
try {
  answers = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/emojiAnswers.json'), 'utf8'));
  console.log(`[Emoji] Loaded ${answers.length} emoji answers.`);
} catch (err) {
  console.error('[Emoji] Could not load the answer bank:', err.message);
  answers = [{ a: 'Pizza', e: '🍕', c: 'food' }];
}

/**
 * M14 — Emoji Guessing 🤔
 * One player is handed a secret answer and composes an emoji clue; everyone
 * else races to type the answer. 5 rounds, clue-giver rotates every round.
 *
 * The answer never leaves the server except to the clue-giver's own socket and
 * to everyone once the round is revealed.
 */

const activeEmojiGames = new Map();

const TOTAL_ROUNDS = 5;
const CLUE_PHASE_MS = 30000;   // time to compose the clue
const GUESS_PHASE_MS = 60000;  // time for the guessers
const REVEAL_MS = 5000;
const MAX_CLUE_CHARS = 48;

export function getEmojiGame(roomCode) {
  return activeEmojiGames.get(roomCode?.toUpperCase()?.trim());
}

/* ---------- helpers ---------- */

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function articleLess(text) {
  return normalize(text).replace(/^(the|a|an)/, '');
}

function isCorrect(guess, answer) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g) return false;
  if (g === a) return true;
  if (articleLess(guess) === articleLess(answer)) return true;
  // tolerate simple plurals ("pyramid" vs "pyramids")
  if (g.length > 3 && (g === `${a}s` || `${g}s` === a)) return true;
  return false;
}

function publicScores(game) {
  return game.players.map((nick) => ({ nickname: nick, score: game.scores[nick] || 0 }));
}

function buildPayload(game) {
  const reveal = game.phase === 'reveal' || game.phase === 'finished';
  return {
    roomCode: game.roomCode,
    phase: game.phase,
    round: game.round + 1,
    totalRounds: game.totalRounds,
    clueGiver: game.clueGiver,
    players: game.players,
    scores: publicScores(game),
    clue: game.clue,
    cluesUsed: game.cluesUsed || [],
    answer: reveal ? game.answer?.a || null : null,
    answerCategory: reveal ? game.answer?.c || null : null,
    answerLength: game.answer ? game.answer.a.length : 0,
    remainingMs: Math.max(0, (game.phaseEndsAt || 0) - Date.now()),
    guesses: game.guesses,
    roundWinner: game.roundWinner,
    winner: game.winner,
    rematchVotes: Array.from(game.rematchVotes)
  };
}

function broadcast(io, game) {
  io.to(game.roomCode).emit('emoji:state', buildPayload(game));
}

function sendAnswerToClueGiver(io, game) {
  const room = getRoom(game.roomCode);
  const seat = room?.players.find((p) => p.nickname === game.clueGiver);
  if (!seat) return;
  io.to(seat.socketId).emit('emoji:answer', {
    roomCode: game.roomCode,
    round: game.round + 1,
    answer: game.answer.a,
    category: game.answer.c,
    hint: game.answer.e
  });
}

function stopTimer(game) {
  if (game.timer) {
    clearInterval(game.timer);
    game.timer = null;
  }
}

function startTimer(io, game) {
  stopTimer(game);
  game.timer = setInterval(() => {
    if (!activeEmojiGames.has(game.roomCode)) return stopTimer(game);

    const remaining = game.phaseEndsAt - Date.now();
    if (game.phase === 'guessing' || game.phase === 'clue') {
      io.to(game.roomCode).emit('emoji:tick', {
        roomCode: game.roomCode,
        phase: game.phase,
        remainingMs: Math.max(0, remaining)
      });
    }

    if (remaining <= 0) {
      if (game.phase === 'clue') {
        // Clue-giver ran out of time — use the authored hint so the round can go on.
        submitClue(io, game.roomCode, game.clueGiver, game.answer.e, { forced: true });
      } else if (game.phase === 'guessing') {
        finishRound(io, game, null);
      } else if (game.phase === 'reveal') {
        nextRound(io, game);
      }
    }
  }, 1000);
}

function pickAnswer(game) {
  const pool = answers.filter((entry) => !game.usedAnswers.has(entry.a));
  const source = pool.length > 0 ? pool : answers;
  const picked = source[Math.floor(Math.random() * source.length)];
  game.usedAnswers.add(picked.a);
  return picked;
}

function beginRound(io, game) {
  game.roundWinner = null;
  game.guesses = [];
  game.clue = '';
  game.cluesUsed = [];
  game.answer = pickAnswer(game);
  game.clueGiver = game.players[game.round % game.players.length];
  game.phase = 'clue';
  game.phaseEndsAt = Date.now() + CLUE_PHASE_MS;
  game.roundStartedAt = Date.now();

  console.log(
    `[Emoji] Room ${game.roomCode} round ${game.round + 1}/${game.totalRounds} — clue-giver ${game.clueGiver} (${game.answer.a})`
  );

  sendAnswerToClueGiver(io, game);
  broadcast(io, game);
  startTimer(io, game);
}

export function startEmojiGame(io, roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  const room = getRoom(code);
  if (!room) return null;

  const players = room.players.map((p) => p.nickname);
  if (players.length < 2) return null;

  stopEmojiGame(code);

  const game = {
    roomCode: code,
    players,
    scores: Object.fromEntries(players.map((n) => [n, 0])),
    totalRounds: TOTAL_ROUNDS,
    round: 0,
    clueGiver: null,
    answer: null,
    clue: '',
    cluesUsed: [],
    guesses: [],
    phase: 'clue',
    phaseEndsAt: 0,
    roundStartedAt: 0,
    roundWinner: null,
    winner: null,
    usedAnswers: new Set(),
    rematchVotes: new Set(),
    timer: null,
    startedAt: Date.now()
  };

  activeEmojiGames.set(code, game);
  console.log(`[Emoji] Game started in room ${code} with ${players.length} players`);
  beginRound(io, game);
  return game;
}

export function stopEmojiGame(roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  const game = activeEmojiGames.get(code);
  if (!game) return;
  stopTimer(game);
  activeEmojiGames.delete(code);
  console.log(`[Emoji] Cleaned up game for room ${code}`);
}

/**
 * M14-04: the clue-giver submits their emoji clue.
 */
export function submitClue(io, roomCode, nickname, rawClue, { forced = false } = {}) {
  const game = getEmojiGame(roomCode);
  if (!game) return { success: false, error: 'No emoji game in this room.' };
  if (game.phase !== 'clue') return { success: false, error: 'The clue phase is over.' };
  if (game.clueGiver !== nickname) return { success: false, error: 'Only the clue-giver can submit the clue.' };

  const clue = String(rawClue || '').trim().slice(0, MAX_CLUE_CHARS);
  if (!clue) return { success: false, error: 'Send at least one emoji.' };

  game.clue = clue;
  game.cluesUsed.push(clue);
  game.phase = 'guessing';
  game.phaseEndsAt = Date.now() + GUESS_PHASE_MS;
  game.guessStartedAt = Date.now();

  if (forced) console.log(`[Emoji] Room ${game.roomCode}: clue auto-submitted at timeout`);

  broadcast(io, game);
  startTimer(io, game);
  return { success: true };
}

/**
 * M14-06/M14-07: a guesser submits an answer. First correct guess ends the round.
 */
export async function submitGuess(io, roomCode, nickname, rawGuess) {
  const game = getEmojiGame(roomCode);
  if (!game) return { success: false, error: 'No emoji game in this room.' };
  if (game.phase !== 'guessing') return { success: false, error: 'Guessing is not open right now.' };
  if (nickname === game.clueGiver) return { success: false, error: 'You wrote the clue — let them guess!' };
  if (!game.players.includes(nickname)) return { success: false, error: 'You are not in this game.' };

  const text = String(rawGuess || '').trim().slice(0, 60);
  if (!text) return { success: false, error: 'Type a guess first.' };

  const correct = isCorrect(text, game.answer.a);
  game.guesses.push({ nickname, text, correct });

  if (!correct) {
    io.to(game.roomCode).emit('emoji:guess', { roomCode: game.roomCode, nickname, text, correct: false });
    return { success: true, correct: false };
  }

  const elapsed = Date.now() - (game.guessStartedAt || Date.now());
  const speed = Math.max(0, 1 - elapsed / GUESS_PHASE_MS);
  const points = Math.round(60 + 40 * speed);
  game.scores[nickname] = (game.scores[nickname] || 0) + points;
  game.scores[game.clueGiver] = (game.scores[game.clueGiver] || 0) + 40;
  game.roundWinner = nickname;
  game.roundPoints = { nickname, points, cluePoints: 40 };

  io.to(game.roomCode).emit('emoji:guess', {
    roomCode: game.roomCode,
    nickname,
    text,
    correct: true,
    points
  });

  finishRound(io, game, nickname);
  return { success: true, correct: true, points };
}

function finishRound(io, game, winnerNick) {
  if (game.phase === 'reveal' || game.phase === 'finished') return;
  stopTimer(game);
  game.phase = 'reveal';
  game.roundWinner = winnerNick;
  game.phaseEndsAt = Date.now() + REVEAL_MS;

  if (!winnerNick) {
    console.log(`[Emoji] Room ${game.roomCode}: nobody guessed "${game.answer.a}"`);
  }

  broadcast(io, game);
  startTimer(io, game);
}

function nextRound(io, game) {
  stopTimer(game);
  game.round += 1;

  if (game.round >= game.totalRounds) {
    finishGame(io, game);
    return;
  }
  beginRound(io, game);
}

async function finishGame(io, game) {
  stopTimer(game);
  game.phase = 'finished';
  game.phaseEndsAt = 0;

  const standings = publicScores(game).sort((a, b) => b.score - a.score);
  game.winner = standings[0]?.score > 0 ? standings[0].nickname : null;
  game.standings = standings;

  console.log(
    `[Emoji] Room ${game.roomCode} finished — winner ${game.winner || 'none'} (${game.players
      .map((n) => `${n}:${game.scores[n]}`)
      .join(', ')})`
  );

  const top = standings[0]?.score || 0;
  io.to(game.roomCode).emit('emoji:state', { ...buildPayload(game), standings });

  for (const nick of game.players) {
    try {
      await recordScore(nick, 'emoji', game.scores[nick] || 0, top > 0 && (game.scores[nick] || 0) === top);
    } catch (err) {
      console.warn(`[Emoji] Could not persist score for ${nick}: ${err.message}`);
    }
  }
}

export function rematchEmoji(io, roomCode, nickname) {
  const game = getEmojiGame(roomCode);
  if (!game) {
    const started = startEmojiGame(io, roomCode);
    return started
      ? { success: true, restarted: true }
      : { success: false, error: 'Need at least two players.' };
  }
  if (game.phase !== 'finished') return { success: false, error: 'Finish the current game first.' };

  game.rematchVotes.add(nickname);
  const room = getRoom(roomCode);
  const needed = Math.max(2, room?.players.length || 2);

  if (game.rematchVotes.size >= needed) {
    startEmojiGame(io, roomCode);
    return { success: true, restarted: true };
  }

  broadcast(io, game);
  return { success: true, waiting: true, votes: game.rematchVotes.size, needed };
}

export function handleEmojiPlayerLeave(io, roomCode, nickname) {
  const game = getEmojiGame(roomCode);
  if (!game) return;

  const wasClueGiver = game.clueGiver === nickname;
  game.players = game.players.filter((n) => n !== nickname);
  delete game.scores[nickname];
  game.guesses = game.guesses.filter((g) => g.nickname !== nickname);
  game.rematchVotes.delete(nickname);

  if (game.players.length < 2) {
    stopEmojiGame(roomCode);
    return;
  }

  if (game.phase === 'finished') {
    broadcast(io, game);
    return;
  }

  if (wasClueGiver) {
    // Hand the round to the next player so the game keeps moving.
    finishRound(io, game, null);
    return;
  }

  broadcast(io, game);
}

export function registerEmojiHandlers(io, socket) {
  const resolvePlayer = (roomCode) => {
    const room = getRoom(roomCode);
    return room?.players.find((p) => p.socketId === socket.id) || null;
  };

  socket.on('emoji:get', ({ roomCode }, callback) => {
    let game = getEmojiGame(roomCode);
    if (!game) {
      const room = getRoom(roomCode);
      if (room && room.gameType === 'emoji' && room.status === 'in_game') {
        game = startEmojiGame(io, roomCode);
      }
    }
    if (!game) {
      if (typeof callback === 'function') callback({ success: false, error: 'No emoji game found.' });
      return;
    }
    if (typeof callback === 'function') callback({ success: true });
    broadcast(io, game);
    if (game.phase === 'clue') sendAnswerToClueGiver(io, game);
  });

  socket.on('emoji:clue', ({ roomCode, clue }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = submitClue(io, roomCode, me.nickname, clue);
    if (typeof callback === 'function') callback(result);
  });

  socket.on('emoji:guess', async ({ roomCode, guess }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = await submitGuess(io, roomCode, me.nickname, guess);
    if (typeof callback === 'function') callback(result);
  });

  socket.on('emoji:rematch', ({ roomCode }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = rematchEmoji(io, roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });
}
