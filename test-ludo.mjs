/** Ludo socket smoke test (US-034 / US-035). */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const client = (nickname) => {
  const socket = io(URL, { transports: ['websocket'] });
  socket.nickname = nickname;
  socket.state = null;
  socket.on('ludo:state', (state) => { socket.state = state; });
  return socket;
};
const await_ = async (predicate, label, timeout = 8000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return;
    await wait(50);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const A = client('LudoA');
const B = client('LudoB');
let failures = 0;
const ok = (condition, message) => { console.log(condition ? `PASS ${message}` : `FAIL ${message}`); if (!condition) failures += 1; };
let roomCode;

try {
  await await_(() => A.connected && B.connected, 'connections');
  const created = await emit(A, 'room:create', { gameType: 'ludo', nickname: A.nickname });
  roomCode = created.roomCode;
  ok(created.success && created.room.capacity.max === 4, 'Ludo room supports up to 4 players');
  ok((await emit(B, 'room:join', { roomCode, nickname: B.nickname })).success, 'second player joins');
  ok((await emit(A, 'room:start', { roomCode })).success, 'host starts Ludo');
  await await_(() => A.state?.status === 'in_game' && A.state?.players?.length === 2, 'Ludo state');
  ok(A.state.phase === 'roll', 'match begins in roll phase');
  ok(A.state.players[0].tokens.every((token) => token === -1), 'all tokens start in base');

  const wrong = await emit(B, 'ludo:roll', { roomCode });
  ok(wrong.success === false, 'out-of-turn roll is rejected');
  const rolled = await emit(A, 'ludo:roll', { roomCode });
  ok(rolled.success && rolled.dice >= 1 && rolled.dice <= 6, 'server generates a valid die result');
  await wait(100);
  if (A.state.phase === 'move') {
    const legal = A.state.players[0].legalTokenIds;
    ok(legal.length > 0, 'legal token list is advertised after a movable roll');
    ok((await emit(A, 'ludo:move', { roomCode, tokenIndex: legal[0] })).success, 'legal token move is accepted');
  } else {
    ok(A.state.phase === 'roll', 'no-move roll advances back to roll phase');
  }
} catch (error) {
  console.error(`ERROR ${error.message}`);
  failures += 1;
} finally {
  if (roomCode) {
    await emit(A, 'room:leave', { roomCode, nickname: A.nickname });
    await emit(B, 'room:leave', { roomCode, nickname: B.nickname });
  }
  A.close(); B.close(); await wait(200);
  console.log(failures === 0 ? 'ALL LUDO TESTS PASSED' : `${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}
