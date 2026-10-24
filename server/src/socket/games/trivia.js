import { getRoom } from '../rooms.js';
import { recordScore } from '../../routes/scores.js';
import { fetchTriviaQuestions } from '../../services/triviaService.js';

// Active trivia games state map: roomCode -> GameState
const activeTriviaGames = new Map();

export function getTriviaGame(roomCode) {
  return activeTriviaGames.get(roomCode?.toUpperCase()?.trim());
}

/**
 * Start a new Trivia game for a given room
 */
export async function startTriviaGame(io, roomCode) {
  const code = roomCode.toUpperCase().trim();
  const room = getRoom(code);
  if (!room) return null;

  // Clear any existing game
  stopTriviaGame(code);

  // Initialize player scores
  const scores = {};
  room.players.forEach((p) => {
    scores[p.nickname] = 0;
  });

  const gameState = {
    roomCode: code,
    currentQuestionIndex: 0,
    totalQuestions: 10,
    questionDuration: 15, // 15 seconds per question
    status: 'loading', // loading | question_active | question_result | game_over
    scores,
    questions: [],
    currentQuestion: null,
    questionStartTime: null,
    currentAnswers: {}, // nickname -> { answerIndex, isCorrect, points, speedBonus, secondsTaken }
    timerId: null,
    intermissionTimerId: null
  };

  activeTriviaGames.set(code, gameState);
  console.log(`[Trivia] Game initialized for room ${code} with ${Object.keys(scores).length} players. Fetching questions...`);

  // Notify clients that questions are being prepared
  io.to(code).emit('trivia:starting', {
    totalQuestions: 10,
    timeLimit: 15,
    players: room.players
  });

  try {
    const questions = await fetchTriviaQuestions(10);
    gameState.questions = questions;
    gameState.totalQuestions = questions.length;
    console.log(`[Trivia] Loaded ${questions.length} questions for room ${code}`);

    // Start Question 1 after a brief 1.5s countdown
    setTimeout(() => {
      startQuestion(io, code);
    }, 1500);
  } catch (err) {
    console.error(`[Trivia] Failed to prepare questions for room ${code}:`, err);
    io.to(code).emit('trivia:error', { message: 'Failed to load questions. Please try again.' });
    stopTriviaGame(code);
  }

  return gameState;
}

/**
 * Stop and clean up a trivia game
 */
export function stopTriviaGame(roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  const game = activeTriviaGames.get(code);
  if (game) {
    if (game.timerId) clearTimeout(game.timerId);
    if (game.intermissionTimerId) clearTimeout(game.intermissionTimerId);
    activeTriviaGames.delete(code);
    console.log(`[Trivia] Cleaned up trivia game for room ${code}`);
  }
}

/**
 * Start a specific question
 */
function startQuestion(io, roomCode) {
  const game = activeTriviaGames.get(roomCode);
  if (!game) return;

  const room = getRoom(roomCode);
  if (!room) {
    stopTriviaGame(roomCode);
    return;
  }

  const q = game.questions[game.currentQuestionIndex];
  if (!q) {
    endTriviaGame(io, roomCode);
    return;
  }

  game.currentQuestion = q;
  game.currentAnswers = {};
  game.questionStartTime = Date.now();
  game.status = 'question_active';

  console.log(
    `[Trivia] Room ${roomCode} Q${game.currentQuestionIndex + 1}/${game.totalQuestions}: "${q.question.substring(0, 40)}..." (Category: ${q.category})`
  );

  // Broadcast question to all players in the room (without revealing correctIndex)
  io.to(roomCode).emit('trivia:question', {
    questionIndex: game.currentQuestionIndex,
    questionNumber: game.currentQuestionIndex + 1,
    totalQuestions: game.totalQuestions,
    category: q.category,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    timeLimit: game.questionDuration,
    scores: { ...game.scores }
  });

  // Start 15s countdown timer
  if (game.timerId) clearTimeout(game.timerId);
  game.timerId = setTimeout(() => {
    endQuestion(io, roomCode, 'time_expired');
  }, game.questionDuration * 1000);
}

