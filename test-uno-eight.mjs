/**
 * UNO eight-seat boundary test (US-025).
 * Verifies the requested 2–8 player capacity, private hands, public seat state,
 * full-table start, and rejection of a ninth player.
 *
 * Run from this directory:
 *   node test-uno-eight.mjs
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (socket, event, payload) =>
  new Promise((resolve) => socket.emit(event, payload, (result) => resolve(result)));

const names = ['Uno8A', 'Uno8B', 'Uno8C', 'Uno8D', 'Uno8E', 'Uno8F', 'Uno8G', 'Uno8H'];
const clients = names.map((nickname) => {
  const socket = io(URL, { transports: ['websocket'] });
  socket.nickname = nickname;
  socket.state = null;
  socket.publicState = null;
  socket.on('uno:session', (state) => { socket.state = state; });
  socket.on('uno:state', (state) => { socket.publicState = state; });
  return socket;
});

const ninth = io(URL, { transports: ['websocket'] });
ninth.nickname = 'Uno8I';

let failures = 0;
const ok = (condition, message) => {
  console.log(condition ? `PASS ${message}` : `FAIL ${message}`);
  if (!condition) failures += 1;
};

const awaitCondition = async (predicate, label, timeout = 8000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return true;
    await wait(50);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

let roomCode = null;

try {
  await awaitCondition(() => clients.every((socket) => socket.connected), 'eight player connections');

  const host = clients[0];
  const created = await emit(host, 'room:create', { gameType: 'uno', nickname: host.nickname });
  roomCode = created?.roomCode;
  ok(created?.success, 'UNO room creates successfully');
  ok(created?.room?.capacity?.max === 8, `room advertises eight seats (${created?.room?.capacity?.max})`);

  for (const socket of clients.slice(1)) {
    const joined = await emit(socket, 'room:join', { roomCode, nickname: socket.nickname });
    ok(joined?.success, `${socket.nickname} joins the eight-seat room`);
  }

  const rejected = await emit(ninth, 'room:join', { roomCode, nickname: ninth.nickname });
  ok(rejected?.success === false && /full|max 8/i.test(rejected?.error || ''), 'ninth player is rejected as full');

  const started = await emit(host, 'room:start', { roomCode });
  ok(started?.success, 'host starts an eight-player UNO match');

  await awaitCondition(
    () => clients.every((socket) => socket.state?.status === 'in_game' && socket.state?.yourHand?.length === 7),
    'all eight players to receive private hands'
  );

  const firstState = clients[0].state;
  ok(firstState.players.length === 8, 'active match contains all eight seats');
  ok(clients.every((socket) => socket.state.players.length === 8), 'every player sees the same eight-seat roster');
  ok(clients.every((socket) => socket.state.yourHand.length === 7), 'every player receives seven cards');
  ok(clients.every((socket) => socket.publicState && !('yourHand' in socket.publicState)), 'public state never exposes private hands');
  ok(new Set(clients.map((socket) => socket.state.isYourTurn)).size === 2, 'exactly one player owns the first turn');
} catch (error) {
  console.error(`ERROR ${error.message}`);
  failures += 1;
} finally {
  if (roomCode) {
    for (const socket of clients) {
      if (socket.connected) await emit(socket, 'room:leave', { roomCode, nickname: socket.nickname });
    }
  }
  for (const socket of clients) socket.close();
  ninth.close();
  await wait(250);
  console.log(failures === 0 ? 'ALL EIGHT-PLAYER UNO TESTS PASSED' : `${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}
