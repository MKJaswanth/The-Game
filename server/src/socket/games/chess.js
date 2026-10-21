import { Chess } from 'chess.js';
import { getRoom } from '../rooms.js';
import { recordScore } from '../../routes/scores.js';

/**
 * M13 — Chess ♟️
 * Server-authoritative 1v1 chess. chess.js owns the rules; the server owns the
 * game object so neither client can invent a legal move. Clients send
 * `{ from, to, promotion }` and receive a FEN snapshot plus the legal-move map
 * for the side to move (chess has no hidden information, so that is safe).
 */

const activeChessGames = new Map();

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function getChessGame(roomCode) {
  return activeChessGames.get(roomCode?.toUpperCase()?.trim());
}

function colorOf(game, nickname) {
  if (game.players.w === nickname) return 'w';
  if (game.players.b === nickname) return 'b';
  return null;
}

function capturedBy(game, color) {
  // pieces this color has captured (opponent pieces off the board)
  return game.captured[color] || [];
}

/**
 * Group chess.js legal moves by origin square so the client can highlight
 * every destination for the piece the player clicks.
 */
function legalMoveMap(chess) {
  const map = {};
  for (const move of chess.moves({ verbose: true })) {
    if (!map[move.from]) map[move.from] = [];
    map[move.from].push({ to: move.to, promotion: move.promotion || null, piece: move.piece });
  }
  return map;
}

function findKingSquare(chess, color) {
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

export function buildChessPayload(game) {
  const chess = game.chess;
  const turn = chess.turn();
  const inCheck = chess.isCheck() ? turn : null;

  return {
    roomCode: game.roomCode,
    fen: chess.fen(),
    turn,
    status: game.status,
    players: { w: game.players.w, b: game.players.b },
    lastMove: game.lastMove,
    inCheck,
    checkSquare: inCheck ? findKingSquare(chess, inCheck) : null,
    legalMoves: game.status === 'in_game' ? legalMoveMap(chess) : {},
    history: chess.history(),
    captured: { w: capturedBy(game, 'w'), b: capturedBy(game, 'b') },
    material: {
      w: capturedBy(game, 'w').reduce((sum, p) => sum + (PIECE_VALUE[p] || 0), 0),
      b: capturedBy(game, 'b').reduce((sum, p) => sum + (PIECE_VALUE[p] || 0), 0)
    },
    result: game.result,
    drawOffer: game.drawOffer,
    rematchVotes: Array.from(game.rematchVotes),
    moveCount: game.moveCount,
    startedAt: game.startedAt
  };
}

export function broadcastChessState(io, roomCode) {
  const game = getChessGame(roomCode);
  if (!game) return;
  io.to(game.roomCode).emit('chess:state', buildChessPayload(game));
}

/**
 * M13-02/M13-03: create a fresh game with the room's two seats.
 * White is the host on the first game; colours alternate on rematch.
 */
export function startChessGame(io, roomCode, { swapColors = false } = {}) {
  const code = roomCode?.toUpperCase()?.trim();
  const room = getRoom(code);
  if (!room) return null;

  const previous = activeChessGames.get(code);
  const seats = room.players.map((p) => p.nickname).slice(0, 2);
  if (seats.length < 2) return null;

  // Swap relative to the seats of the previous game (not the room order) so
  // colours genuinely alternate across a rematch series.
  const order = swapColors && previous
    ? [previous.players.b, previous.players.w]
    : seats;

  stopChessGame(code);

  const game = {
    roomCode: code,
    chess: new Chess(),
    players: { w: order[0], b: order[1] },
    status: 'in_game',
    result: null,
    lastMove: null,
    drawOffer: null,
    rematchVotes: new Set(),
    captured: { w: [], b: [] },
    moveCount: 0,
    startedAt: Date.now(),
    previousResult: previous?.result || null
  };

  activeChessGames.set(code, game);
  console.log(`[Chess] Game started in room ${code}: ${order[0]} (white) vs ${order[1]} (black)`);

  broadcastChessState(io, code);
  return game;
}

export function stopChessGame(roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  if (activeChessGames.has(code)) {
    activeChessGames.delete(code);
    console.log(`[Chess] Cleaned up game for room ${code}`);
  }
}

/**
 * M13-04: finish the game, persist the result once.
 */
async function finishGame(io, game, result) {
  if (game.status === 'finished') return;

  game.status = 'finished';
  game.result = result;
  game.drawOffer = null;
  game.rematchVotes = new Set();

  console.log(
    `[Chess] Room ${game.roomCode} finished — ${result.type}${result.winner ? `, winner ${result.winner}` : ''}`
  );

  broadcastChessState(io, game.roomCode);

  const whiteScore = result.winner === null ? 50 : result.winner === game.players.w ? 100 : 0;
  const blackScore = result.winner === null ? 50 : result.winner === game.players.b ? 100 : 0;

  try {
    await recordScore(game.players.w, 'chess', whiteScore, result.winner === game.players.w);
    await recordScore(game.players.b, 'chess', blackScore, result.winner === game.players.b);
  } catch (err) {
    console.warn(`[Chess] Could not persist result: ${err.message}`);
  }
}

function detectEnd(io, game) {
  const chess = game.chess;
  if (!chess.isGameOver()) return false;

  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? game.players.b : game.players.w;
    finishGame(io, game, { type: 'checkmate', winner, reason: 'Checkmate' });
    return true;
  }
  if (chess.isStalemate()) {
    finishGame(io, game, { type: 'stalemate', winner: null, reason: 'Stalemate' });
    return true;
  }
  if (chess.isThreefoldRepetition()) {
    finishGame(io, game, { type: 'draw', winner: null, reason: 'Threefold repetition' });
    return true;
  }
  if (chess.isInsufficientMaterial()) {
    finishGame(io, game, { type: 'draw', winner: null, reason: 'Insufficient material' });
    return true;
  }
  finishGame(io, game, { type: 'draw', winner: null, reason: 'Fifty-move rule' });
  return true;
}

