/**
 * Chess sparring bot — joins a room and answers with book moves.
 * Usage: node chess-bot.mjs <ROOMCODE> [nickname]
 * Handy for exercising the client UI without a second human.
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const roomCode = (process.argv[2] || '').toUpperCase();
const nick = process.argv[3] || 'BookBot';

if (!roomCode) {
  console.error('Usage: node chess-bot.mjs <ROOMCODE> [nickname]');
  process.exit(1);
}

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Opening book keyed by the opponent's SAN history length.
const BOOK = {
  0: ['e2e4', 'd2d4'],
  1: ['e7e5', 'c7c5'],
  2: ['g1f3', 'b1c3'],
  3: ['b8c6', 'g8f6'],
  4: ['f1c4', 'f1b5'],
  5: ['f8c5', 'f8b4'],
};

const socket = io(URL, { transports: ['websocket'] });
socket.on('connect', () => console.log(`[bot] connected as ${nick}`));

socket.emit('room:join', { roomCode, nickname: nick }, (res) => {
  if (!res?.success) {
    console.error(`[bot] join failed: ${res?.error}`);
    process.exit(1);
  }
  console.log(`[bot] joined ${roomCode}`);
});

let busy = false;

socket.on('chess:state', async (state) => {
  if (state.roomCode !== roomCode) return;

  if (state.status === 'finished') {
    console.log(`[bot] game over: ${state.result?.type} — winner ${state.result?.winner ?? 'draw'}`);
    console.log(`[bot] final moves: ${state.history.join(' ')}`);
    socket.close();
    process.exit(0);
  }

  const myColor = state.players.w === nick ? 'w' : state.players.b === nick ? 'b' : null;
  if (!myColor || state.turn !== myColor || busy) return;

  busy = true;
  await wait(700);

  const ply = state.history.length;
  const bookMoves = BOOK[ply] || [];
  const legal = Object.entries(state.legalMoves || {}).flatMap(([from, targets]) =>
    targets.map((t) => `${from}${t.to}${t.promotion || ''}`)
  );
  const pick = bookMoves.find((m) => legal.includes(m)) || legal[Math.floor(Math.random() * legal.length)];

  if (!pick) {
    console.warn('[bot] no legal move available');
    busy = false;
    return;
  }

  const from = pick.slice(0, 2);
  const to = pick.slice(2, 4);
  const promotion = pick.slice(4) || undefined;

  socket.emit('chess:move', { roomCode, from, to, promotion }, (res) => {
    busy = false;
    console.log(res?.success ? `[bot] plays ${from}-${to}` : `[bot] rejected: ${res?.error}`);
  });
});

socket.on('disconnect', () => console.log('[bot] disconnected'));
setTimeout(() => {
  console.log('[bot] timed out');
  process.exit(0);
}, 180000);
