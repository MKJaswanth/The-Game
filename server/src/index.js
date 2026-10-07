import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocket } from './socket/index.js';
import { pingSupabase } from './db/supabase.js';
import scoresRouter from './routes/scores.js';
import leaderboardRouter from './routes/leaderboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
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

const server = http.createServer(app);
const io = initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} (0.0.0.0)`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://192.168.0.110:${PORT}`);
});