/**
 * M13-08: apply a move. Everything is re-validated here, never trusted.
 */
export async function makeChessMove(io, roomCode, nickname, { from, to, promotion } = {}) {
  const game = getChessGame(roomCode);
  if (!game) return { success: false, error: 'No chess game in this room.' };
  if (game.status !== 'in_game') return { success: false, error: 'This game is already over.' };

  const color = colorOf(game, nickname);
  if (!color) return { success: false, error: 'You are not seated in this game.' };

  const turn = game.chess.turn();
  if (turn !== color) {
    return { success: false, error: `It's ${game.players[turn]}'s turn.` };
  }
  if (!from || !to) return { success: false, error: 'Pick a piece and a destination square.' };

  let move;
  try {
    move = game.chess.move({ from, to, promotion: promotion || 'q' });
  } catch {
    return { success: false, error: 'Illegal move.' };
  }

  if (!move) return { success: false, error: 'Illegal move.' };

  game.moveCount += 1;
  game.lastMove = {
    from: move.from,
    to: move.to,
    san: move.san,
    color: move.color,
    piece: move.piece,
    captured: move.captured || null
  };
  game.drawOffer = null;

  if (move.captured) {
    game.captured[move.color].push(move.captured);
  }

  const ended = detectEnd(io, game);
  if (!ended) broadcastChessState(io, game.roomCode);

  return { success: true, move: game.lastMove };
}

/** M13-11: offer a draw. */
export function offerChessDraw(io, roomCode, nickname) {
  const game = getChessGame(roomCode);
  if (!game) return { success: false, error: 'No chess game in this room.' };
  if (game.status !== 'in_game') return { success: false, error: 'This game is already over.' };

  const color = colorOf(game, nickname);
  if (!color) return { success: false, error: 'You are not seated in this game.' };
  if (game.drawOffer === nickname) return { success: false, error: 'You already offered a draw.' };

  game.drawOffer = nickname;
  broadcastChessState(io, game.roomCode);
  return { success: true };
}

