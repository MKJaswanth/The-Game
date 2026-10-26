/**
 * Room access-control smoke test.
 *
 * Covers the seat/chat holes found in the audit:
 *  - a connected stranger cannot give up another player's seat (which used to
 *    delete their room when it was the only seat),
 *  - a connected stranger cannot read a room's chat history,
 *  - a second socket cannot claim an already-seated callsign (that path used
 *    to return success plus the seated player's resume token),
 *  - a socket that creates a second room is removed from the first,
 *  - public room state does not ship internal routing data or the chat buffer.
 *
 * Run: node test-room-access.mjs (server must be listening on :4000)
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
  return socket;
}

let failures = 0;
const ok = (condition, message) => {
  console.log(condition ? `PASS ${message}` : `FAIL ${message}`);
  if (!condition) failures += 1;
};

const A = client('SeatHost');
const B = client('SeatGuest');
const OUT = client('Bystander');
const C = client('Imposter');

try {
  await await_(
    () => A.connected && B.connected && OUT.connected && C.connected,
    'socket connections'
  );

  // --- create the room -----------------------------------------------------
  const created = await emit(A, 'room:create', {
    gameType: 'trivia',
    nickname: 'SeatHost',
    maxPlayers: 4
  });
  ok(created?.success, 'room:create succeeds');
  const roomCode = created?.roomCode;
  ok(
    created?.room?.hostSocketId === undefined && created?.room?.messages === undefined,
    'public room state hides internal socket id and chat buffer'
  );

  // --- a stranger cannot kick the host -------------------------------------
  await emit(B, 'room:leave', { roomCode, nickname: 'SeatHost' });
  await wait(250);
  const afterKick = await emit(OUT, 'room:get', { roomCode, nickname: 'Bystander' });
  ok(afterKick?.success, 'room still exists after a stranger sends room:leave');
  ok(
    (afterKick?.room?.players || []).some((p) => p.nickname === 'SeatHost'),
    'the seated host was not removed by the stranger'
  );

  // --- history is for seated players only ----------------------------------
  await emit(A, 'chat:message', { roomCode, message: 'secret strategy' });
  const outsiderHistory = await emit(OUT, 'chat:history', { roomCode });
  ok(outsiderHistory?.success === false, 'a non-member is refused chat history');

  // --- duplicate callsigns cannot share or steal a seat --------------------
  const duplicate = await emit(C, 'room:join', { roomCode, nickname: 'SeatHost' });
  ok(duplicate?.success === false, 'a second socket is refused an already-seated callsign');
  ok(duplicate?.token === undefined, 'the refused join does not leak the resume token');

  // --- a real member can read history --------------------------------------
  const joined = await emit(B, 'room:join', { roomCode, nickname: 'SeatGuest' });
  ok(joined?.success, 'a new callsign joins normally');
  const memberHistory = await emit(B, 'chat:history', { roomCode });
  ok(memberHistory?.success === true, 'a seated player can read chat history');
  ok(
    (memberHistory?.messages || []).some((m) => m.text === 'secret strategy'),
    'the seated player sees the earlier message'
  );

  // --- a new room drops the old seat ---------------------------------------
  const second = await emit(A, 'room:create', {
    gameType: 'trivia',
    nickname: 'SeatHost',
    maxPlayers: 4
  });
  ok(second?.success && second?.roomCode !== roomCode, 'the host can create a second room');
  const oldRoom = await emit(B, 'room:get', { roomCode, nickname: 'SeatGuest' });
  ok(
    oldRoom?.success &&
      (oldRoom.room.players || []).every((p) => p.nickname !== 'SeatHost'),
    'creating another room removed the old seat'
  );

  // Clean up the second room explicitly; the first now belongs to SeatGuest.
  await emit(A, 'room:leave', { roomCode: second?.roomCode });
  await emit(B, 'room:leave', { roomCode });
} catch (err) {
  failures += 1;
  console.error(`FAIL ${err.message}`);
} finally {
  A.disconnect();
  B.disconnect();
  OUT.disconnect();
  C.disconnect();
}

console.log(failures === 0 ? '\nAll room access checks passed.' : `\n${failures} room access check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
