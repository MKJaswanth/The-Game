import { startWordScrambleGame, stopWordScrambleGame } from './games/wordscramble.js';
import { startTriviaGame, stopTriviaGame } from './games/trivia.js';
import { startTTTGame, stopTTTGame, handleTTTPlayerLeave } from './games/tictactoe.js';
import { startUnoGame, stopUnoGame, handleUnoPlayerLeave } from './games/uno.js';
import { startFlappyGame, stopFlappyGame, handleFlappyPlayerLeave } from './games/flappy.js';
import { startChessGame, stopChessGame, handleChessPlayerLeave } from './games/chess.js';
import { startEmojiGame, stopEmojiGame, handleEmojiPlayerLeave } from './games/emoji.js';
import { broadcastSystemMessage } from './chat.js';

const rooms = new Map();

const GAME_CAPACITIES = {
  snake: { min: 1, max: 1 },
  tictactoe: { min: 1, max: 2 },
  wordscramble: { min: 1, max: 6 },
  trivia: { min: 1, max: 8 },
  uno: { min: 2, max: 6 },
  flappy: { min: 1, max: 4 },
  chess: { min: 2, max: 2 },
  emoji: { min: 2, max: 8 }
};

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

export function registerRoomHandlers(io, socket) {
  // Handle room:create (US-005 / M2-05 / M2-06)
  socket.on('room:create', ({ gameType, nickname, maxPlayers, isSolo }, callback) => {
    if (!nickname) {
      const err = { success: false, error: 'Nickname is required to create a room' };
      if (typeof callback === 'function') callback(err);
      return;
    }

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
        {
          socketId: socket.id,
          nickname,
          isHost: true,
          isReady: true,
          joinedAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };

    rooms.set(roomCode, newRoom);
    socket.join(roomCode);

    console.log(
      `[Rooms] Created room ${roomCode} for game ${gameType} by ${nickname} (capacity: ${capacity.min}-${capacity.max}, isSolo: ${Boolean(isSolo)})`
    );

    const res = { success: true, roomCode, room: newRoom };
    if (typeof callback === 'function') callback(res);
    socket.emit('room:created', res);
    io.to(roomCode).emit('room:state', newRoom);

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
      }
    }
  });

  // Handle room:join (US-006 / M2-09 / M2-10)
  socket.on('room:join', ({ roomCode, nickname }, callback) => {
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

    if (room.status === 'in_game') {
      const err = { success: false, error: 'This game is already in progress.' };
      if (typeof callback === 'function') callback(err);
      return;
    }

    const existingPlayer = room.players.find(p => p.socketId === socket.id || p.nickname.toLowerCase() === nickname.toLowerCase());

    if (!existingPlayer && room.players.length >= room.capacity.max) {
      const err = { success: false, error: `Room is full (max ${room.capacity.max} players).` };
      if (typeof callback === 'function') callback(err);
      return;
    }

    if (!existingPlayer) {
      room.players.push({
        socketId: socket.id,
        nickname,
        isHost: false,
        isReady: false,
        joinedAt: new Date().toISOString()
      });
    }

    socket.join(code);
    console.log(`[Rooms] Player ${nickname} joined room ${code}. Total players: ${room.players.length}`);

    // M9-05: System message — player joined
    if (!existingPlayer) {
      broadcastSystemMessage(io, code, `${nickname} joined the room`);
    }

    const res = { success: true, roomCode: code, room };
    if (typeof callback === 'function') callback(res);
    io.to(code).emit('room:state', room);
  });

  // Handle room:get
  socket.on('room:get', ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
      return;
    }
    if (typeof callback === 'function') callback({ success: true, room });
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

    const res = { success: true, room };
    if (typeof callback === 'function') callback(res);
    io.to(code).emit('room:state', room);
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
    }
  });

  // Handle room:leave
  socket.on('room:leave', ({ roomCode, nickname }, callback) => {
    const code = roomCode?.toUpperCase()?.trim();
    const room = rooms.get(code);

    if (room) {
      room.players = room.players.filter(p => p.socketId !== socket.id && p.nickname !== nickname);
      socket.leave(code);

      if (room.players.length === 0) {
        stopWordScrambleGame(code);
        stopTriviaGame(code);
        stopTTTGame(code);
        stopUnoGame(code);
        stopFlappyGame(code);
        stopChessGame(code);
        stopEmojiGame(code);
        rooms.delete(code);
        console.log(`[Rooms] Deleted empty room ${code}`);
      } else {
        // M9-05: System message — player left
        broadcastSystemMessage(io, code, `${nickname} left the room`);
        // If host left, transfer host role to the next player
        if (room.hostSocketId === socket.id || room.hostNickname === nickname) {
          room.players[0].isHost = true;
          room.hostNickname = room.players[0].nickname;
          room.hostSocketId = room.players[0].socketId;
          console.log(`[Rooms] Transferred host in room ${code} to ${room.hostNickname}`);
        }
        handleTTTPlayerLeave(io, code, nickname);
        handleUnoPlayerLeave(io, code, nickname);
        handleFlappyPlayerLeave(io, code, nickname);
        handleChessPlayerLeave(io, code, nickname);
        handleEmojiPlayerLeave(io, code, nickname);
        io.to(code).emit('room:state', room);
      }
    }

    if (typeof callback === 'function') callback({ success: true });
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    for (const [code, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        const leavingPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        console.log(`[Rooms] Player ${leavingPlayer.nickname} disconnected from room ${code}`);

        if (room.players.length === 0) {
          stopWordScrambleGame(code);
          stopTriviaGame(code);
          stopTTTGame(code);
          stopUnoGame(code);
          stopFlappyGame(code);
          stopChessGame(code);
          stopEmojiGame(code);
          rooms.delete(code);
          console.log(`[Rooms] Deleted empty room ${code}`);
        } else {
          if (leavingPlayer.isHost) {
            room.players[0].isHost = true;
            room.hostNickname = room.players[0].nickname;
            room.hostSocketId = room.players[0].socketId;
            console.log(`[Rooms] Host disconnected; transferred host to ${room.hostNickname}`);
          }
          // M9-05: System message — player disconnected
          broadcastSystemMessage(io, code, `${leavingPlayer.nickname} disconnected`);
          handleTTTPlayerLeave(io, code, leavingPlayer.nickname);
          handleUnoPlayerLeave(io, code, leavingPlayer.nickname);
          handleFlappyPlayerLeave(io, code, leavingPlayer.nickname);
          handleChessPlayerLeave(io, code, leavingPlayer.nickname);
          handleEmojiPlayerLeave(io, code, leavingPlayer.nickname);
          io.to(code).emit('room:state', room);
        }
      }
    }
  });
}
