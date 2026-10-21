import { getRoom } from '../rooms.js';
import { recordScore } from '../../routes/scores.js';

// Active Tic Tac Toe games map: roomCode -> GameState
const activeTTTGames = new Map();

// 8 Winning combinations for 3x3 grid
export const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Col 1
  [1, 4, 7], // Col 2
  [2, 5, 8], // Col 3
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6]  // Diagonal top-right to bottom-left
];

export function getTTTGame(roomCode) {
  return activeTTTGames.get(roomCode?.toUpperCase()?.trim());
}

/**
 * Start a new Tic Tac Toe match
 */
export function startTTTGame(io, roomCode) {
  const code = roomCode.toUpperCase().trim();
  const room = getRoom(code);
  if (!room) return null;

  const player1 = room.players[0]?.nickname || 'Player 1';
  // If only 1 player (solo / testing), use AI Bot
  const player2 = room.players[1]?.nickname || 'CyberBot';
  const isVsBot = room.players.length === 1;

  const gameState = {
    roomCode: code,
    board: Array(9).fill(null), // 0-8: null | 'X' | 'O'
    playerX: player1,
    playerO: player2,
    currentTurn: player1, // X always goes first
    status: 'in_game', // 'in_game' | 'finished'
    winner: null, // null | nickname | 'draw'
    winningLine: null, // null | [idx1, idx2, idx3]
    moveCount: 0,
    rematchVotes: new Set(),
    isVsBot,
    history: [] // record of moves
  };

  activeTTTGames.set(code, gameState);
  console.log(`[TicTacToe] Match started in room ${code}: ${player1} (X) vs ${player2} (O)`);

  broadcastTTTState(io, code);
  return gameState;
}

/**
 * Stop and clean up TTT game
 */
export function stopTTTGame(roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  if (activeTTTGames.has(code)) {
    activeTTTGames.delete(code);
    console.log(`[TicTacToe] Cleaned up game for room ${code}`);
  }
}

/**
 * Broadcast game state to room
 */
export function broadcastTTTState(io, roomCode) {
  const game = activeTTTGames.get(roomCode);
  if (!game) return;

  const payload = {
    roomCode: game.roomCode,
    board: game.board,
    playerX: game.playerX,
    playerO: game.playerO,
    currentTurn: game.currentTurn,
    status: game.status,
    winner: game.winner,
    winningLine: game.winningLine,
    moveCount: game.moveCount,
    rematchVotes: Array.from(game.rematchVotes),
    isVsBot: game.isVsBot,
    isForfeit: Boolean(game.isForfeit),
    forfeitedBy: game.forfeitedBy || null,
    opponentLeft: Boolean(game.opponentLeft),
    leftPlayer: game.leftPlayer || null
  };

  io.to(roomCode).emit('ttt:state', payload);
}

/**
 * Check if the current board has a winner or draw
 */
export function checkWinner(board) {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winnerMark: board[a], winningLine: combo };
    }
  }

  // Draw if all 9 cells are filled
  const isDraw = board.every((cell) => cell !== null);
  if (isDraw) {
    return { winnerMark: 'draw', winningLine: null };
  }

  return null;
}

/**
 * Execute a move by player
 */