/**
 * End current question and show results
 */
function endQuestion(io, roomCode, reason = 'time_expired') {
  const game = activeTriviaGames.get(roomCode);
  if (!game || game.status !== 'question_active') return;

  if (game.timerId) clearTimeout(game.timerId);
  game.status = 'question_result';

  const q = game.currentQuestion;
  const correctIndex = q.correctIndex;
  const correctAnswer = q.options[correctIndex];

  console.log(
    `[Trivia] Q${game.currentQuestionIndex + 1} ended (${reason}) in room ${roomCode}. Correct: [${correctIndex}] ${correctAnswer}`
  );

  // Broadcast question result + correct answer to all room members
  io.to(roomCode).emit('trivia:result', {
    questionIndex: game.currentQuestionIndex,
    questionNumber: game.currentQuestionIndex + 1,
    totalQuestions: game.totalQuestions,
    correctIndex,
    correctAnswer,
    explanation: q.explanation,
    answers: { ...game.currentAnswers },
    scores: { ...game.scores },
    nextQuestionIn: 3
  });

  // 3-second result pause before next question or game over
  game.intermissionTimerId = setTimeout(() => {
    if (game.currentQuestionIndex + 1 < game.totalQuestions) {
      game.currentQuestionIndex += 1;
      startQuestion(io, roomCode);
    } else {
      endTriviaGame(io, roomCode);
    }
  }, 3000);
}

/**
 * End the 10-question match, announce winner, and submit scores
 */
