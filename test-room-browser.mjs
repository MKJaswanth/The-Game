/**
 * Open-room browser smoke test.
 * Run: node test-room-browser.mjs (server must be listening on :4000)
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (socket, event, payload) =>
  new Promise((resolve) => socket.emit(event, payload, (response) => resolve(response)));

const await_ = async (fn, label, timeout = 5000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = fn();
    if (value) return value;
    await wait(40);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

function client(nickname) {
  const socket = io(URL, { transports: ['websocket'] });
  socket.nickname = nickname;
  socket.openRooms = [];
  socket.on('rooms:update', (data) => {
    socket.openRooms = Array.isArray(data) ? data : (data?.rooms || []);
  });
  return socket;
}

let failures = 0;
const ok = (condition, message) => {
  console.log(condition ? `PASS ${message}` : `FAIL ${message}`);
  if (!condition) failures += 1;
};

const A = client('RoomHost');
const B = client('RoomGuest');

try {
  await await_(() => A.connected && B.connected, 'socket connections');

  const created = await emit(A, 'room:create', {
    gameType: 'trivia',
    nickname: A.nickname,
    maxPlayers: 2
  });
  ok(created?.success, 'room:create succeeds');
  const roomCode = created?.roomCode;

  await await_(() => (
    A.openRooms.some((room) => room.code === roomCode) &&
    B.openRooms.some((room) => room.code === roomCode)
  ), 'new room appears for every hub client');

  const listed = B.openRooms.find((room) => room.code === roomCode);
  ok(listed?.gameType === 'trivia', 'open-room listing includes the game type');
  ok(listed?.hostNickname === A.nickname, 'open-room listing includes the host');
  ok(listed?.currentPlayers === 1 && listed?.maxPlayers === 2, 'open-room listing includes capacity');

  const joined = await emit(B, 'room:join', { roomCode, nickname: B.nickname });
  ok(joined?.success, 'listed room can be joined through the normal room:join path');

  await await_(() => !A.openRooms.some((room) => room.code === roomCode), 'full room disappears from open rooms');
  ok(!B.openRooms.some((room) => room.code === roomCode), 'joining client also receives the refreshed list');

  const started = await emit(A, 'room:start', { roomCode });
  ok(started?.success, 'host can still start the joined room');
  await wait(120);
  ok(!A.openRooms.some((room) => room.code === roomCode), 'started room remains hidden from the open-room list');

  console.log(failures === 0 ? '\nAll open-room checks passed.' : `\n${failures} open-room check(s) failed.`);
} catch (error) {
  failures += 1;
  console.error(`ERROR ${error?.message || error}`);
} finally {
  A.close();
  B.close();
  await wait(150);
  process.exit(failures === 0 ? 0 : 1);
}
