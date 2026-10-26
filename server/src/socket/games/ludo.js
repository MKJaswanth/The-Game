import { getRoom } from '../rooms.js';
import { recordScore } from '../../routes/scores.js';

const activeLudoGames = new Map();
const COLORS = ['red', 'green', 'yellow', 'blue'];
const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const HOME_PROGRESS = 57;

export function getLudoGame(roomCode) {
  return activeLudoGames.get(roomCode?.toUpperCase()?.trim());
}

function createPlayers(room) {
  return room.players.map((player, index) => ({
    nickname: player.nickname,
    color: COLORS[index],
    startIndex: START_INDEX[COLORS[index]],
    tokens: [-1, -1, -1, -1]
  }));
}

function canMoveToken(player, token, dice) {
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) return false;
  if (token === HOME_PROGRESS) return false;
  if (token === -1) return dice === 6;
  return token + dice <= HOME_PROGRESS;
}

function absolutePosition(player, progress) {
  if (progress < 0 || progress > 51) return null;
  return (player.startIndex + progress) % 52;
}

function legalTokenIds(game, player) {
  if (game.phase !== 'move' || !Number.isInteger(game.dice)) return [];
  return player.tokens
    .map((token, index) => (canMoveToken(player, token, game.dice) ? index : null))
    .filter((index) => index !== null);
}

function publicState(game) {
  const current = game.players[game.currentIndex];
  return {
    roomCode: game.roomCode,
    status: game.status,
    phase: game.phase,
    players: game.players.map((player, index) => ({
      nickname: player.nickname,
      color: player.color,
      tokens: [...player.tokens],
      isTurn: index === game.currentIndex,
      legalTokenIds: index === game.currentIndex ? legalTokenIds(game, player) : [],
      tokensHome: player.tokens.filter((token) => token === HOME_PROGRESS).length
    })),
    currentTurn: current?.nickname || null,
    dice: game.dice,
    lastDice: game.lastDice,
    turnNumber: game.turnNumber,
    winner: game.winner,
    standings: game.standings,
    rematchVotes: Array.from(game.rematchVotes),
    safePositions: Array.from(SAFE_POSITIONS),
    lastAction: game.lastAction
  };
}

function broadcast(io, game) {
  io.to(game.roomCode).emit('ludo:state', publicState(game));
}

function advanceTurn(game) {
  game.currentIndex = (game.currentIndex + 1) % game.players.length;
  game.turnNumber += 1;
  game.phase = 'roll';
  game.dice = null;
}

export function startLudoGame(io, roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  const room = getRoom(code);
  if (!room || room.players.length < 2) return null;

  stopLudoGame(code);
  const game = {
    roomCode: code,
    players: createPlayers(room),
    currentIndex: 0,
    phase: 'roll',
    status: 'in_game',
    dice: null,
    lastDice: null,
    turnNumber: 1,
    winner: null,
    standings: [],
    rematchVotes: new Set(),
    lastAction: 'Roll the dice to begin'
  };
  activeLudoGames.set(code, game);
  console.log(`[Ludo] Game started in room ${code} with ${game.players.length} players`);
  broadcast(io, game);
  return game;
}

export function stopLudoGame(roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  if (activeLudoGames.delete(code)) console.log(`[Ludo] Cleaned up game for room ${code}`);
}

export function rollDice(io, roomCode, nickname) {
  const game = getLudoGame(roomCode);
  if (!game) return { success: false, error: 'No Ludo game is active.' };
  if (game.status !== 'in_game') return { success: false, error: 'The game has already ended.' };
  if (game.phase !== 'roll') return { success: false, error: 'Move a token before rolling again.' };

  const player = game.players[game.currentIndex];
  if (!player || player.nickname !== nickname) return { success: false, error: `It is ${player?.nickname || 'another player'}'s turn.` };

  game.dice = Math.floor(Math.random() * 6) + 1;
  game.lastDice = game.dice;
  const legal = legalTokenIds(game, player);
  if (legal.length === 0) {
    if (game.dice === 6) {
      game.lastAction = `${nickname} rolled a 6 but has no legal move — roll again`;
    } else {
      game.lastAction = `${nickname} rolled ${game.dice} — no legal move, turn passes`;
      advanceTurn(game);
    }
  } else {
    game.phase = 'move';
    game.lastAction = `${nickname} rolled ${game.dice} — choose a token`;
  }

  broadcast(io, game);
  return { success: true, dice: game.lastDice, legalTokenIds: legal };
}

function captureOpponents(game, movingPlayer, movedProgress) {
  const absolute = absolutePosition(movingPlayer, movedProgress);
  if (absolute === null || SAFE_POSITIONS.has(absolute)) return [];

  const captured = [];
  for (const player of game.players) {
    if (player === movingPlayer) continue;
    player.tokens = player.tokens.map((progress, tokenIndex) => {
      if (absolutePosition(player, progress) === absolute) {
        captured.push({ nickname: player.nickname, tokenIndex });
        return -1;
      }
      return progress;
    });
  }
  return captured;
}

function finishGame(io, game, winnerNickname) {
  game.status = 'finished';
  game.phase = 'finished';
  game.winner = winnerNickname;
  game.dice = null;
  game.standings = [...game.players]
    .map((player) => ({
      nickname: player.nickname,
      color: player.color,
      tokensHome: player.tokens.filter((token) => token === HOME_PROGRESS).length,
      isWinner: player.nickname === winnerNickname
    }))
    .sort((a, b) => Number(b.isWinner) - Number(a.isWinner) || b.tokensHome - a.tokensHome)
    .map((entry, index) => ({ ...entry, rank: index + 1, score: entry.isWinner ? 100 : 0 }));
  game.lastAction = winnerNickname ? `${winnerNickname} brought every token home` : 'Ludo match ended';

  for (const standing of game.standings) {
    recordScore(standing.nickname, 'ludo', standing.score, standing.isWinner)
      .catch((error) => console.warn(`[Ludo] Could not persist score: ${error.message}`));
  }

  const room = getRoom(game.roomCode);
  if (room) room.status = 'finished';
  broadcast(io, game);
}

