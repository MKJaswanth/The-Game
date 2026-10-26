/**
 * Chess inactivity-clock smoke test.
 * Run against a server started with CHESS_TURN_MS=250, for example:
 *   CHESS_TURN_MS=250 node server/src/index.js
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const TURN_MS = Number(process.env.CHESS_TURN_MS || 0);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!TURN_MS || TURN_MS > 5000) {
  console.error('Set CHESS_TURN_MS to a value between 1 and 5000 for this smoke test.');
  process.exit(2);
}

const await_ = async (fn, label, timeout = Math.max(TURN_MS * 5, 2500)) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = fn();
    if (value) return value;
    await wait(25);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const emit = (socket, event, payload) => new Promise((resolve) => {
  socket.emit(event, payload, (response) => resolve(response));
});

const A = io(URL, { transports: ['websocket'] });
const B = io(URL, { transports: ['websocket'] });
A.state = null;
B.state = null;
A.on('chess:state', (state) => { A.state = state; });
B.on('chess:state', (state) => { B.state = state; });

let failures = 0;
const ok = (condition, message) => {
  console.log(condition ? `PASS ${message}` : `FAIL ${message}`);
  if (!condition) failures += 1;
};

try {
  await await_(() => A.connected && B.connected, 'socket connections');

  const created = await emit(A, 'room:create', { gameType: 'chess', nickname: 'ClockAlice', maxPlayers: 2 });
  ok(created?.success, 'clock test room created');
  const roomCode = created.roomCode;

  const joined = await emit(B, 'room:join', { roomCode, nickname: 'ClockBob' });
  ok(joined?.success, 'second clock-test player joined');

  const started = await emit(A, 'room:start', { roomCode });
  ok(started?.success, 'clock test game started');
  await await_(() => A.state?.status === 'in_game', 'live chess state');

  ok(A.state.turnEndsAt > Date.now(), 'server publishes a future turn deadline');
  await await_(() => A.state?.status === 'finished', 'timeout result');
  ok(A.state.result?.type === 'timeout', 'inactive turn ends by timeout');
  ok(A.state.result?.winner === 'ClockBob', 'opponent wins when white times out');
  ok(A.state.turnEndsAt === null, 'finished game clears the active deadline');

  console.log(failures === 0 ? '\nAll chess clock checks passed.' : `\n${failures} chess clock check(s) failed.`);
} catch (error) {
  failures += 1;
  console.error(`ERROR ${error?.message || error}`);
} finally {
  A.close();
  B.close();
  await wait(100);
  process.exit(failures === 0 ? 0 : 1);
}
