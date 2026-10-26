/** Drawing & Guessing socket smoke test (US-032 / US-033). */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const client = (nickname) => {
  const socket = io(URL, { transports: ['websocket'] });
  socket.nickname = nickname;
  socket.state = null;
  socket.word = null;
  socket.on('drawing:state', (state) => { socket.state = state; });
  socket.on('drawing:word', (word) => { socket.word = word; });
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

const A = client('DrawerA');
const B = client('GuesserB');
let failures = 0;
const ok = (condition, message) => { console.log(condition ? `PASS ${message}` : `FAIL ${message}`); if (!condition) failures += 1; };
let roomCode;

try {
  await await_(() => A.connected && B.connected, 'connections');
  const created = await emit(A, 'room:create', { gameType: 'drawing', nickname: A.nickname });
  roomCode = created.roomCode;
  ok(created.success && created.room.capacity.max === 8, 'drawing room supports up to 8 players');
  ok((await emit(B, 'room:join', { roomCode, nickname: B.nickname })).success, 'second player joins');
  ok((await emit(A, 'room:start', { roomCode })).success, 'host starts drawing game');
  await await_(() => A.state?.phase === 'drawing' && B.state?.phase === 'drawing' && A.word?.word, 'drawing round');
  ok(A.state.drawer === A.nickname, 'drawer seat is assigned');
  ok(Boolean(A.word.word), 'secret word is delivered to drawer');
  ok(B.word === null, 'secret word is not delivered to guesser');

  const stroke = { from: { x: 0.1, y: 0.1 }, to: { x: 0.3, y: 0.3 }, color: '#ffffff', size: 8, tool: 'brush' };
  ok((await emit(A, 'drawing:stroke', { roomCode, stroke })).success, 'drawer can submit a stroke');
  const blockedStroke = await emit(B, 'drawing:stroke', { roomCode, stroke });
  ok(blockedStroke.success === false, 'guesser cannot draw');
  const blockedGuess = await emit(A, 'drawing:guess', { roomCode, guess: A.word.word });
  ok(blockedGuess.success === false, 'drawer cannot guess own word');
  const correct = await emit(B, 'drawing:guess', { roomCode, guess: A.word.word });
  ok(correct.success && correct.correct, 'correct guess is accepted');
  await await_(() => A.state?.phase === 'reveal', 'reveal phase');
  ok(A.state.roundWinner === B.nickname, 'guessing player wins the round');
} catch (error) {
  console.error(`ERROR ${error.message}`);
  failures += 1;
} finally {
  if (roomCode) {
    await emit(A, 'room:leave', { roomCode, nickname: A.nickname });
    await emit(B, 'room:leave', { roomCode, nickname: B.nickname });
  }
  A.close(); B.close(); await wait(200);
  console.log(failures === 0 ? 'ALL DRAWING TESTS PASSED' : `${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}
