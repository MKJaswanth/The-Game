/**
 * M11 UNO engine smoke test — simulates 2 players over Socket.IO.
 * Run: node test-uno.mjs (from this directory)
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client(nick) {
  const s = io(URL, { transports: ['websocket'] });
  s.nick = nick;
  return s;
}

const emit = (socket, ev, payload) =>
  new Promise((resolve) => socket.emit(ev, payload, (res) => resolve(res)));

const A = client('Alice');
const B = client('Bob');

// Live state per player from uno:session
const state = {};
[A, B].forEach((s) =>
  s.on('uno:session', (g) => { state[s.nick] = g; })
);

let failures = 0;
const ok = (cond, msg) => {
  console.log(cond ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!cond) failures++;
};

try {
  // 1) Create UNO room
  const created = await emit(A, 'room:create', { gameType: 'uno', nickname: 'Alice' });
  ok(created?.success, 'room:create succeeds');
  const roomCode = created.roomCode;

  // 2) Second player joins
  const joined = await emit(B, 'room:join', { roomCode, nickname: 'Bob' });
  ok(joined?.success, 'room:join succeeds');

  const endPromise = new Promise((resolve) => {
    A.once('uno:end', resolve);
    B.once('uno:end', resolve);
  });

  // 3) Start game (host)
  await emit(A, 'room:start', { roomCode });
  await wait(400);

  const sA = state.Alice, sB = state.Bob;
  ok(sA && Array.isArray(sA.yourHand) && sA.yourHand.length === 7, 'Alice dealt 7 cards');
  ok(sB && Array.isArray(sB.yourHand) && sB.yourHand.length === 7, 'Bob dealt 7 cards');
  ok(sA && sB && sA.yourHand !== sB.yourHand, 'hands are private per player');
  ok(sA?.players.length === 2, 'room has 2 seats');
  ok(sA?.topCard && sA.topCard.type === 'number', `top card is a number (${sA.topCard.color} ${sA.topCard.value})`);
  ok(sA.isYourTurn !== sB.isYourTurn, 'exactly one player has the turn');

  // 4) Out-of-turn play rejected
  const notTurnSock = sA.isYourTurn ? B : A;
  const notTurnState = sA.isYourTurn ? sB : sA;
  let r = await emit(notTurnSock, 'uno:play', { roomCode, cardId: notTurnState.yourHand[0].id });
  ok(r && !r.success && /turn/i.test(r.error || ''), `out-of-turn play rejected (${r?.error})`);

  // 5) Full game loop — event driven, state updated by uno:session listeners
  let guard = 0;
  while (guard++ < 500) {
    const s1 = state.Alice, s2 = state.Bob;
    if (!s1 || !s2) { await wait(80); continue; }
    if (s1.status === 'finished' || s2.status === 'finished') break;

    const sock = s1.isYourTurn ? A : B;
    const s = s1.isYourTurn ? s1 : s2;
    if (!s.isYourTurn) { await wait(80); continue; }

    const playable = s.playableIds || [];
    if (playable.length > 0) {
      const card = (s.yourHand || []).find((c) => c.id === playable[0]);
      const payload = { roomCode, cardId: card.id };
      if (card.color === 'wild') payload.chosenColor = 'red';
      r = await emit(sock, 'uno:play', payload);
      if (!r?.success) { console.log('play stopped:', r?.error); break; }
    } else {
      r = await emit(sock, 'uno:draw', { roomCode });
      if (!r?.success) { console.log('draw stopped:', r?.error); break; }
    }
    await wait(30);
  }

  const endPayload = await Promise.race([endPromise, wait(2000)]);
  const s1 = state.Alice, s2 = state.Bob;
  const finalWinner = (s1?.status === 'finished' && s1.winner) || (s2?.status === 'finished' && s2.winner);
  ok(finalWinner && ['Alice', 'Bob'].includes(finalWinner), `game ended with winner (${finalWinner})`);
  ok(endPayload && ['Alice', 'Bob'].includes(endPayload.winner), 'uno:end broadcast received');
  ok(endPayload?.standings?.length === 2, 'standings include both players');

  // 6) Score persistence check
  const scoreRes = await fetch('http://localhost:4000/api/players/Alice');
  const scoreJson = await scoreRes.json();
  ok(scoreJson?.player?.gamesPlayed >= 1, 'Alice score persisted via /api/players');

  // 7) Rematch restarts the game
  const rem = await emit(A, 'uno:rematch', { roomCode });
  ok(rem?.success, 'rematch allowed after finish');
  await wait(600);
  ok(state.Alice && state.Alice.status === 'in_game' && (state.Alice.yourHand || []).length === 7, 'rematch dealt a fresh game');
} catch (err) {
  console.log('FATAL', err?.message || err);
  failures++;
}

A.close();
B.close();
await wait(500);
console.log(failures === 0 ? 'ALL TESTS PASSED' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
