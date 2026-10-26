import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRoom } from '../rooms.js';
import { recordScore } from '../../routes/scores.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORDS_PATH = path.join(__dirname, '../../data/drawingWords.json');

let words = [];
try {
  words = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
  console.log(`[Drawing] Loaded ${words.length} drawing words.`);
} catch (error) {
  console.warn(`[Drawing] Could not load word bank: ${error.message}`);
  words = [{ word: 'Rocket', category: 'Things' }];
}

const activeDrawingGames = new Map();
const TOTAL_ROUNDS = 5;
const ROUND_MS = Number(process.env.DRAWING_ROUND_MS) > 0 ? Number(process.env.DRAWING_ROUND_MS) : 80000;
const REVEAL_MS = 5000;
const MAX_STROKES = 3500;

export function getDrawingGame(roomCode) {
  return activeDrawingGames.get(roomCode?.toUpperCase()?.trim());
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function matchesAnswer(guess, answer) {
  const cleanGuess = normalize(guess);
  const cleanAnswer = normalize(answer);
  if (!cleanGuess) return false;
  if (cleanGuess === cleanAnswer) return true;
  if (cleanGuess.replace(/^(the|a|an)/, '') === cleanAnswer.replace(/^(the|a|an)/, '')) return true;
  return cleanGuess.length > 3 && (cleanGuess === `${cleanAnswer}s` || `${cleanGuess}s` === cleanAnswer);
}

function publicScores(game) {
  return game.players
    .map((nickname) => ({ nickname, score: game.scores[nickname] || 0 }))
    .sort((a, b) => b.score - a.score);
}

function isRevealPhase(game) {
  return game.phase === 'reveal' || game.phase === 'finished';
}

function buildState(game) {
  return {
    roomCode: game.roomCode,
    phase: game.phase,
    round: game.round + 1,
    totalRounds: game.totalRounds,
    drawer: game.drawer,
    players: [...game.players],
    scores: publicScores(game),
    strokes: [...game.strokes],
    guesses: [...game.guesses],
    wordLength: game.answer?.word?.replace(/\s/g, '').length || 0,
    category: game.answer?.category || null,
    answer: isRevealPhase(game) ? game.answer?.word || null : null,
    remainingMs: Math.max(0, game.phaseEndsAt - Date.now()),
    roundWinner: game.roundWinner,
    roundPoints: game.roundPoints || null,
    winner: game.winner,
    standings: game.standings || [],
    rematchVotes: Array.from(game.rematchVotes),
    lastAction: game.lastAction || ''
  };
}

function broadcast(io, game) {
  io.to(game.roomCode).emit('drawing:state', buildState(game));
}

function stopTimer(game) {
  if (game.timer) clearInterval(game.timer);
  game.timer = null;
}

function startTimer(io, game) {
  stopTimer(game);
  game.timer = setInterval(() => {
    const live = activeDrawingGames.get(game.roomCode);
    if (!live || live !== game) return stopTimer(game);

    io.to(game.roomCode).emit('drawing:tick', {
      roomCode: game.roomCode,
      phase: game.phase,
      remainingMs: Math.max(0, game.phaseEndsAt - Date.now())
    });

    if (Date.now() < game.phaseEndsAt) return;
    if (game.phase === 'drawing') finishRound(io, game, null);
    else if (game.phase === 'reveal') nextRound(io, game);
  }, 500);
  if (typeof game.timer.unref === 'function') game.timer.unref();
}

function pickWord(game) {
  const available = words.filter((entry) => !game.usedWords.has(entry.word));
  const pool = available.length > 0 ? available : words;
  const answer = pool[Math.floor(Math.random() * pool.length)];
  game.usedWords.add(answer.word);
  return answer;
}

function sendWord(io, game) {
  const room = getRoom(game.roomCode);
  const drawer = room?.players.find((player) => player.nickname === game.drawer);
  if (!drawer) return;
  io.to(drawer.socketId).emit('drawing:word', {
    roomCode: game.roomCode,
    round: game.round + 1,
    word: game.answer.word,
    category: game.answer.category
  });
}

function beginRound(io, game) {
  game.phase = 'drawing';
  game.roundWinner = null;
  game.roundPoints = null;
  game.guesses = [];
  game.strokes = [];
  game.answer = pickWord(game);
  game.drawer = game.players[game.round % game.players.length];
  game.phaseEndsAt = Date.now() + ROUND_MS;
  game.lastAction = `${game.drawer} is drawing`;

  console.log(`[Drawing] Room ${game.roomCode} round ${game.round + 1}/${game.totalRounds} — drawer ${game.drawer}`);
  sendWord(io, game);
  broadcast(io, game);
  startTimer(io, game);
}

export function startDrawingGame(io, roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  const room = getRoom(code);
  if (!room || room.players.length < 2) return null;

  stopDrawingGame(code);
  const players = room.players.map((player) => player.nickname);
  const game = {
    roomCode: code,
    players,
    scores: Object.fromEntries(players.map((nickname) => [nickname, 0])),
    totalRounds: TOTAL_ROUNDS,
    round: 0,
    phase: 'drawing',
    phaseEndsAt: 0,
    drawer: null,
    answer: null,
    strokes: [],
    guesses: [],
    roundWinner: null,
    roundPoints: null,
    winner: null,
    standings: [],
    rematchVotes: new Set(),
    usedWords: new Set(),
    lastAction: '',
    timer: null
  };

  activeDrawingGames.set(code, game);
  beginRound(io, game);
  return game;
}

export function stopDrawingGame(roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  const game = activeDrawingGames.get(code);
  if (!game) return;
  stopTimer(game);
  activeDrawingGames.delete(code);
  console.log(`[Drawing] Cleaned up game for room ${code}`);
}

function finishRound(io, game, winnerNickname) {
  if (!game || game.phase !== 'drawing') return;
  stopTimer(game);
  game.phase = 'reveal';
  game.roundWinner = winnerNickname;
  game.phaseEndsAt = Date.now() + REVEAL_MS;
  game.lastAction = winnerNickname
    ? `${winnerNickname} solved it`
    : `Time up — the answer was ${game.answer.word}`;
  broadcast(io, game);
  startTimer(io, game);
}

function nextRound(io, game) {
  stopTimer(game);
  if (game.round + 1 >= game.totalRounds) {
    finishGame(io, game);
    return;
  }
  game.round += 1;
  beginRound(io, game);
}

function finishGame(io, game) {
  stopTimer(game);
  game.phase = 'finished';
  game.phaseEndsAt = 0;
  game.standings = publicScores(game).map((entry, index) => ({ ...entry, rank: index + 1 }));
  game.winner = game.standings[0]?.score > 0 ? game.standings[0].nickname : null;
  game.lastAction = game.winner ? `${game.winner} wins the drawing match` : 'Match complete';

  const topScore = game.standings[0]?.score || 0;
  for (const standing of game.standings) {
    recordScore(
      standing.nickname,
      'drawing',
      standing.score,
      topScore > 0 && standing.score === topScore
    ).catch((error) => console.warn(`[Drawing] Could not persist score: ${error.message}`));
  }

  const room = getRoom(game.roomCode);
  if (room) room.status = 'finished';
  broadcast(io, game);
}

function validPoint(point) {
  return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)) &&
    Number(point.x) >= 0 && Number(point.x) <= 1 && Number(point.y) >= 0 && Number(point.y) <= 1;
}

