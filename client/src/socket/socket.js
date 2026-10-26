import { io } from 'socket.io-client';

// The Vite dev/preview servers run on their own port and proxy nothing, so in
// development the backend always lives on :4000 of the same host. When the SPA
// is served by the Express server itself (single-service deploys, tunnels,
// production) the API and websocket share the page origin instead.
const VITE_PORTS = new Set(['5173', '4173']);
const isViteDevServer = typeof window !== 'undefined' && VITE_PORTS.has(window.location.port);
const configuredServerUrl = import.meta.env.VITE_SERVER_URL?.trim();
const devServerUrl = typeof window !== 'undefined' && window.location.hostname
  ? `http://${window.location.hostname}:4000`
  : 'http://localhost:4000';
// Served by Express itself (single-service deploys, tunnels, production): the
// page origin already carries the API and the websocket. Note that HTTPS pages
// on the default port report an empty location.port, so a port check is wrong
// here — only the Vite dev/preview ports are a different origin.
const isHttpPage =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'http:' || window.location.protocol === 'https:');
const sameOrigin = isHttpPage ? window.location.origin : null;
const localBackendUrl = /^https?:\/\/(localhost|127\.0\.0\.1):4000\/?$/i.test(configuredServerUrl || '');
// Vite proxies `/api`, `/health`, and `/socket.io` to :4000. Prefer that
// same-origin path during local development so forwarding one port is enough;
// an explicitly configured remote backend still wins outside local Vite.
const useViteProxy = isViteDevServer && (!configuredServerUrl || localBackendUrl);

export const SERVER_URL = useViteProxy
  ? sameOrigin
  : configuredServerUrl || sameOrigin || devServerUrl;

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
