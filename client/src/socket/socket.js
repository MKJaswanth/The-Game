import { io } from 'socket.io-client';

const defaultServerUrl = typeof window !== 'undefined' && window.location.hostname
  ? `http://${window.location.hostname}:4000`
  : 'http://localhost:4000';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || defaultServerUrl;

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log(`[Socket] Connected to server: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
  console.log(`[Socket] Disconnected from server: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.warn(`[Socket] Connection error: ${error.message}`);
});

export default socket;