export async function makeMove(io, roomCode, nickname, cellIndex) {
  const game = activeTTTGames.get(roomCode);
  if (!game) {
    return { success: false, error: 'Game not active' };
  }

  if (game.status !== 'in_game') {
    return { success: false, error: 'Game has already concluded' };
  }

  // Enforce turn order (M6-02)
  if (game.currentTurn !== nickname) {
    return { success: false, error: `It's ${game.currentTurn}'s turn!` };
  }

  // Validate cell index (M6-01)
  if (cellIndex < 0 || cellIndex > 8 || game.board[cellIndex] !== null) {
    return { success: false, error: 'Cell is already occupied or invalid' };
  }

  const mark = nickname === game.playerX ? 'X' : 'O';
  game.board[cellIndex] = mark;
  game.moveCount += 1;
  game.history.push({ player: nickname, mark, cellIndex });

  // Detect win or draw (M6-03)
  const result = checkWinner(game.board);

  if (result) {
    game.status = 'finished';
    if (result.winnerMark === 'draw') {
      game.winner = 'draw';
      game.winningLine = null;
      console.log(`[TicTacToe] Game in room ${roomCode} ended in a draw!`);
    } else {
      game.winner = nickname;
      game.winningLine = result.winningLine;
      const loserNickname = nickname === game.playerX ? game.playerO : game.playerX;
      console.log(`[TicTacToe] Player ${nickname} (${mark}) won in room ${roomCode}!`);

      // Persist score to Supabase (M6-12)
      try {
        if (!game.isVsBot || nickname !== 'CyberBot') {
          await recordScore(nickname, 'tictactoe', 100, true);
        }
        if (!game.isVsBot && loserNickname !== 'CyberBot') {
          await recordScore(loserNickname, 'tictactoe', 0, false);
        }
      } catch (err) {
        console.warn(`[TicTacToe] Could not record score to Supabase:`, err.message);
      }
    }

    broadcastTTTState(io, roomCode);
    return { success: true, game };
  }

  // Alternate turn
  game.currentTurn = game.currentTurn === game.playerX ? game.playerO : game.playerX;
  broadcastTTTState(io, roomCode);

  // If next turn is Bot, schedule bot move
  if (game.isVsBot && game.currentTurn === 'CyberBot' && game.status === 'in_game') {
    setTimeout(() => {
      makeBotMove(io, roomCode);
    }, 450);
  }

  return { success: true, game };
}

/**
 * Intelligent Bot AI move for solo or practice mode
 */
function makeBotMove(io, roomCode) {
  const game = activeTTTGames.get(roomCode);
  if (!game || game.status !== 'in_game' || game.currentTurn !== 'CyberBot') return;

  const botMark = game.playerO === 'CyberBot' ? 'O' : 'X';
  const humanMark = botMark === 'O' ? 'X' : 'O';
  const board = game.board;

  // 1. Check if Bot can win immediately
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = botMark;
      const win = checkWinner(board);
      board[i] = null;
      if (win && win.winnerMark === botMark) {
        makeMove(io, roomCode, 'CyberBot', i);
        return;
      }
    }
  }

  // 2. Block human opponent from winning on their next turn
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = humanMark;
      const win = checkWinner(board);
      board[i] = null;
      if (win && win.winnerMark === humanMark) {
        makeMove(io, roomCode, 'CyberBot', i);
        return;
      }
    }
  }

  // 3. Take center if available
  if (board[4] === null) {
    makeMove(io, roomCode, 'CyberBot', 4);
    return;
  }

  // 4. Take corners (0, 2, 6, 8)
  const corners = [0, 2, 6, 8].filter((idx) => board[idx] === null);
  if (corners.length > 0) {
    const chosen = corners[Math.floor(Math.random() * corners.length)];
    makeMove(io, roomCode, 'CyberBot', chosen);
    return;
  }

  // 5. Take any remaining empty cell
  const emptyCells = board.map((v, i) => (v === null ? i : null)).filter((v) => v !== null);
  if (emptyCells.length > 0) {
    const chosen = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    makeMove(io, roomCode, 'CyberBot', chosen);
  }
}

/**
 * Handle Rematch request (M6-11)
 */
