/**
 * Reconnect / seat-resume test — two players over real Socket.IO.
 * Run: node test-reconnect.mjs (server on :4000, RECONNECT_GRACE_MS set low)
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The seat grace window is server config (RECONNECT_GRACE_MS, 45 s by default),
// so only a locally started server with a shortened window can be judged here.
const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(URL);

const await_ = async (fn, label, timeout = 4000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = fn();
    if (value) return value;
    await wait(40);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const emit = (socket, ev, payload) =>
  new Promise((resolve) => socket.emit(ev, payload, (res) => resolve(res)));

let failures = 0;
const ok = (cond, msg) => {
  console.log(cond ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!cond) failures++;
};

function connect(nick) {
  const s = io(URL, { transports: ['websocket'] });
  s.nick = nick;
  s.state = null;
  s.room = null;
  s.on('chess:state', (g) => { s.state = g; });
  s.on('room:state', (r) => { if (r?.code) s.room = r; });
  return s;
}

const A = connect('Alice');
let B = connect('Bob');
const C = connect('Mallory');

try {
  await await_(() => A.connected && B.connected && C.connected, 'connections');

  // --- create + join --------------------------------------------------------
  const created = await emit(A, 'room:create', { gameType: 'chess', nickname: 'Alice', maxPlayers: 2 });
  ok(created?.success, 'room created');
  const roomCode = created.roomCode;
  const aliceToken = created.token;
  ok(typeof aliceToken === 'string' && aliceToken.length > 8, 'creator receives a resume token');

  const joined = await emit(B, 'room:join', { roomCode, nickname: 'Bob' });
  ok(joined?.success, 'second player joined');
  const bobToken = joined.token;
  ok(typeof bobToken === 'string' && bobToken.length > 8, 'joiner receives their own token');
  ok(bobToken !== aliceToken, 'each player gets a distinct token');

  // Tokens are secrets: no broadcast may carry somebody else's.
  await await_(() => A.room && A.room.players?.length === 2, 'room:state for two players');
  ok(
    A.room.players.every((p) => p.token === undefined),
    'room broadcasts never expose resume tokens'
  );

  await emit(A, 'room:start', { roomCode });
  await await_(() => A.state?.status === 'in_game', 'live chess game');
  ok(A.state.players.w === 'Alice' && A.state.players.b === 'Bob', 'white and black seated');

  // --- the seat survives a dropped socket ----------------------------------
  B.close();
  const away = await await_(() => A.room?.players?.find((p) => p.nickname === 'Bob' && p.connected === false), 'Bob marked away');
  ok(Boolean(away), 'dropped player is marked disconnected, not removed');
  ok(A.room.players.length === 2, 'seat is held while absent');

  // --- a refreshed tab reclaims that seat with its token --------------------
  B = connect('Bob');
  await await_(() => B.connected, 'Bob reconnected on a new socket');
  const resumed = await emit(B, 'room:get', { roomCode, nickname: 'Bob', token: bobToken });
  ok(resumed?.success && resumed.resumed === true, 'room:get resumed the seat with the token');
  ok(resumed.token === bobToken, 'same seat token comes back');
  ok(resumed.room?.players?.length === 2, 'resumed view still lists both players');

  // What the Chess screen does on mount after a refresh.
  await emit(B, 'chess:get', { roomCode });
  await await_(() => B.state?.status === 'in_game', 'chess state after resume');
  ok(B.state?.fen === A.state?.fen, 'both clients agree on the board');

  const moveA = await emit(A, 'chess:move', { roomCode, from: 'e2', to: 'e4' });
  ok(moveA?.success, 'white can move after the reconnect');
  await wait(120);
  const moveB = await emit(B, 'chess:move', { roomCode, from: 'e7', to: 'e5' });
  ok(moveB?.success, 'resumed player can move their own pieces');

  // --- a stranger cannot steal a connected seat ----------------------------
  const stealNick = await emit(C, 'room:get', { roomCode, nickname: 'Alice' });
  ok(!stealNick?.resumed, 'nickname alone does not resume a connected seat');
  const stealToken = await emit(C, 'room:get', { roomCode, token: 'not-a-real-token' });
  ok(!stealToken?.resumed, 'a bogus token is rejected');
  const stealMove = await emit(C, 'chess:move', { roomCode, from: 'd7', to: 'd5' });
  ok(stealMove?.success === false, `stranger cannot move (${stealMove?.error})`);

  // --- grace expiry hands the seat back to the room ------------------------
  if (!isLocalOrigin) {
    console.log('SKIP unreturned player is removed once the grace window ends (needs a local server with RECONNECT_GRACE_MS)');
  } else {
    const second = await emit(A, 'room:create', { gameType: 'chess', nickname: 'Alice', maxPlayers: 2 });
    const code2 = second.roomCode;
    const D = connect('Dana');
    await await_(() => D.connected, 'fourth client');
    await emit(D, 'room:join', { roomCode: code2, nickname: 'Dana' });
    await emit(A, 'room:start', { roomCode: code2 });
    await await_(() => A.state?.roomCode === code2 && A.state.status === 'in_game', 'second live game');

    D.close();
    await wait(400);
    const expired = await await_(
      () => A.room?.code === code2 && A.room.players.length === 1,
      'seat released after the grace window',
      5000
    );
    ok(Boolean(expired), 'unreturned player is removed once the grace window ends');
  }

  console.log(failures === 0 ? '\nAll reconnect checks passed.' : `\n${failures} reconnect check(s) failed.`);
} catch (err) {
  failures += 1;
  console.error(`ERROR ${err.message}`);
} finally {
  A.close();
  B.close();
  C.close();
  await wait(150);
  process.exit(failures === 0 ? 0 : 1);
}