export function submitStroke(io, roomCode, nickname, rawStroke) {
  const game = getDrawingGame(roomCode);
  if (!game || game.phase !== 'drawing') return { success: false, error: 'Drawing is not active right now.' };
  if (game.drawer !== nickname) return { success: false, error: 'Only the drawer can draw this round.' };
  if (game.strokes.length >= MAX_STROKES) return { success: false, error: 'The canvas is full — clear it to keep drawing.' };

  const stroke = {
    from: { x: Number(rawStroke?.from?.x), y: Number(rawStroke?.from?.y) },
    to: { x: Number(rawStroke?.to?.x), y: Number(rawStroke?.to?.y) },
    color: typeof rawStroke?.color === 'string' ? rawStroke.color.slice(0, 20) : '#ffffff',
    size: Math.min(40, Math.max(1, Number(rawStroke?.size) || 5)),
    tool: rawStroke?.tool === 'eraser' ? 'eraser' : 'brush'
  };

  if (!validPoint(stroke.from) || !validPoint(stroke.to)) {
    return { success: false, error: 'Invalid stroke coordinates.' };
  }

  game.strokes.push(stroke);
  io.to(game.roomCode).emit('drawing:stroke', stroke);
  return { success: true };
}

export function clearCanvas(io, roomCode, nickname) {
  const game = getDrawingGame(roomCode);
  if (!game || game.phase !== 'drawing') return { success: false, error: 'Drawing is not active right now.' };
  if (game.drawer !== nickname) return { success: false, error: 'Only the drawer can clear the canvas.' };
  game.strokes = [];
  game.lastAction = `${nickname} cleared the canvas`;
  io.to(game.roomCode).emit('drawing:clear');
  broadcast(io, game);
  return { success: true };
}

