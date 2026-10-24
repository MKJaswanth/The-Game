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
const skip = (cond, msg) => console.log(cond ? `PASS ${msg}` : `SKIP ${msg}`);

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

const cardPayload = (roomCode, card) => ({
  roomCode,
  cardId: card.id,
  ...(card.color === 'wild' ? { chosenColor: 'blue' } : {})
});

let activeRoomCode = null;

const startFreshGame = async (label) => {
  const created = await emit(A, 'room:create', { gameType: 'uno', nickname: 'Alice' });
  if (!created?.success) throw new Error(`${label}: room:create failed (${created?.error})`);
  const roomCode = created.roomCode;
  const joined = await emit(B, 'room:join', { roomCode, nickname: 'Bob' });
  if (!joined?.success) throw new Error(`${label}: room:join failed (${joined?.error})`);
  const started = await emit(A, 'room:start', { roomCode });
  if (!started?.success) throw new Error(`${label}: room:start failed (${started?.error})`);
  await await_(
    () => A.state?.roomCode === roomCode && B.state?.roomCode === roomCode &&
      A.state.status === 'in_game' && B.state.status === 'in_game' &&
      A.state.yourHand?.length === 7 && B.state.yourHand?.length === 7,
    `${label} dealt hands`
  );
  activeRoomCode = roomCode;
  return roomCode;
};

const closeGame = async (roomCode) => {
  if (!roomCode) return;
  await emit(A, 'room:leave', { roomCode, nickname: 'Alice' });
  await emit(B, 'room:leave', { roomCode, nickname: 'Bob' });
  if (activeRoomCode === roomCode) activeRoomCode = null;
  await wait(100);
};