export function handleRematch(io, roomCode, nickname) {
  const game = activeTTTGames.get(roomCode);
  if (!game) return { success: false, error: 'Game not found' };

  game.rematchVotes.add(nickname);
  console.log(`[TicTacToe] Rematch voted by ${nickname} in room ${roomCode}`);

  const requiredVotes = game.isVsBot ? 1 : 2;

  if (game.rematchVotes.size >= requiredVotes) {
    // Swap X and O for the rematch (M6-11)
    const prevX = game.playerX;
    const prevO = game.playerO;
    game.playerX = prevO;
    game.playerO = prevX;

    game.board = Array(9).fill(null);
    game.status = 'in_game';
    game.winner = null;
    game.winningLine = null;
    game.moveCount = 0;
    game.history = [];
    game.rematchVotes.clear();

    // New X goes first
    game.currentTurn = game.playerX;

    console.log(`[TicTacToe] Rematch triggered in ${roomCode}! New X: ${game.playerX}, New O: ${game.playerO}`);
    broadcastTTTState(io, roomCode);

    // If Bot is now X, trigger initial bot move
    if (game.isVsBot && game.currentTurn === 'CyberBot') {
      setTimeout(() => {
        makeBotMove(io, roomCode);
      }, 500);
    }

    return { success: true, restarted: true, game };
  }

  broadcastTTTState(io, roomCode);
  return { success: true, restarted: false, game };
}

/**
 * Handle player leaving the room
 */
export function handleTTTPlayerLeave(io, roomCode, nickname) {
  const game = activeTTTGames.get(roomCode);
  if (!game) return;

  if (game.status === 'in_game') {
    if (game.playerX === nickname || game.playerO === nickname) {
      const remainingWinner = game.playerX === nickname ? game.playerO : game.playerX;
      game.status = 'finished';
      game.winner = remainingWinner;
      game.isForfeit = true;
      game.forfeitedBy = nickname;
      console.log(`[TicTacToe] Player ${nickname} left room ${roomCode}. ${remainingWinner} wins by forfeit!`);

      // Persist forfeit victory
      try {
        if (remainingWinner !== 'CyberBot') {
          recordScore(remainingWinner, 'tictactoe', 100, true).catch(() => {});
        }
      } catch (err) {
        console.warn(`[TicTacToe] Forfeit score error:`, err.message);
      }

      broadcastTTTState(io, roomCode);
    }
  } else if (game.status === 'finished') {
    game.opponentLeft = true;
    game.leftPlayer = nickname;
    broadcastTTTState(io, roomCode);
  }
}

/**
 * Register Socket.IO handlers for Tic Tac Toe
 */
export function registerTTTHandlers(io, socket) {
  // Get active TTT state
  socket.on('ttt:get', ({ roomCode }, callback) => {
    let game = getTTTGame(roomCode);
    if (!game) {
      const room = getRoom(roomCode);
      if (room && room.gameType === 'tictactoe') {
        game = startTTTGame(io, roomCode);
      }
    }
    if (!game) {
      if (typeof callback === 'function') callback({ success: false, error: 'No game found' });
      return;
    }
    if (typeof callback === 'function') {
      callback({
        success: true,
        game: {
          roomCode: game.roomCode,
          board: game.board,
          playerX: game.playerX,
          playerO: game.playerO,
          currentTurn: game.currentTurn,
          status: game.status,
          winner: game.winner,
          winningLine: game.winningLine,
          moveCount: game.moveCount,
          rematchVotes: Array.from(game.rematchVotes),
          isVsBot: game.isVsBot,
          isForfeit: Boolean(game.isForfeit),
          forfeitedBy: game.forfeitedBy || null,
          opponentLeft: Boolean(game.opponentLeft),
          leftPlayer: game.leftPlayer || null
        }
      });
    }
  });

  // Make a move
  socket.on('ttt:move', async ({ roomCode, cellIndex, nickname }, callback) => {
    const result = await makeMove(io, roomCode, nickname, cellIndex);
    if (typeof callback === 'function') callback(result);
  });

  // Request rematch
  socket.on('ttt:rematch', ({ roomCode, nickname }, callback) => {
    const result = handleRematch(io, roomCode, nickname);
    if (typeof callback === 'function') callback(result);
  });
}
