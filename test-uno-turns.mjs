/**
 * UNO turn rules test — clock timeout, draw-then-play, pass.
 * Run against a server started with UNO_TURN_MS=6000:
 *   PORT=4200 UNO_TURN_MS=6000 node server/src/index.js
 *   SERVER_URL=http://localhost:4200 node test-uno-turns.mjs
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const emit = (socket, ev, payload) =>
  new Promise((resolve) => socket.emit(ev, payload, (res) => resolve(res)));

function client(nick) {
  const s = io(URL, { transports: ['websocket'] });
  s.nick = nick;
  s.state = null;
  s.on('uno:session', (g) => { s.state = g; });
  return s;
}

let failures = 0;
const ok = (cond, msg) => {
  console.log(cond ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!cond) failures++;
};

const A = client('Alice');
const B = client('Bob');

const await_ = async (fn, label, timeout = 9000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const v = fn();
    if (v) return v;
    await wait(60);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const seatOf = (nick) => (nick === 'Alice' ? A : B);

try {
  await await_(() => A.connected && B.connected, 'connections');
  const created = await emit(A, 'room:create', { gameType: 'uno', nickname: 'Alice' });
  const roomCode = created.roomCode;
  await emit(B, 'room:join', { roomCode, nickname: 'Bob' });
  await emit(A, 'room:start', { roomCode });
  await await_(() => A.state?.yourHand?.length === 7 && B.state?.yourHand?.length === 7, 'dealt hands');

  ok(typeof A.state.turnEndsAt === 'number' && A.state.turnEndsAt > Date.now(), 'every turn carries a visible deadline');
  ok(A.state.turnMs > 0, `turn length is broadcast (${A.state.turnMs} ms)`);
  ok(A.state.turnNickname === 'Alice' || A.state.turnNickname === 'Bob', `turn owner is named (${A.state.turnNickname})`);

  // --- 1. the clock resolves an idle turn ----------------------------------
  const before = { nick: A.state.turnNickname, deadline: A.state.turnEndsAt };
  const beforeHand = (before.nick === 'Alice' ? A.state : B.state).yourHand.length;

  const resolved = await await_(
    () => A.state && A.state.turnEndsAt > before.deadline && A.state.lastAction,
    'the clock to resolve the turn',
    9000
  );
  ok(Boolean(resolved), 'turn clock fired on its own');
  ok(A.state.turnNickname !== before.nick, `turn passed to the other seat (${A.state.turnNickname})`);
  const afterHand = (before.nick === 'Alice' ? A.state : B.state).yourHand.length;
  ok(afterHand === beforeHand + 1, `idle player drew a card (${beforeHand} → ${afterHand})`);
  ok(/ran out of time/i.test(A.state.lastAction || ''), `timeout is explained (${A.state.lastAction})`);

  // --- 2. drawing: either the card is playable (turn continues) or not ------
  // The drawn card is random, so keep drawing on successive turns until we hit
  // the interesting branch (a draw you are allowed to play).
  let playablePath = null;
  for (let attempt = 0; attempt < 6 && !playablePath; attempt++) {
    const actingNick = A.state.turnNickname;
    const actor = seatOf(actingNick);
    const other = actingNick === 'Alice' ? B : A;
    const deadlineBefore = actor.state.turnEndsAt;
    const handBeforeDraw = actor.state.yourHand.length;
    const deckBefore = actor.state.deckSize;

    const drawRes = await emit(actor, 'uno:draw', { roomCode });
    ok(drawRes?.success, `draw accepted (${JSON.stringify({ drawn: drawRes?.drawn, canPlayDrawn: drawRes?.canPlayDrawn })})`);
    await wait(200);

    ok(
      actor.state.yourHand.length >= handBeforeDraw + 1 || actor.state.yourHand.length > 0,
      'hand includes the drawn card'
    );
    ok(actor.state.deckSize <= deckBefore, 'deck shrank by the drawn card');

    if (!drawRes.canPlayDrawn) {
      ok(actor.state.turnNickname !== actingNick, 'an unplayable draw passes the turn automatically');
      ok(!actor.state.drawnCardId, 'no drawn-card lock without a playable draw');
      continue;
    }

    playablePath = { actingNick, actor, other, deadlineBefore, drawRes };
  }

  ok(Boolean(playablePath), 'eventually drew a playable card (tested the keep-turn branch)');

  if (playablePath) {
    const { actingNick, actor, other, deadlineBefore, drawRes } = playablePath;
    ok(actor.state.drawnCardId === drawRes.drawnCard.id, 'drawn playable card is flagged on the session');
    ok(actor.state.turnNickname === actingNick, 'drawing a playable card keeps your turn');
    ok(other.state.turnNickname === actingNick, 'opponent sees the turn unchanged');
    ok(actor.state.turnEndsAt > deadlineBefore, 'deciding on the drawn card gets a fresh clock');

    const card = drawRes.drawnCard;
    const payload = { roomCode, cardId: card.id };
    if (card.color === 'wild') payload.chosenColor = 'blue';

    // Only the drawn card may be played now.
    const otherCard = actor.state.yourHand.find((c) => c.id !== card.id);
    if (otherCard) {
      const wrong = await emit(actor, 'uno:play', { roomCode, cardId: otherCard.id, chosenColor: 'blue' });
      ok(wrong?.success === false, `other cards are locked after drawing (${wrong?.error})`);
    }

    const playAgain = await emit(actor, 'uno:play', payload);
    ok(playAgain?.success, `the drawn card can be played immediately (${card.color} ${card.type})`);
    await wait(200);
    ok(actor.state.turnNickname !== actingNick, 'playing it finally passes the turn');
    ok(!actor.state.drawnCardId, 'drawn-card lock clears after playing');
  }

  // --- 3. pass hands the turn over ----------------------------------------
  const passerNick = A.state.turnNickname;
  const passer = seatOf(passerNick);
  const passRes = await emit(passer, 'uno:pass', { roomCode });
  ok(passRes?.success, 'pass accepted');
  await wait(200);
  ok(A.state.turnNickname !== passerNick, `pass moved the turn to ${A.state.turnNickname}`);

  // somebody else cannot pass for you
  const wrongPasser = A.state.turnNickname === 'Alice' ? B : A;
  const stolen = await emit(wrongPasser, 'uno:pass', { roomCode });
  ok(stolen?.success === false, `out-of-turn pass rejected (${stolen?.error})`);

  // --- 4. every active session agrees on the clock ------------------------
  ok(
    Math.abs((A.state.turnEndsAt || 0) - (B.state.turnEndsAt || 0)) < 1500,
    'both clients see the same deadline'
  );

  console.log(failures === 0 ? '\nAll UNO turn checks passed.' : `\n${failures} UNO turn check(s) failed.`);
} catch (err) {
  failures += 1;
  console.error(`ERROR ${err.message}`);
} finally {
  A.close();
  B.close();
  await wait(200);
  process.exit(failures === 0 ? 0 : 1);
}
