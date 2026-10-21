import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocket } from './socket/index.js';
import { pingSupabase } from './db/supabase.js';
import scoresRouter from './routes/scores.js';
import leaderboardRouter from './routes/leaderboard.js';
import playersRouter from './routes/players.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Single-service mode: if the client has been built, the API server also serves
// the SPA. That keeps one origin for HTTP + websockets in production and makes
// the app deployable as a single web service (Render/Railway/VPS).
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
const serveClient = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

// Deterministic local dev port: if PORT is unset, empty, or 0 (e.g. outer env override),
// fall back to 4000 so the backend is reachable at a known port.
let rawPort = process.env.PORT;
if (rawPort == null || String(rawPort).trim() === '' || Number(rawPort) === 0) {
  rawPort = '4000';
}
process.env.PORT = String(rawPort).trim();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from localhost, 127.0.0.1, or local LAN IP (192.168.x.x)
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/db', async (req, res) => {
  const result = await pingSupabase();
  res.status(result.ok ? 200 : 200).json(result);
});

app.use('/api/scores', scoresRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/players', playersRouter);

// Static client (production). Assets are immutable-hashed, so cache them; the
// SPA fallback keeps deep links like /room/ABC123 working on refresh.
if (serveClient) {
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1y', immutable: true }));
  app.get(/^\/(?!api\/|socket\.io|health).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

const server = http.createServer(app);
const io = initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} (0.0.0.0)`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://192.168.0.110:${PORT}`);
  console.log(
    serveClient
      ? `Serving built client from ${CLIENT_DIST} (single-service mode)`
      : 'Client build not found — run `npm run build` in client/ to serve the SPA from this server'
  );
});
