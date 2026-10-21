import { io } from 'socket.io-client';

// The Vite dev/preview servers run on their own port and proxy nothing, so in
// development the backend always lives on :4000 of the same host. When the SPA
// is served by the Express server itself (single-service deploys, tunnels,
// production) the API and websocket share the page origin instead.
const VITE_PORTS = new Set(['5173', '4173']);
const isViteDevServer = typeof window !== 'undefined' && VITE_PORTS.has(window.location.port);
const devServerUrl = typeof window !== 'undefined' && window.location.hostname
  ? `http://${window.location.hostname}:4000`
  : 'http://localhost:4000';
const sameOrigin = typeof window !== 'undefined' && window.location.port && !isViteDevServer
  ? window.location.origin
  : null;

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || sameOrigin || devServerUrl;

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