export function moveToken(io, roomCode, nickname, tokenIndex) {
  const game = getLudoGame(roomCode);
  if (!game) return { success: false, error: 'No Ludo game is active.' };
  if (game.status !== 'in_game') return { success: false, error: 'The game has already ended.' };
  if (game.phase !== 'move') return { success: false, error: 'Roll the dice first.' };

  const player = game.players[game.currentIndex];
  if (!player || player.nickname !== nickname) return { success: false, error: `It is ${player?.nickname || 'another player'}'s turn.` };
  const index = Number(tokenIndex);
  if (!Number.isInteger(index) || index < 0 || index > 3) return { success: false, error: 'Invalid token.' };

  const legal = legalTokenIds(game, player);
  if (!legal.includes(index)) return { success: false, error: 'That token cannot move with this roll.' };

  const dice = game.dice;
  const previous = player.tokens[index];
  player.tokens[index] = previous === -1 ? 0 : previous + dice;
  const captured = captureOpponents(game, player, player.tokens[index]);
  const reachedHome = player.tokens[index] === HOME_PROGRESS;
  const capturedText = captured.length > 0 ? ` and captured ${captured.map((entry) => entry.nickname).join(', ')}` : '';
  game.lastAction = `${nickname} moved token ${index + 1}${reachedHome ? ' home' : ''}${capturedText}`;

  if (player.tokens.every((token) => token === HOME_PROGRESS)) {
    finishGame(io, game, nickname);
    return { success: true, won: true };
  }

  if (dice !== 6) advanceTurn(game);
  else {
    game.phase = 'roll';
    game.dice = null;
    game.lastAction += ' — roll again';
  }
  broadcast(io, game);
  return { success: true, captured, extraTurn: dice === 6 };
}

export function rematchLudo(io, roomCode, nickname) {
  const game = getLudoGame(roomCode);
  const room = getRoom(roomCode);
  if (!game || !room) return { success: false, error: 'Ludo game not found.' };
  if (game.status !== 'finished') return { success: false, error: 'Finish the current game first.' };
  if (!game.players.some((player) => player.nickname === nickname)) return { success: false, error: 'You are not in this match.' };

  game.rematchVotes.add(nickname);
  const needed = Math.max(2, room.players.length);
  if (game.rematchVotes.size >= needed) {
    room.status = 'in_game';
    startLudoGame(io, roomCode);
    io.to(roomCode).emit('room:state', room);
    return { success: true, restarted: true };
  }

  broadcast(io, game);
  return { success: true, waiting: true, votes: game.rematchVotes.size, needed };
}

export function handleLudoPlayerLeave(io, roomCode, nickname) {
  const game = getLudoGame(roomCode);
  if (!game) return;
  const leavingIndex = game.players.findIndex((player) => player.nickname === nickname);
  if (leavingIndex === -1) return;

  game.players.splice(leavingIndex, 1);
  game.rematchVotes.delete(nickname);
  if (game.players.length < 2) {
    if (game.status === 'in_game' && game.players[0]) finishGame(io, game, game.players[0].nickname);
    else stopLudoGame(roomCode);
    return;
  }

  if (leavingIndex < game.currentIndex) game.currentIndex -= 1;
  if (game.currentIndex >= game.players.length) game.currentIndex = 0;
  if (game.status === 'in_game' && game.phase === 'move' && !legalTokenIds(game, game.players[game.currentIndex]).length) {
    game.phase = 'roll';
    game.dice = null;
  }
  broadcast(io, game);
}

export function registerLudoHandlers(io, socket) {
  const resolvePlayer = (roomCode) => {
    const room = getRoom(roomCode);
    return room?.players.find((player) => player.socketId === socket.id) || null;
  };

  socket.on('ludo:get', ({ roomCode }, callback) => {
    let game = getLudoGame(roomCode);
    const room = getRoom(roomCode);
    if (!game && room?.gameType === 'ludo' && room.status === 'in_game') game = startLudoGame(io, roomCode);
    if (!game) {
      if (typeof callback === 'function') callback({ success: false, error: 'No Ludo game found.' });
      return;
    }
    if (typeof callback === 'function') callback({ success: true });
    broadcast(io, game);
  });

  socket.on('ludo:roll', ({ roomCode }, callback) => {
    const player = resolvePlayer(roomCode);
    const result = player ? rollDice(io, roomCode, player.nickname) : { success: false, error: 'You are not in this room.' };
    if (typeof callback === 'function') callback(result);
  });

  socket.on('ludo:move', ({ roomCode, tokenIndex }, callback) => {
    const player = resolvePlayer(roomCode);
    const result = player ? moveToken(io, roomCode, player.nickname, tokenIndex) : { success: false, error: 'You are not in this room.' };
    if (typeof callback === 'function') callback(result);
  });

  socket.on('ludo:rematch', ({ roomCode }, callback) => {
    const player = resolvePlayer(roomCode);
    const result = player ? rematchLudo(io, roomCode, player.nickname) : { success: false, error: 'You are not in this room.' };
    if (typeof callback === 'function') callback(result);
  });
}