export async function respondChessDraw(io, roomCode, nickname, accept) {
  const game = getChessGame(roomCode);
  if (!game) return { success: false, error: 'No chess game in this room.' };
  if (!game.drawOffer) return { success: false, error: 'There is no draw offer to answer.' };
  if (game.drawOffer === nickname) return { success: false, error: 'Wait for your opponent to answer.' };

  if (accept) {
    await finishGame(io, game, { type: 'draw', winner: null, reason: 'Draw agreed' });
    return { success: true, accepted: true };
  }

  game.drawOffer = null;
  broadcastChessState(io, game.roomCode);
  return { success: true, accepted: false };
}

export async function resignChess(io, roomCode, nickname) {
  const game = getChessGame(roomCode);
  if (!game) return { success: false, error: 'No chess game in this room.' };
  if (game.status !== 'in_game') return { success: false, error: 'This game is already over.' };

  const color = colorOf(game, nickname);
  if (!color) return { success: false, error: 'You are not seated in this game.' };

  const winner = color === 'w' ? game.players.b : game.players.w;
  await finishGame(io, game, { type: 'resign', winner, reason: `${nickname} resigned` });
  return { success: true };
}

/** M13-10: rematch — both seats must agree. */
export function rematchChess(io, roomCode, nickname) {
  const game = getChessGame(roomCode);
  if (!game) {
    const started = startChessGame(io, roomCode);
    return started ? { success: true } : { success: false, error: 'Need two players to play chess.' };
  }
  if (game.status !== 'finished') return { success: false, error: 'Finish the current game first.' };
  if (!colorOf(game, nickname)) return { success: false, error: 'You are not seated in this game.' };

  game.rematchVotes.add(nickname);
  const needed = 2;
  if (game.rematchVotes.size >= needed) {
    startChessGame(io, roomCode, { swapColors: true });
    return { success: true, restarted: true };
  }

  broadcastChessState(io, game.roomCode);
  return { success: true, waiting: true, votes: game.rematchVotes.size, needed };
}

/**
 * A player leaving forfeits the game (M13-04 edge case).
 */
export async function handleChessPlayerLeave(io, roomCode, nickname) {
  const game = getChessGame(roomCode);
  if (!game || game.status !== 'in_game') return;

  const color = colorOf(game, nickname);
  if (!color) return;

  const winner = color === 'w' ? game.players.b : game.players.w;
  await finishGame(io, game, { type: 'abandon', winner, reason: `${nickname} left the game` });
}

export function registerChessHandlers(io, socket) {
  const resolvePlayer = (roomCode) => {
    const room = getRoom(roomCode);
    return room?.players.find((p) => p.socketId === socket.id) || null;
  };

  // Fetch the current game, starting it lazily if the room is already live.
  socket.on('chess:get', ({ roomCode }, callback) => {
    let game = getChessGame(roomCode);
    if (!game) {
      const room = getRoom(roomCode);
      if (room && room.gameType === 'chess' && room.status === 'in_game') {
        game = startChessGame(io, roomCode);
      }
    }
    if (!game) {
      if (typeof callback === 'function') callback({ success: false, error: 'No chess game found.' });
      return;
    }
    if (typeof callback === 'function') callback({ success: true });
    broadcastChessState(io, game.roomCode);
  });

  socket.on('chess:move', async ({ roomCode, from, to, promotion }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = await makeChessMove(io, roomCode, me.nickname, { from, to, promotion });
    if (typeof callback === 'function') callback(result);
  });

  socket.on('chess:draw:offer', ({ roomCode }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = offerChessDraw(io, roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });

  socket.on('chess:draw:respond', async ({ roomCode, accept }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = await respondChessDraw(io, roomCode, me.nickname, Boolean(accept));
    if (typeof callback === 'function') callback(result);
  });

  socket.on('chess:resign', async ({ roomCode }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = await resignChess(io, roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });

  socket.on('chess:rematch', ({ roomCode }, callback) => {
    const me = resolvePlayer(roomCode);
    if (!me) {
      if (typeof callback === 'function') callback({ success: false, error: 'You are not in this room.' });
      return;
    }
    const result = rematchChess(io, roomCode, me.nickname);
    if (typeof callback === 'function') callback(result);
  });
}
