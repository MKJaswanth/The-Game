import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRoom } from '../rooms.js';
import { recordScore } from '../../routes/scores.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load words bank
let wordsList = [];
try {
  const wordsFilePath = path.join(__dirname, '../../data/words.json');
  const rawData = fs.readFileSync(wordsFilePath, 'utf8');
  wordsList = JSON.parse(rawData);
  console.log(`[WordScramble] Loaded ${wordsList.length} words into bank`);
} catch (err) {
  console.error('[WordScramble] Error loading words bank:', err);
  // Minimal fallback
  wordsList = [
    { word: 'CODE', difficulty: 'easy', category: 'Tech' },
    { word: 'REACT', difficulty: 'medium', category: 'Tech' },
    { word: 'JAVASCRIPT', difficulty: 'hard', category: 'Tech' }
  ];
}

// Active games state map: roomCode -> GameState
const activeGames = new Map();

/**
 * Shuffle letters in a string, ensuring it is not identical to original
 */
function scrambleWord(word) {
  const upper = word.toUpperCase();
  if (upper.length <= 1) return upper;

  let scrambled = upper;
  let attempts = 0;
  while (scrambled === upper && attempts < 10) {
    const letters = upper.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    scrambled = letters.join('');
    attempts++;
  }

  // If still same (e.g. palindromes or low uniqueness), swap adjacent letters
  if (scrambled === upper) {
    const arr = upper.split('');
    const temp = arr[0];
    arr[0] = arr[arr.length - 1];
    arr[arr.length - 1] = temp;
    scrambled = arr.join('');
  }

  return scrambled;
}

/**
 * Pick a word for the current round based on difficulty progression
 * Rounds 1-3: Easy
 * Rounds 4-7: Medium
 * Rounds 8-10: Hard
 */
function pickWordForRound(round, usedWords = new Set()) {
  let targetDifficulty = 'easy';
  if (round >= 4 && round <= 7) {
    targetDifficulty = 'medium';
  } else if (round >= 8) {
    targetDifficulty = 'hard';
  }

  const pool = wordsList.filter(
    (w) => w.difficulty === targetDifficulty && !usedWords.has(w.word.toUpperCase())
  );

  const fallbackPool = wordsList.filter((w) => !usedWords.has(w.word.toUpperCase()));
  const candidatePool = pool.length > 0 ? pool : fallbackPool.length > 0 ? fallbackPool : wordsList;

  const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)];
  usedWords.add(chosen.word.toUpperCase());
  return chosen;
}

export function getWordScrambleGame(roomCode) {
  return activeGames.get(roomCode?.toUpperCase()?.trim());
}

/**
 * Start a new Word Scramble game for a given room
 */
export function startWordScrambleGame(io, roomCode) {
  const code = roomCode.toUpperCase().trim();
  const room = getRoom(code);
  if (!room) return null;

  // Clear any existing game
  stopWordScrambleGame(code);

  // Initialize player scores
  const scores = {};
  room.players.forEach((p) => {
    scores[p.nickname] = 0;
  });

  const gameState = {
    roomCode: code,
    currentRound: 1,
    totalRounds: 10,
    roundDuration: 30, // seconds
    status: 'starting', // starting | round_active | round_result | game_over
    scores,
    usedWords: new Set(),
    currentWordObj: null,
    scrambledLetters: '',
    roundStartTime: null,
    roundGuesses: {}, // nickname -> { points, secondsTaken, timestamp }
    timerId: null,
    intermissionTimerId: null
  };

  activeGames.set(code, gameState);
  console.log(`[WordScramble] Game created for room ${code} with ${Object.keys(scores).length} players`);

  // Start round 1 after a brief 1.5s countdown
  setTimeout(() => {
    startRound(io, code);
  }, 1500);

  return gameState;
}

/**
 * Stop and clean up a game
 */
export function stopWordScrambleGame(roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  const game = activeGames.get(code);
  if (game) {
    if (game.timerId) clearTimeout(game.timerId);
    if (game.intermissionTimerId) clearTimeout(game.intermissionTimerId);
    activeGames.delete(code);
    console.log(`[WordScramble] Cleaned up game for room ${code}`);
  }
}