export async function submitGuess(io, roomCode, nickname, rawGuess) {
  const game = getDrawingGame(roomCode);
  if (!game || game.phase !== 'drawing') return { success: false, error: 'Guessing is not open right now.' };
  if (nickname === game.drawer) return { success: false, error: 'The drawer cannot guess their own word.' };
  if (!game.players.includes(nickname)) return { success: false, error: 'You are not in this game.' };

  const text = String(rawGuess || '').trim().slice(0, 60);
  if (!text) return { success: false, error: 'Type a guess first.' };

  const correct = matchesAnswer(text, game.answer.word);
  const guess = { nickname, text, correct };
  game.guesses.push(guess);
  io.to(game.roomCode).emit('drawing:guess', guess);

  if (!correct) return { success: true, correct: false };

  const elapsed = Date.now() - (game.phaseEndsAt - ROUND_MS);
  const speed = Math.max(0, 1 - elapsed / ROUND_MS);
  const points = Math.max(20, Math.round(60 + 40 * speed));
  game.scores[nickname] = (game.scores[nickname] || 0) + points;
  game.scores[game.drawer] = (game.scores[game.drawer] || 0) + 40;
  game.roundPoints = { nickname, points, drawer: game.drawer, drawerPoints: 40 };
  finishRound(io, game, nickname);
  return { success: true, correct: true, points };
}

export function rematchDrawing(io, roomCode, nickname) {
  const game = getDrawingGame(roomCode);
  const room = getRoom(roomCode);
  if (!game || !room) return { success: false, error: 'Drawing game not found.' };
  if (game.phase !== 'finished') return { success: false, error: 'Finish the current match first.' };
  if (!game.players.includes(nickname)) return { success: false, error: 'You are not in this match.' };

  game.rematchVotes.add(nickname);
  const needed = Math.max(2, room.players.length);
  if (game.rematchVotes.size >= needed) {
    room.status = 'in_game';
    startDrawingGame(io, roomCode);
    io.to(roomCode).emit('room:state', room);
    return { success: true, restarted: true };
  }

  broadcast(io, game);
  return { success: true, waiting: true, votes: game.rematchVotes.size, needed };
}

export function handleDrawingPlayerLeave(io, roomCode, nickname) {
  const game = getDrawingGame(roomCode);
  if (!game) return;
  const wasDrawer = game.drawer === nickname;
  game.players = game.players.filter((player) => player !== nickname);
  delete game.scores[nickname];
  game.rematchVotes.delete(nickname);

  if (game.players.length < 2) {
    stopDrawingGame(roomCode);
    return;
  }

  if (wasDrawer && game.phase === 'drawing') finishRound(io, game, null);
  else broadcast(io, game);
}

export function registerDrawingHandlers(io, socket) {
  const resolvePlayer = (roomCode) => {
    const room = getRoom(roomCode);
    return room?.players.find((player) => player.socketId === socket.id) || null;
  };

  socket.on('drawing:get', ({ roomCode }, callback) => {
    let game = getDrawingGame(roomCode);
    const room = getRoom(roomCode);
    if (!game && room?.gameType === 'drawing' && room.status === 'in_game') game = startDrawingGame(io, roomCode);
    if (!game) {
      if (typeof callback === 'function') callback({ success: false, error: 'No drawing game found.' });
      return;
    }
    if (typeof callback === 'function') callback({ success: true });
    broadcast(io, game);
    sendWord(io, game);
  });

  socket.on('drawing:stroke', ({ roomCode, stroke }, callback) => {
    const player = resolvePlayer(roomCode);
    const result = player ? submitStroke(io, roomCode, player.nickname, stroke) : { success: false, error: 'You are not in this room.' };
    if (typeof callback === 'function') callback(result);
  });

  socket.on('drawing:clear', ({ roomCode }, callback) => {
    const player = resolvePlayer(roomCode);
    const result = player ? clearCanvas(io, roomCode, player.nickname) : { success: false, error: 'You are not in this room.' };
    if (typeof callback === 'function') callback(result);
  });

  socket.on('drawing:guess', async ({ roomCode, guess }, callback) => {
    const player = resolvePlayer(roomCode);
    const result = player ? await submitGuess(io, roomCode, player.nickname, guess) : { success: false, error: 'You are not in this room.' };
    if (typeof callback === 'function') callback(result);
  });

  socket.on('drawing:rematch', ({ roomCode }, callback) => {
    const player = resolvePlayer(roomCode);
    const result = player ? rematchDrawing(io, roomCode, player.nickname) : { success: false, error: 'You are not in this room.' };
    if (typeof callback === 'function') callback(result);
  });
}
