import { Server } from 'socket.io';
import { registerLobbyHandlers } from './lobby.js';
import { registerRoomHandlers } from './rooms.js';
import { registerChatHandlers } from './chat.js';
import { registerWordScrambleHandlers } from './games/wordscramble.js';
import { registerTriviaHandlers } from './games/trivia.js';
import { registerTTTHandlers } from './games/tictactoe.js';
import { registerUnoHandlers } from './games/uno.js';
import { registerFlappyHandlers } from './games/flappy.js';
import { registerChessHandlers } from './games/chess.js';
import { registerEmojiHandlers } from './games/emoji.js';
import { registerDrawingHandlers } from './games/drawing.js';
import { registerLudoHandlers } from './games/ludo.js';

let ioInstance = null;

export function initSocket(httpServer) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  ioInstance = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Register handlers
    registerLobbyHandlers(ioInstance, socket);
    registerRoomHandlers(ioInstance, socket);
    registerChatHandlers(ioInstance, socket);
    registerWordScrambleHandlers(ioInstance, socket);
    registerTriviaHandlers(ioInstance, socket);
    registerTTTHandlers(ioInstance, socket);
    registerUnoHandlers(ioInstance, socket);
    registerFlappyHandlers(ioInstance, socket);
    registerChessHandlers(ioInstance, socket);
    registerEmojiHandlers(ioInstance, socket);
    registerDrawingHandlers(ioInstance, socket);
    registerLudoHandlers(ioInstance, socket);
  });

  return ioInstance;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return ioInstance;
}
