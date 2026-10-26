import { io } from 'socket.io-client';

// The Vite dev/preview servers run on their own port and proxy nothing, so in
// development the backend always lives on :4000 of the same host. When the SPA
// is served by the Express server itself (single-service deploys, tunnels,
// production) the API and websocket share the page origin instead.
const configuredServerUrl = import.meta.env.VITE_SERVER_URL?.trim();
const isLocalhostConfig = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(configuredServerUrl || '');

// In the browser:
// 1. Vite dev proxies /api and /socket.io to :4000 on the host machine.
// 2. Express single-service serves the SPA and the backend from the same port.
// 3. Port-forwarded tunnels (VS Code tunnels, Codespaces, ngrok, LAN IPs) must use
//    the page's same-origin so requests route through the tunnel instead of trying
//    to connect to the remote device's own localhost.
// A remote non-localhost VITE_SERVER_URL (e.g. split Vercel + Render deploy) still wins.
const isHttpPage =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'http:' || window.location.protocol === 'https:');
const sameOrigin = isHttpPage ? window.location.origin : null;

const devServerUrl = typeof window !== 'undefined' && window.location.hostname
  ? `http://${window.location.hostname}:4000`
  : 'http://localhost:4000';

const hasExternalRemoteServer = Boolean(configuredServerUrl && !isLocalhostConfig);

export const SERVER_URL = hasExternalRemoteServer
  ? configuredServerUrl
  : sameOrigin || devServerUrl;

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