/**
 * Start a specific round
 */
function startRound(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const room = getRoom(roomCode);
  if (!room) {
    stopWordScrambleGame(roomCode);
    return;
  }

  const wordObj = pickWordForRound(game.currentRound, game.usedWords);
  const scrambled = scrambleWord(wordObj.word);

  game.currentWordObj = wordObj;
  game.scrambledLetters = scrambled;
  game.roundStartTime = Date.now();
  game.roundGuesses = {};
  game.status = 'round_active';

  console.log(
    `[WordScramble] Room ${roomCode} Round ${game.currentRound}/${game.totalRounds}: Word=${wordObj.word} (${scrambled})`
  );

  // Emit round event to all players in the room
  io.to(roomCode).emit('scramble:round', {
    round: game.currentRound,
    totalRounds: game.totalRounds,
    scrambled: game.scrambledLetters,
    length: wordObj.word.length,
    category: wordObj.category,
    difficulty: wordObj.difficulty,
    timeLimit: game.roundDuration,
    scores: { ...game.scores }
  });

  // Start countdown timer
  if (game.timerId) clearTimeout(game.timerId);
  game.timerId = setTimeout(() => {
    endRound(io, roomCode, 'time_expired');
  }, game.roundDuration * 1000);
}

/**
 * End the current round
 */
function endRound(io, roomCode, reason = 'time_expired') {
  const game = activeGames.get(roomCode);
  if (!game || game.status !== 'round_active') return;

  if (game.timerId) clearTimeout(game.timerId);
  game.status = 'round_result';

  const correctWord = game.currentWordObj?.word || '';
  const roundResults = { ...game.roundGuesses };

  console.log(
    `[WordScramble] Round ${game.currentRound} ended (${reason}) in room ${roomCode}. Word: ${correctWord}`
  );

  // Emit result event
  io.to(roomCode).emit('scramble:result', {
    round: game.currentRound,
    totalRounds: game.totalRounds,
    correctWord,
    category: game.currentWordObj?.category,
    scores: { ...game.scores },
    roundGuesses: roundResults,
    nextRoundIn: 4
  });

  // Check if we should advance to next round or end the game
  game.intermissionTimerId = setTimeout(() => {
    if (game.currentRound < game.totalRounds) {
      game.currentRound += 1;
      startRound(io, roomCode);
    } else {
      endGame(io, roomCode);
    }
  }, 4000);
}

/**
 * End the 10-round game and determine final rankings
 */
function endGame(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  if (game.timerId) clearTimeout(game.timerId);
  if (game.intermissionTimerId) clearTimeout(game.intermissionTimerId);
  game.status = 'game_over';

  // Build ranked scoreboard
  const rankings = Object.entries(game.scores)
    .map(([nickname, score]) => ({ nickname, score }))
    .sort((a, b) => b.score - a.score);

  const winner = rankings[0] || null;

  console.log(`[WordScramble] Game over in room ${roomCode}. Winner: ${winner?.nickname} (${winner?.score} pts)`);

  // Emit end event
  io.to(roomCode).emit('scramble:end', {
    rankings,
    winner,
    finalScores: { ...game.scores }
  });

  // Submit all scores to database/in-memory store
  for (const { nickname, score } of rankings) {
    if (score > 0) {
      recordScore(nickname, 'wordscramble', score).catch((err) => {
        console.error(`[WordScramble] Error recording score for ${nickname}:`, err);
      });
    }
  }

  // Update room status
  const room = getRoom(roomCode);
  if (room) {
    room.status = 'finished';
    io.to(roomCode).emit('room:state', room);
  }
}

/**
 * Handle a player's guess
 */
