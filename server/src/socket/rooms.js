import { randomUUID } from 'crypto';
import { startWordScrambleGame, stopWordScrambleGame } from './games/wordscramble.js';
import { startTriviaGame, stopTriviaGame } from './games/trivia.js';
import { startTTTGame, stopTTTGame, handleTTTPlayerLeave } from './games/tictactoe.js';
import { startUnoGame, stopUnoGame, handleUnoPlayerLeave } from './games/uno.js';
import { startFlappyGame, stopFlappyGame, handleFlappyPlayerLeave } from './games/flappy.js';
import { startChessGame, stopChessGame, handleChessPlayerLeave } from './games/chess.js';
import { startEmojiGame, stopEmojiGame, handleEmojiPlayerLeave } from './games/emoji.js';
import { startDrawingGame, stopDrawingGame, handleDrawingPlayerLeave } from './games/drawing.js';
import { startLudoGame, stopLudoGame, handleLudoPlayerLeave } from './games/ludo.js';
import { broadcastSystemMessage } from './chat.js';

const rooms = new Map();

const GAME_CAPACITIES = {
  snake: { min: 1, max: 1 },
  tictactoe: { min: 1, max: 2 },
  wordscramble: { min: 1, max: 6 },
  trivia: { min: 1, max: 8 },
  uno: { min: 2, max: 8 },
  flappy: { min: 1, max: 4 },
  chess: { min: 2, max: 2 },
  emoji: { min: 2, max: 8 },
  drawing: { min: 2, max: 8 },
  ludo: { min: 2, max: 4 }
};

// A dropped socket does not immediately cost a player their seat: the room keeps
// the entry, marks it disconnected, and lets the same player reclaim it with the
// token they were handed when they joined. Refreshing mid-game, a phone losing
// signal or a laptop sleeping all recover instead of ending someone's match.
const RECONNECT_GRACE_MS = Number(process.env.RECONNECT_GRACE_MS) > 0
  ? Number(process.env.RECONNECT_GRACE_MS)
  : 45000;

/** Never leak another player's resume token through a room broadcast. */
function publicPlayer(p) {
  return {
    socketId: p.socketId,
    nickname: p.nickname,
    isHost: Boolean(p.isHost),
    isReady: Boolean(p.isReady),
    connected: p.connected !== false,
    joinedAt: p.joinedAt
  };
}

export function publicRoom(room) {
  if (!room) return null;
  const view = { ...room, players: room.players.map(publicPlayer) };
  // Internal routing data and the chat buffer are not room state; `messages`
  // would also resend up to 100 lines on every room broadcast.
  delete view.reconnectTimers;
  delete view.hostSocketId;
  delete view.messages;
  return view;
}

function newPlayer({ socketId, nickname, isHost, isReady }) {
  return {
    socketId,
    nickname,
    isHost: Boolean(isHost),
    isReady: Boolean(isReady),
    connected: true,
    token: randomUUID(),
    joinedAt: new Date().toISOString()
  };
}

function clearReconnectTimer(room, nickname) {
  const timers = room?.reconnectTimers;
  if (!timers) return;
  const key = String(nickname).toLowerCase();
  const timer = timers.get(key);
  if (timer) {
    clearTimeout(timer);
    timers.delete(key);
  }
}

/**
 * Who is allowed to take this seat over? A matching resume token always wins
 * (it is the only way to recover a page refresh before the stale socket times
 * out); a bare nickname only when that seat is currently disconnected, so a
 * stranger can never evict a player who is still in the room.
 */
function findResumablePlayer(room, { nickname, token }) {
  if (token) {
    const byToken = room.players.find((p) => p.token && p.token === token);
    if (byToken) return byToken;
  }
  if (nickname) {
    const byNick = room.players.find(
      (p) => p.nickname.toLowerCase() === String(nickname).toLowerCase()
    );
    if (byNick && byNick.connected === false) return byNick;
  }
  return null;
}

function resumePlayer(io, socket, room, player) {
  const code = room.code;
  const wasDisconnected = player.connected === false;
  clearReconnectTimer(room, player.nickname);

  player.socketId = socket.id;
  player.connected = true;
  player.disconnectedAt = null;
  if (player.isHost) room.hostSocketId = socket.id;

  socket.join(code);
  const view = publicRoom(room);
  io.to(code).emit('room:state', view);
  socket.emit('room:resumed', { roomCode: code, room: view, nickname: player.nickname });
  if (wasDisconnected) {
    console.log(`[Rooms] Player ${player.nickname} reclaimed their seat in ${code}`);
    broadcastSystemMessage(io, code, `${player.nickname} reconnected`);
  }

  return { success: true, resumed: true, roomCode: code, room: view, token: player.token };
}