function endTriviaGame(io, roomCode) {
  const game = activeTriviaGames.get(roomCode);
  if (!game) return;

  if (game.timerId) clearTimeout(game.timerId);
  if (game.intermissionTimerId) clearTimeout(game.intermissionTimerId);
  game.status = 'game_over';

  // Build ranked scoreboard
  const rankings = Object.entries(game.scores)
    .map(([nickname, score]) => ({ nickname, score }))
    .sort((a, b) => b.score - a.score);

  const winner = rankings[0] || null;

  console.log(`[Trivia] Game over in room ${roomCode}. Winner: ${winner?.nickname} with ${winner?.score} pts`);

  // Emit end event to room
  io.to(roomCode).emit('trivia:end', {
    rankings,
    winner,
    finalScores: { ...game.scores }
  });

  // Submit all player scores to database/in-memory store. The top score is a
  // win (a tie counts for everyone who tied), so profiles and the leaderboard
  // can tell a quiz victory from a loss.
  const topScore = rankings[0]?.score || 0;
  for (const { nickname, score } of rankings) {
    if (score > 0) {
      recordScore(nickname, 'trivia', score, topScore > 0 && score === topScore).catch((err) => {
        console.error(`[Trivia] Error recording score for ${nickname}:`, err);
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
 * Handle a player's answer submission
 */
export function handleTriviaAnswer(io, socket, { roomCode, nickname, answerIndex }, callback) {
  const code = roomCode?.toUpperCase()?.trim();
  const game = activeTriviaGames.get(code);

  if (!game || game.status !== 'question_active') {
    const res = { success: false, error: 'No active question for this room' };
    if (typeof callback === 'function') callback(res);
    return;
  }

  if (typeof answerIndex !== 'number' || answerIndex < 0 || answerIndex > 3) {
    const res = { success: false, error: 'Invalid answer option index' };
    if (typeof callback === 'function') callback(res);
    return;
  }

  // Check if player has already locked in an answer
  if (game.currentAnswers[nickname]) {
    const res = { success: false, error: 'You have already answered this question!' };
    if (typeof callback === 'function') callback(res);
    return;
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - game.questionStartTime) / 1000));
  const remainingSeconds = Math.max(0, game.questionDuration - elapsedSeconds);
  const isCorrect = answerIndex === game.currentQuestion.correctIndex;

  let points = 0;
  let speedBonus = 0;

  if (isCorrect) {
    const basePoints = 100;
    speedBonus = remainingSeconds * 10; // Up to 150 speed bonus points
    points = basePoints + speedBonus;
    game.scores[nickname] = (game.scores[nickname] || 0) + points;
  }

  game.currentAnswers[nickname] = {
    answerIndex,
    isCorrect,
    points,
    speedBonus,
    secondsTaken: elapsedSeconds
  };

  console.log(
    `[Trivia] ${nickname} answered option [${answerIndex}] (${isCorrect ? 'CORRECT' : 'WRONG'}) in ${elapsedSeconds}s. +${points} pts (total: ${game.scores[nickname] || 0})`
  );

  const res = {
    success: true,
    answerRecorded: true,
    isCorrect,
    points,
    speedBonus,
    totalScore: game.scores[nickname] || 0
  };
  if (typeof callback === 'function') callback(res);

  // Notify other players that this player has answered (without revealing the choice)
  const room = getRoom(code);
  const totalPlayersInRoom = room ? room.players.length : 1;
  const totalAnsweredCount = Object.keys(game.currentAnswers).length;

  io.to(code).emit('trivia:player_answered', {
    nickname,
    hasAnswered: true,
    totalAnswered: totalAnsweredCount,
    totalPlayers: totalPlayersInRoom
  });

  // Early round completion: If all players in the room have answered, advance early!
  if (totalAnsweredCount >= totalPlayersInRoom) {
    console.log(`[Trivia] All players answered Q${game.currentQuestionIndex + 1} early in room ${code}. Advancing.`);
    if (game.timerId) clearTimeout(game.timerId);
    endQuestion(io, code, 'all_answered');
  }
}

/**
 * Register Socket.IO handlers for Trivia Battle
 */
export function registerTriviaHandlers(io, socket) {
  // Submit an answer
  socket.on('trivia:answer', (data, callback) => {
    handleTriviaAnswer(io, socket, data, callback);
  });

  // Request current state (for reconnections)
  socket.on('trivia:get_state', ({ roomCode }, callback) => {
    const game = getTriviaGame(roomCode);
    if (!game) {
      if (typeof callback === 'function') callback({ success: false, error: 'Game not found' });
      return;
    }

    const elapsedSeconds = game.questionStartTime
      ? Math.floor((Date.now() - game.questionStartTime) / 1000)
      : 0;
    const timeLeft = Math.max(0, game.questionDuration - elapsedSeconds);

    const safeQuestion = game.currentQuestion
      ? {
          questionIndex: game.currentQuestionIndex,
          questionNumber: game.currentQuestionIndex + 1,
          totalQuestions: game.totalQuestions,
          category: game.currentQuestion.category,
          difficulty: game.currentQuestion.difficulty,
          question: game.currentQuestion.question,
          options: game.currentQuestion.options
        }
      : null;

    if (typeof callback === 'function') {
      callback({
        success: true,
        status: game.status,
        question: safeQuestion,
        timeLeft,
        scores: game.scores,
        answersCount: Object.keys(game.currentAnswers).length
      });
    }
  });

  // Host restarts game ("Play Again")
  socket.on('trivia:restart', ({ roomCode }, callback) => {
    const code = roomCode?.toUpperCase()?.trim();
    const room = getRoom(code);

    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
      return;
    }

    if (room.hostSocketId !== socket.id) {
      if (typeof callback === 'function') callback({ success: false, error: 'Only the host can restart' });
      return;
    }

    room.status = 'in_game';
    io.to(code).emit('room:state', room);
    io.to(code).emit('game:start', { roomCode: code, gameType: 'trivia', players: room.players });

    startTriviaGame(io, code);

    if (typeof callback === 'function') callback({ success: true });
  });
}
