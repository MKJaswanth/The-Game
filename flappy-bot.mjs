/**
 * Flappy Race autopilot peer for browser testing.
 * Usage: node flappy-bot.mjs <ROOMCODE> [nickname]
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const roomCode = (process.argv[2] || '').toUpperCase();
const nick = process.argv[3] || 'CardBot';
const URL = 'http://localhost:4000';

const BIRD_X = 110;
const PIPE_W = 62;
const BIRD_R = 12;

const emit = (socket, ev, payload) =>
  new Promise((resolve) => socket.emit(ev, payload, (res) => resolve(res)));

const s = io(URL, { transports: ['websocket'] });
let latest = null;

s.on('connect', async () => {
  console.log(`[BOT] connected, joining ${roomCode}`);
  const res = await emit(s, 'room:join', { roomCode, nickname: nick });
  console.log('[BOT] join:', res?.success ? 'ok' : res?.error);
});

s.on('flappy:state', (st) => {
  latest = st;
});

s.on('flappy:end', (p) => {
  console.log(`[BOT] race over — winner ${p.winner}; my score ${p.standings?.find((x) => x.nickname === nick)?.score}`);
});

setInterval(() => {
  if (!latest || latest.status !== 'racing') return;
  const me = latest.birds.find((b) => b.nickname === nick);
  if (!me || !me.alive) return;
  const next = latest.pipes
    .filter((p) => p.x + PIPE_W > BIRD_X - BIRD_R)
    .sort((a, b) => a.x - b.x)[0];
  const target = next ? next.gapY + next.gapH / 2 : 280;
  if (me.y > target - 6) s.emit('flappy:flap', { roomCode }, () => {});
}, 25);

process.on('SIGINT', () => {
  s.disconnect();
  process.exit(0);
});