/**
 * A socket holds one seat at a time. Creating or joining a room drops any
 * earlier seat (the hub's own links can navigate without an explicit leave),
 * so abandoned rooms cannot keep advertising a host who has moved on.
 */
function leavePreviousRooms(io, socket, keepCode = null) {
  for (const [code, room] of rooms.entries()) {
    if (code === keepCode) continue;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) continue;
    socket.leave(code);
    removePlayer(io, code, room, player, `${player.nickname} left the room`);
  }
}

function stopAllGames(code) {
  stopWordScrambleGame(code);
  stopTriviaGame(code);
  stopTTTGame(code);
  stopUnoGame(code);
  stopFlappyGame(code);
  stopChessGame(code);
  stopEmojiGame(code);
  stopDrawingGame(code);
  stopLudoGame(code);
}

function removePlayer(io, code, room, player, systemText) {
  clearReconnectTimer(room, player.nickname);
  const index = room.players.findIndex(
    (p) => p === player || (player.socketId && p.socketId === player.socketId)
  );
  if (index === -1) return;
  room.players.splice(index, 1);

  if (room.players.length === 0) {
    stopAllGames(code);
    if (rooms.get(code) === room) rooms.delete(code);
    console.log(`[Rooms] Deleted empty room ${code}`);
    broadcastOpenRooms(io);
    return;
  }

  if (player.isHost || room.hostNickname === player.nickname) {
    room.players[0].isHost = true;
    room.hostNickname = room.players[0].nickname;
    room.hostSocketId = room.players[0].socketId;
    console.log(`[Rooms] Transferred host in room ${code} to ${room.hostNickname}`);
  }

  broadcastSystemMessage(io, code, systemText || `${player.nickname} left the room`);
  handleTTTPlayerLeave(io, code, player.nickname);
  handleUnoPlayerLeave(io, code, player.nickname);
  handleFlappyPlayerLeave(io, code, player.nickname);
  handleChessPlayerLeave(io, code, player.nickname);
  handleEmojiPlayerLeave(io, code, player.nickname);
  handleDrawingPlayerLeave(io, code, player.nickname);
  handleLudoPlayerLeave(io, code, player.nickname);
  io.to(code).emit('room:state', publicRoom(room));
  broadcastOpenRooms(io);
}

/** A live match keeps the seat warm for the grace window, then gives it up. */
function markDisconnected(io, room, player) {
  const code = room.code;
  player.connected = false;
  player.disconnectedAt = Date.now();
  room.reconnectTimers = room.reconnectTimers || new Map();

  broadcastSystemMessage(io, code, `${player.nickname} disconnected — waiting for them to reconnect`);
  io.to(code).emit('room:state', publicRoom(room));

  const key = player.nickname.toLowerCase();
  const existing = room.reconnectTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    room.reconnectTimers.delete(key);
    if (player.connected) return;
    removePlayer(io, code, room, player, `${player.nickname} lost connection`);
  }, RECONNECT_GRACE_MS);
  if (typeof timer.unref === 'function') timer.unref();
  room.reconnectTimers.set(key, timer);
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

export function getRoom(roomCode) {
  if (!roomCode) return null;
  return rooms.get(roomCode.toUpperCase().trim());
}

/**
 * Rooms that are visible from the hub. Keep this deliberately small: the hub
 * only needs enough information to let another player choose and join a room,
 * never the full private room state.
 */
export function getOpenRooms() {
  return Array.from(rooms.values())
    .filter((room) => (
      room.status === 'waiting' &&
      !room.isSolo &&
      room.capacity?.max > 1 &&
      room.players.length < room.capacity.max
    ))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((room) => ({
      code: room.code,
      gameType: room.gameType,
      hostNickname: room.hostNickname,
      currentPlayers: room.players.length,
      minPlayers: room.capacity.min,
      maxPlayers: room.capacity.max,
      createdAt: room.createdAt
    }));
}

function broadcastOpenRooms(io) {
  io.emit('rooms:update', { rooms: getOpenRooms() });
}