export function handleScrambleGuess(io, socket, { roomCode, nickname, guess }, callback) {
  const code = roomCode?.toUpperCase()?.trim();
  const game = activeGames.get(code);

  if (!game || game.status !== 'round_active') {
    const res = { success: false, error: 'No active round for this room' };
    if (typeof callback === 'function') callback(res);
    return;
  }

  if (!guess || typeof guess !== 'string') {
    const res = { success: false, error: 'Invalid guess' };
    if (typeof callback === 'function') callback(res);
    return;
  }

  const cleanGuess = guess.trim().toUpperCase();
  const targetWord = game.currentWordObj.word.toUpperCase();

  // If player already answered correctly this round
  if (game.roundGuesses[nickname]) {
    const res = { success: false, error: 'You already guessed correctly this round!' };
    if (typeof callback === 'function') callback(res);
    return;
  }

  const isCorrect = cleanGuess === targetWord;

  if (isCorrect) {
    const elapsedSeconds = Math.floor((Date.now() - game.roundStartTime) / 1000);
    const remainingSeconds = Math.max(0, game.roundDuration - elapsedSeconds);

    // Scoring formula: Base 100 pts + 10 pts per second remaining
    const basePoints = 100;
    const speedBonus = remainingSeconds * 10;
    const totalPoints = basePoints + speedBonus;

    // Award points
    game.scores[nickname] = (game.scores[nickname] || 0) + totalPoints;

    // Track guess
    game.roundGuesses[nickname] = {
      points: totalPoints,
      speedBonus,
      secondsTaken: elapsedSeconds,
      timestamp: Date.now()
    };

    console.log(
      `[WordScramble] ${nickname} guessed correctly in ${elapsedSeconds}s! +${totalPoints} pts (total: ${game.scores[nickname]})`
    );

    const res = {
      success: true,
      correct: true,
      points: totalPoints,
      speedBonus,
      totalScore: game.scores[nickname]
    };
    if (typeof callback === 'function') callback(res);

    // Notify room of this player's success (without revealing the word)
    io.to(code).emit('scramble:player_correct', {
      nickname,
      points: totalPoints,
      secondsTaken: elapsedSeconds,
      scores: { ...game.scores }
    });

    // Check if all players in the room have solved it
    const room = getRoom(code);
    if (room) {
      const activeNicknames = room.players.map((p) => p.nickname);
      const allGuessed = activeNicknames.every((nick) => Boolean(game.roundGuesses[nick]));

      if (allGuessed) {
        console.log(`[WordScramble] All players guessed correctly in room ${code}! Ending round early.`);
        endRound(io, code, 'all_guessed');
      }
    }
  } else {
    // Incorrect guess
    const res = { success: true, correct: false, message: 'Not quite! Try again' };
    if (typeof callback === 'function') callback(res);
  }
}

/**
 * Register Word Scramble socket event handlers
 */
export function registerWordScrambleHandlers(io, socket) {
  // Client submits a guess
  socket.on('scramble:guess', (data, callback) => {
    handleScrambleGuess(io, socket, data, callback);
  });

  // Client requests current game state (e.g. on rejoin or tab refresh)
  socket.on('scramble:get_state', ({ roomCode }, callback) => {
    const code = roomCode?.toUpperCase()?.trim();
    const game = activeGames.get(code);
    if (!game) {
      if (typeof callback === 'function') callback({ success: false, error: 'No game found' });
      return;
    }

    const elapsedSeconds = game.roundStartTime ? Math.floor((Date.now() - game.roundStartTime) / 1000) : 0;
    const remainingSeconds = Math.max(0, game.roundDuration - elapsedSeconds);

    const res = {
      success: true,
      round: game.currentRound,
      totalRounds: game.totalRounds,
      scrambled: game.scrambledLetters,
      length: game.currentWordObj ? game.currentWordObj.word.length : 0,
      category: game.currentWordObj ? game.currentWordObj.category : '',
      difficulty: game.currentWordObj ? game.currentWordObj.difficulty : 'easy',
      timeLimit: remainingSeconds,
      status: game.status,
      scores: { ...game.scores },
      roundGuesses: { ...game.roundGuesses }
    };
    if (typeof callback === 'function') callback(res);
  });

  // Host restarts game ("Play Again")
  socket.on('scramble:restart', ({ roomCode }, callback) => {
    const code = roomCode?.toUpperCase()?.trim();
    const room = getRoom(code);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
      return;
    }

    room.status = 'in_game';
    io.to(code).emit('room:state', room);
    const newGame = startWordScrambleGame(io, code);

    if (typeof callback === 'function') callback({ success: true, game: newGame });
  });
}