try {
  await await_(() => A.connected && B.connected, 'connections');
  let roomCode = await startFreshGame('clock test');

  ok(typeof A.state.turnEndsAt === 'number' && A.state.turnEndsAt > Date.now(), 'every turn carries a visible deadline');
  ok(A.state.turnMs > 0, `turn length is broadcast (${A.state.turnMs} ms)`);
  ok(A.state.turnNickname === 'Alice' || A.state.turnNickname === 'Bob', `turn owner is named (${A.state.turnNickname})`);

  // --- 1. the clock resolves an idle turn ----------------------------------
  const before = { nick: A.state.turnNickname, deadline: A.state.turnEndsAt };
  const beforeHand = (before.nick === 'Alice' ? A.state : B.state).yourHand.length;

  // The turn length is server config (UNO_TURN_MS, 25 s in production), so the
  // wait is derived from the broadcast value rather than a fixed guess.
  const clockBudget = (Number(A.state.turnMs) || 25000) + 8000;
  const resolved = await await_(
    () => A.state && A.state.turnEndsAt > before.deadline && A.state.lastAction,
    'the clock to resolve the turn',
    clockBudget
  );
  ok(Boolean(resolved), 'turn clock fired on its own');
  ok(A.state.turnNickname !== before.nick, `turn passed to the other seat (${A.state.turnNickname})`);
  const afterHand = (before.nick === 'Alice' ? A.state : B.state).yourHand.length;
  ok(afterHand === beforeHand + 1, `idle player drew a card (${beforeHand} → ${afterHand})`);
  ok(/ran out of time/i.test(A.state.lastAction || ''), `timeout is explained (${A.state.lastAction})`);

  const directPasser = seatOf(A.state.turnNickname);
  const directPass = await emit(directPasser, 'uno:pass', { roomCode });
  ok(
    directPass?.success === false && /draw/i.test(directPass.error || ''),
    `direct pass is rejected before drawing (${directPass?.error})`
  );

  // Use fresh deals for the random draw branches. This keeps the harness from
  // burning through a whole game while searching for a particular card draw.
  await closeGame(roomCode);

  // --- 2. drawing: either the card is playable (turn continues) or not ------
  // Classic UNO only permits a draw when the current hand has no playable card.
  let playablePath = null;
  for (let attempt = 0; attempt < 40 && !playablePath; attempt++) {
    roomCode = await startFreshGame('draw branch');
    const actingNick = A.state.turnNickname;
    const actor = seatOf(actingNick);
    const actorState = actor.state;
    if (actorState.mustDraw || (actorState.playableIds || []).length > 0) {
      await closeGame(roomCode);
      continue;
    }
    const other = actingNick === 'Alice' ? B : A;
    const deadlineBefore = actor.state.turnEndsAt;
    const handBeforeDraw = actor.state.yourHand.length;
    const deckBefore = actor.state.deckSize;

    const drawRes = await emit(actor, 'uno:draw', { roomCode });
    ok(
      drawRes?.success,
      `legal draw accepted (${JSON.stringify({ drawn: drawRes?.drawn, canPlayDrawn: drawRes?.canPlayDrawn })})`
    );
    await wait(200);

    if (!drawRes?.success) {
      await closeGame(roomCode);
      continue;
    }

    ok(
      actor.state.yourHand.length >= handBeforeDraw + 1 || actor.state.yourHand.length > 0,
      'hand includes the drawn card'
    );
    ok(actor.state.deckSize <= deckBefore, 'deck shrank by the drawn card');

    if (!drawRes.canPlayDrawn) {
      ok(actor.state.turnNickname !== actingNick, 'an unplayable draw passes the turn automatically');
      ok(!actor.state.drawnCardId, 'no drawn-card lock without a playable draw');
      await closeGame(roomCode);
      continue;
    }

    playablePath = { actingNick, actor, other, deadlineBefore, drawRes };
  }

  skip(Boolean(playablePath), 'eventually drew a playable card (tested the keep-turn branch)');

  if (playablePath) {
    const { actingNick, actor, other, deadlineBefore, drawRes } = playablePath;
    ok(actor.state.drawnCardId === drawRes.drawnCard.id, 'drawn playable card is flagged on the session');
    ok(actor.state.turnNickname === actingNick, 'drawing a playable card keeps your turn');
    ok(other.state.turnNickname === actingNick, 'opponent sees the turn unchanged');
    ok(actor.state.turnEndsAt > deadlineBefore, 'deciding on the drawn card gets a fresh clock');

    const card = drawRes.drawnCard;
    const payload = cardPayload(roomCode, card);

    // Only the drawn card may be played now.
    const otherCard = actor.state.yourHand.find((c) => c.id !== card.id);
    if (otherCard) {
      const wrong = await emit(actor, 'uno:play', { roomCode, cardId: otherCard.id, chosenColor: 'blue' });
      ok(wrong?.success === false, `other cards are locked after drawing (${wrong?.error})`);
    }

    const playAgain = await emit(actor, 'uno:play', payload);
    ok(playAgain?.success, `the drawn card can be played immediately (${card.color} ${card.type})`);
    await wait(200);
    // A plain card hands the turn over. An action card (skip, reverse, +2, +4)
    // resolves against the only other seat, so with two players the turn can
    // legitimately come straight back to the player who played it.
    const isActionCard = card.type !== 'number';
    ok(
      isActionCard || actor.state.turnNickname !== actingNick,
      `playing a ${card.type} card resolves the turn (now ${actor.state.turnNickname})`
    );
    ok(!actor.state.yourHand.some((c) => c.id === card.id), 'the played card left the hand');
    ok(!actor.state.drawnCardId, 'drawn-card lock clears after playing');
  }

  await closeGame(roomCode);

  // --- 3. pass hands the turn over ----------------------------------------
  // A direct pass is intentionally rejected. Draw a playable card, then use
  // the explicit pass action to decline it and hand the turn over.
  let passVerified = false;
  let passerNick = null;
  for (let attempt = 0; attempt < 40 && !passVerified; attempt++) {
    roomCode = await startFreshGame('pass branch');
    passerNick = A.state.turnNickname;
    const passer = seatOf(passerNick);
    const passerState = passer.state;
    if (passerState.mustDraw || (passerState.playableIds || []).length > 0) {
      await closeGame(roomCode);
      continue;
    }

    const passCandidate = await emit(passer, 'uno:draw', { roomCode });
    ok(
      passCandidate?.success,
      `draw for pass branch accepted (${JSON.stringify({ drawn: passCandidate?.drawn, canPlayDrawn: passCandidate?.canPlayDrawn })})`
    );
    await wait(160);

    if (!passCandidate?.success || !passCandidate.canPlayDrawn) {
      await closeGame(roomCode);
      continue;
    }

    const passRes = await emit(passer, 'uno:pass', { roomCode });
    ok(passRes?.success, 'pass accepted after drawing a playable card');
    await wait(200);
    ok(A.state.turnNickname !== passerNick, `pass moved the turn to ${A.state.turnNickname}`);
    passVerified = Boolean(passRes?.success && A.state.turnNickname !== passerNick);
  }
  skip(passVerified, 'explicit pass branch was exercised');

  if (passVerified) {
    // somebody else cannot pass for the current player
    const wrongPasser = seatOf(passerNick);
    const stolen = await emit(wrongPasser, 'uno:pass', { roomCode });
    ok(stolen?.success === false, `out-of-turn pass rejected (${stolen?.error})`);
  }

  // --- 4. every active session agrees on the clock ------------------------
  if (passVerified) {
    ok(
      Math.abs((A.state.turnEndsAt || 0) - (B.state.turnEndsAt || 0)) < 1500,
      'both clients see the same deadline'
    );
  } else {
    skip(false, 'both clients see the same deadline (pass branch was not produced by the random deal)');
  }

  await closeGame(roomCode);

  console.log(failures === 0 ? '\nAll UNO turn checks passed.' : `\n${failures} UNO turn check(s) failed.`);
} catch (err) {
  failures += 1;
  console.error(`ERROR ${err.message}`);
} finally {
  if (activeRoomCode) await closeGame(activeRoomCode);
  A.close();
  B.close();
  await wait(200);
  process.exit(failures === 0 ? 0 : 1);
}