export function registerRoomHandlers(io, socket) {
  // A hub can mount after the connection event has already fired, so expose an
  // acknowledgement path as well as the live broadcast below.
  socket.emit('rooms:update', { rooms: getOpenRooms() });
  socket.on('rooms:get', (callback) => {
    if (typeof callback === 'function') callback({ success: true, rooms: getOpenRooms() });
  });

  // Handle room:create (US-005 / M2-05 / M2-06)
  socket.on('room:create', ({ gameType, nickname, maxPlayers, isSolo }, callback) => {
    if (!nickname) {
      const err = { success: false, error: 'Nickname is required to create a room' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    if (!GAME_CAPACITIES[gameType]) {
      const err = { success: false, error: 'That game is not available.' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    leavePreviousRooms(io, socket);

    const roomCode = generateRoomCode();
    const baseCap = GAME_CAPACITIES[gameType] || { min: 1, max: 8 };
    const numMax = maxPlayers ? parseInt(maxPlayers, 10) : baseCap.max;
    const capacity = isSolo
      ? { min: 1, max: 1 }
      : {
          min: baseCap.min,
          max: !isNaN(numMax) ? Math.min(Math.max(numMax, baseCap.min), baseCap.max) : baseCap.max
        };

    const isImmediateStart = Boolean(isSolo);

    const newRoom = {
      code: roomCode,
      gameType,
      hostNickname: nickname,
      hostSocketId: socket.id,
      capacity,
      isSolo: Boolean(isSolo),
      status: isImmediateStart ? 'in_game' : 'waiting', // 'waiting' | 'in_game' | 'finished'
      players: [
        newPlayer({ socketId: socket.id, nickname, isHost: true, isReady: true })
      ],
      reconnectTimers: new Map(),
      createdAt: new Date().toISOString()
    };

    rooms.set(roomCode, newRoom);
    socket.join(roomCode);

    console.log(
      `[Rooms] Created room ${roomCode} for game ${gameType} by ${nickname} (capacity: ${capacity.min}-${capacity.max}, isSolo: ${Boolean(isSolo)})`
    );

    const res = {
      success: true,
      roomCode,
      room: publicRoom(newRoom),
      token: newRoom.players[0].token
    };
    if (typeof callback === 'function') callback(res);
    socket.emit('room:created', res);
    io.to(roomCode).emit('room:state', publicRoom(newRoom));
    broadcastOpenRooms(io);

    if (isImmediateStart) {
      io.to(roomCode).emit('game:start', { roomCode, gameType, players: newRoom.players });
      if (gameType === 'wordscramble') {
        startWordScrambleGame(io, roomCode);
      } else if (gameType === 'trivia') {
        startTriviaGame(io, roomCode);
      } else if (gameType === 'tictactoe') {
        startTTTGame(io, roomCode);
      } else if (gameType === 'uno') {
        startUnoGame(io, roomCode);
      } else if (gameType === 'flappy') {
        startFlappyGame(io, roomCode);
      } else if (gameType === 'chess') {
        startChessGame(io, roomCode);
      } else if (gameType === 'emoji') {
        startEmojiGame(io, roomCode);
      } else if (gameType === 'drawing') {
        startDrawingGame(io, roomCode);
      } else if (gameType === 'ludo') {
        startLudoGame(io, roomCode);
      }
    }
  });

  // Handle room:join (US-006 / M2-09 / M2-10)
  socket.on('room:join', ({ roomCode, nickname, token }, callback) => {
    if (!roomCode || !nickname) {
      const err = { success: false, error: 'Room code and nickname are required' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    const code = roomCode.toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) {
      const err = { success: false, error: 'Room not found. Check the code and try again.' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    // Reclaiming a seat (refresh, reconnect, dropped wifi) beats the in-progress guard.
    const resumable = findResumablePlayer(room, { nickname, token });
    if (resumable) {
      leavePreviousRooms(io, socket, code);
      const resumed = resumePlayer(io, socket, room, resumable);
      if (typeof callback === 'function') callback(resumed);
      return;
    }

    if (room.status === 'in_game') {
      const err = { success: false, error: 'This game is already in progress.' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    const existingPlayer = room.players.find(p => p.socketId === socket.id || p.nickname.toLowerCase() === nickname.toLowerCase());

    // Two tabs with the same callsign used to share one seat: the second socket
    // got "success" plus the first player's resume token, but chat and game
    // actions rejected it because its socket id was never seated.
    if (existingPlayer && existingPlayer.socketId !== socket.id) {
      const err = { success: false, error: 'That callsign is already seated in this room.' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    if (!existingPlayer && room.players.length >= room.capacity.max) {
      const err = { success: false, error: `Room is full (max ${room.capacity.max} players).` };
      if (typeof callback === 'function') callback(err);
      return;
    }

    leavePreviousRooms(io, socket, code);

    let joinedPlayer = existingPlayer;
    if (!existingPlayer) {
      joinedPlayer = newPlayer({ socketId: socket.id, nickname, isHost: false, isReady: false });
      room.players.push(joinedPlayer);
    }

    socket.join(code);
    console.log(`[Rooms] Player ${nickname} joined room ${code}. Total players: ${room.players.length}`);

    // M9-05: System message — player joined
    if (!existingPlayer) {
      broadcastSystemMessage(io, code, `${nickname} joined the room`);
    }

    const res = {
      success: true,
      roomCode: code,
      room: publicRoom(room),
      token: joinedPlayer?.token
    };
    if (typeof callback === 'function') callback(res);
    io.to(code).emit('room:state', publicRoom(room));
    broadcastOpenRooms(io);
  });

  // Handle room:get — also the resume path for a refreshed or reconnected tab
  socket.on('room:get', ({ roomCode, nickname, token }, callback) => {
    const room = getRoom(roomCode);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
      return;
    }

    // Already seated on this socket (fresh navigation after create/join): hand
    // back the token so a later refresh can reclaim the seat.
    const seated = room.players.find((p) => p.socketId === socket.id);
    if (seated) {
      if (typeof callback === 'function') {
        callback({ success: true, room: publicRoom(room), token: seated.token });
      }
      return;
    }

    const resumable = findResumablePlayer(room, { nickname, token });
    if (resumable) {
      if (typeof callback === 'function') callback(resumePlayer(io, socket, room, resumable));
      return;
    }

    if (typeof callback === 'function') callback({ success: true, room: publicRoom(room) });
  });

  // Handle room:start (US-008 / M2-14 / M2-15)
  socket.on('room:start', ({ roomCode }, callback) => {
    const code = roomCode?.toUpperCase()?.trim();
    const room = rooms.get(code);

    if (!room) {
      const err = { success: false, error: 'Room not found' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    if (room.hostSocketId !== socket.id) {
      const err = { success: false, error: 'Only the host can start the game' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    if (room.players.length < room.capacity.min) {
      const err = { success: false, error: `Need at least ${room.capacity.min} players to start` };
      if (typeof callback === 'function') callback(err);
      return;
    }

    room.status = 'in_game';
    console.log(`[Rooms] Game started in room ${code} for ${room.gameType}`);

    const res = { success: true, room: publicRoom(room) };
    if (typeof callback === 'function') callback(res);
    io.to(code).emit('room:state', publicRoom(room));
    broadcastOpenRooms(io);
    io.to(code).emit('game:start', { roomCode: code, gameType: room.gameType, players: room.players });

    if (room.gameType === 'wordscramble') {
      startWordScrambleGame(io, code);
    } else if (room.gameType === 'trivia') {
      startTriviaGame(io, code);
    } else if (room.gameType === 'tictactoe') {
      startTTTGame(io, code);
    } else if (room.gameType === 'uno') {
      startUnoGame(io, code);
    } else if (room.gameType === 'flappy') {
      startFlappyGame(io, code);
    } else if (room.gameType === 'chess') {
      startChessGame(io, code);
    } else if (room.gameType === 'emoji') {
      startEmojiGame(io, code);
    } else if (room.gameType === 'drawing') {
      startDrawingGame(io, code);
    } else if (room.gameType === 'ludo') {
      startLudoGame(io, code);
    }
  });

  // Handle room:leave — an explicit exit gives up the seat immediately
  socket.on('room:leave', ({ roomCode }, callback) => {
    const code = roomCode?.toUpperCase()?.trim();
    const room = rooms.get(code);

    if (room) {
      // Only this socket's own seat may be given up. Matching the supplied
      // nickname let any client with a room code kick another player (and a
      // solo room's last player deleted the whole room).
      const player = room.players.find((p) => p.socketId === socket.id);
      socket.leave(code);
      if (player) removePlayer(io, code, room, player, `${player.nickname} left the room`);
    }

    if (typeof callback === 'function') callback({ success: true });
  });

  // Clean up on disconnect — mid-match this only parks the seat
  socket.on('disconnect', () => {
    for (const [code, room] of rooms.entries()) {
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) continue;

      // Any multiplayer seat is held through the grace window, not just a live
      // match: a refresh in the waiting lobby is as recoverable as one mid-game
      // and used to delete the room before the tab could resume it.
      if (!room.isSolo) {
        console.log(
          `[Rooms] Player ${player.nickname} dropped from room ${code}; holding their seat for ${Math.round(RECONNECT_GRACE_MS / 1000)}s`
        );
        markDisconnected(io, room, player);
      } else {
        console.log(`[Rooms] Player ${player.nickname} disconnected from room ${code}`);
        removePlayer(io, code, room, player, `${player.nickname} disconnected`);
      }
    }
  });
}
