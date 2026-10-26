/**
 * Solo bot smoke test for UNO.
 * Run with a server that has UNO_TURN_MS shortened for fast feedback.
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const awaitState = async (socket, predicate, label, timeout = 8000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate(socket.state)) return socket.state;
    await wait(40);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const A = io(URL, { transports: ['websocket'], reconnection: false });
A.state = null;
A.on('uno:session', (state) => { A.state = state; });

let failures = 0;
const ok = (condition, message) => {
  console.log(condition ? `PASS ${message}` : `FAIL ${message}`);
  if (!condition) failures += 1;
};

try {
  await new Promise((resolve, reject) => {
    A.once('connect', resolve);
    A.once('connect_error', reject);
  });

  const created = await emit(A, 'room:create', { gameType: 'uno', nickname: 'SoloUno', isSolo: true });
  ok(created?.success, 'solo UNO room creates');
  const roomCode = created?.roomCode;

  await awaitState(A, (state) => state?.status === 'in_game' && state.yourHand?.length === 7, 'solo UNO match');
  ok(A.state.players.length === 2, 'solo UNO includes a bot seat');
  ok(A.state.players.some((player) => player.nickname === 'UnoBot' && player.isBot), 'UnoBot is marked as a bot');

  const beforeTurn = A.state.turnNickname;
  if (A.state.isYourTurn) {
    const playable = A.state.playableIds || [];
    if (playable.length > 0) {
      const card = A.state.yourHand.find((candidate) => candidate.id === playable[0]);
      await emit(A, 'uno:play', { roomCode, cardId: card.id, ...(card.color === 'wild' ? { chosenColor: 'red' } : {}) });
    } else {
      await emit(A, 'uno:draw', { roomCode });
    }
  }

  await wait(1100);
  ok(A.state.lastAction?.includes('UnoBot') || A.state.turnNickname !== beforeTurn, 'UnoBot takes an automatic turn');
  ok(A.state.status === 'in_game' || A.state.status === 'finished', 'solo UNO remains playable after bot turn');

  await emit(A, 'room:leave', { roomCode, nickname: 'SoloUno' });
} catch (error) {
  failures += 1;
  console.error(`ERROR ${error.message}`);
} finally {
  A.close();
  await wait(120);
  console.log(failures === 0 ? 'ALL BOT MODE CHECKS PASSED' : `${failures} BOT MODE CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
