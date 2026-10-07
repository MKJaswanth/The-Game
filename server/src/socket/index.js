import { Server } from 'socket.io';
import { registerLobbyHandlers } from './lobby.js';
import { registerRoomHandlers } from './rooms.js';
import { registerWordScrambleHandlers } from './games/wordscramble.js';
import { registerTriviaHandlers } from './games/trivia.js';

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
    registerWordScrambleHandlers(ioInstance, socket);
    registerTriviaHandlers(ioInstance, socket);
  });

  return ioInstance;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return ioInstance;
}
