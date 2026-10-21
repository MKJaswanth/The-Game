/**
 * M13 Chess engine test — two players over real Socket.IO.
 * Run: node test-chess.mjs (server must be listening on :4000)
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const await_ = async (fn, label, timeout = 2500) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = fn();
    if (value) return value;
    await wait(40);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

function connect(nick) {
  const s = io(URL, { transports: ['websocket'] });
  s.nick = nick;
  s.state = null;
  s.on('chess:state', (g) => { s.state = g; });
  return s;
}

const emit = (socket, ev, payload) =>
  new Promise((resolve) => socket.emit(ev, payload, (res) => resolve(res)));

let failures = 0;
const ok = (cond, msg) => {
  console.log(cond ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!cond) failures++;
};

const A = connect('Alice');
const B = connect('Bob');

const move = async (sock, from, to, promotion) => {
  const res = await emit(sock, 'chess:move', { roomCode: roomCode, from, to, promotion });
  await wait(120);
  return res;
};

let roomCode = null;

async function playLine(moves) {
  for (const [who, from, to] of moves) {
    const res = await move(who === 'A' ? A : B, from, to);
    if (!res?.success) throw new Error(`line move ${from}${to} failed: ${res?.error}`);
  }
}

try {
  const created = await emit(A, 'room:create', { gameType: 'chess', nickname: 'Alice', maxPlayers: 2 });
  ok(created?.success, 'chess room created');
  roomCode = created.roomCode;

  // Starting with one player must fail — chess is strictly 1v1.
  const tooEarly = await emit(A, 'room:start', { roomCode });
  ok(tooEarly?.success === false, `cannot start chess alone (${tooEarly?.error})`);
  ok(!A.state, 'no board is dealt to a one-seat room');

  const joined = await emit(B, 'room:join', { roomCode, nickname: 'Bob' });
  ok(joined?.success, 'second player joined');

  await emit(A, 'room:start', { roomCode });
  await await_(() => A.state && B.state, 'initial chess state');

  const s0 = A.state;
  ok(s0.players.w === 'Alice' && s0.players.b === 'Bob', 'host plays white, guest black');
  ok(s0.status === 'in_game', 'game is live');
  ok(s0.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'opens from the standard position');
  ok(Array.isArray(s0.legalMoves?.e2) && s0.legalMoves.e2.length === 2, 'legal moves offered for e2 (e3, e4)');
  ok(s0.inCheck === null, 'nobody is in check');

  // --- legality + turn ownership -------------------------------------------
  const sideways = await move(A, 'e2', 'e5');
  ok(!sideways.success, `illegal pawn move rejected (${sideways.error})`);

  const outOfTurn = await move(B, 'e7', 'e5');
  ok(!outOfTurn.success && /turn/i.test(outOfTurn.error || ''), `out-of-turn move rejected (${outOfTurn.error})`);

  const wrongPiece = await move(A, 'e7', 'e5');
  ok(!wrongPiece.success, 'cannot move an opponent piece');

  // --- Scholar's mate ------------------------------------------------------
  await playLine([
    ['A', 'e2', 'e4'],
    ['B', 'e7', 'e5'],
    ['A', 'f1', 'c4'],
    ['B', 'b8', 'c6'],
    ['A', 'd1', 'h5'],
    ['B', 'g8', 'f6'],
  ]);
  ok(A.state.lastMove?.san === 'Nf6', `last move recorded as SAN (${A.state.lastMove?.san})`);

  const mate = await move(A, 'h5', 'f7');
  ok(mate.success, 'queen takes f7');
  await await_(() => A.state.status === 'finished', 'finished state');

  const s1 = A.state;
  ok(s1.result?.type === 'checkmate', `checkmate detected (${s1.result?.type})`);
  ok(s1.result?.winner === 'Alice', `white wins (${s1.result?.winner})`);
  ok(s1.inCheck === 'b', 'black left in check');
  ok(s1.legalMoves && Object.keys(s1.legalMoves).length === 0, 'no legal moves offered after mate');
  ok(s1.history[s1.history.length - 1] === 'Qxf7#', `mate logged in SAN (${s1.history[s1.history.length - 1]})`);
  ok(B.state.result?.winner === 'Alice', 'both clients agree on the result');

  // --- score persistence ---------------------------------------------------
  await wait(500);
  const board = await (await fetch(`${URL}/api/leaderboard/chess`)).json();
  const rows = board.leaderboard || [];
  ok(rows.some((r) => r.nickname === 'Alice' && r.won === true), 'winner persisted to the leaderboard');
  ok(rows.some((r) => r.nickname === 'Bob' && r.won === false), 'loser recorded');

  // --- rematch (both must agree, colours swap) -----------------------------
  const half = await emit(A, 'chess:rematch', { roomCode });
  ok(half.success && half.waiting, 'rematch waits for the second vote');

  await emit(B, 'chess:rematch', { roomCode });
  await await_(() => A.state.status === 'in_game' && A.state.moveCount === 0, 'fresh rematch');

  const s2 = A.state;
  ok(s2.players.w === 'Bob' && s2.players.b === 'Alice', 'colours swap on rematch');
  ok(s2.fen.endsWith('w KQkq - 0 1'), 'board resets');

  // --- castling ------------------------------------------------------------
  await playLine([
    ['B', 'e2', 'e4'],
    ['A', 'e7', 'e5'],
    ['B', 'g1', 'f3'],
    ['A', 'b8', 'c6'],
    ['B', 'f1', 'c4'],
    ['A', 'f8', 'c5'],
  ]);
  const castle = await move(B, 'e1', 'g1');
  ok(castle.success, 'king-side castling accepted');
  await await_(() => A.state.lastMove?.san === 'O-O', 'castling SAN');
  ok(A.state.fen.includes('RK1'), `king and rook actually moved (${A.state.fen.split(' ')[0]})`);

  // --- draw offer flow -----------------------------------------------------
  // Bob is white in this game, Alice black.
  const offer = await emit(B, 'chess:draw:offer', { roomCode });
  ok(offer.success, 'white can offer a draw');
  await await_(() => A.state.drawOffer === 'Bob', 'offer broadcast');

  const decline = await emit(A, 'chess:draw:respond', { roomCode, accept: false });
  ok(decline.success && !decline.accepted, 'opponent can decline');
  await await_(() => A.state.drawOffer === null, 'declined offer cleared');
  ok(A.state.status === 'in_game', 'game continues after a declined draw');

  const offer2 = await emit(B, 'chess:draw:offer', { roomCode });
  ok(offer2.success, 'second offer allowed');
  await await_(() => A.state.drawOffer === 'Bob', 'second offer broadcast');

  const selfAnswer = await emit(B, 'chess:draw:respond', { roomCode, accept: true });
  ok(!selfAnswer.success, 'offerer cannot answer their own offer');

  const accept = await emit(A, 'chess:draw:respond', { roomCode, accept: true });
  ok(accept.success && accept.accepted, 'opponent can accept');
  await await_(() => A.state.status === 'finished', 'draw finished state');
  ok(A.state.result?.type === 'draw', `draw recorded (${A.state.result?.type})`);
  ok(A.state.result?.winner === null, 'draw has no winner');

  // --- resign --------------------------------------------------------------
  await emit(A, 'chess:rematch', { roomCode });
  await emit(B, 'chess:rematch', { roomCode });
  await await_(() => A.state.status === 'in_game' && A.state.moveCount === 0, 'third game');

  ok(A.state.players.w === 'Alice', 'third game: Alice white again (alternating)');
  const resign = await emit(B, 'chess:resign', { roomCode });
  ok(resign.success, 'black can resign');
  await await_(() => A.state.status === 'finished', 'resign finished state');
  ok(A.state.result?.type === 'resign', `resign recorded (${A.state.result?.type})`);
  ok(A.state.result?.winner === 'Alice', 'opponent wins on resignation');

  // --- promotion (fresh room so white starts again) ------------------------
  const created2 = await emit(A, 'room:create', { gameType: 'chess', nickname: 'Alice', maxPlayers: 2 });
  roomCode = created2.roomCode;
  A.state = null;
  B.state = null;
  await emit(B, 'room:join', { roomCode, nickname: 'Bob' });
  await emit(A, 'room:start', { roomCode });
  await await_(() => A.state && A.state.moveCount === 0 && A.state.status === 'in_game', 'promotion room ready');

  await playLine([
    ['A', 'a2', 'a4'],
    ['B', 'h7', 'h6'],
    ['A', 'a4', 'a5'],
    ['B', 'h6', 'h5'],
    ['A', 'a5', 'a6'],
    ['B', 'g7', 'g6'],
    ['A', 'a6', 'b7'],
    ['B', 'g6', 'g5'],
  ]);
  const promoLegal = A.state.legalMoves?.b7?.filter((t) => t.to === 'a8') || [];
  ok(promoLegal.some((t) => t.promotion === 'q'), 'client is offered a promotion choice on b7-a8');

  const promo = await move(A, 'b7', 'a8', 'n');
  ok(promo.success, 'under-promotion accepted');
  await await_(() => A.state.lastMove?.san?.includes('=N'), 'promotion SAN');
  ok(A.state.lastMove?.san === 'bxa8=N', `promoted to the chosen piece (${A.state.lastMove?.san})`);
  ok(A.state.fen.split(' ')[0].startsWith('Nnbqkbnr'), 'knight actually landed on a8');

  const illegalAfter = await emit(B, 'chess:move', { roomCode, from: 'e7', to: 'e4' });
  ok(!illegalAfter.success, 'ordinary illegal move still rejected after promotion');

  console.log(failures === 0 ? '\nAll chess checks passed.' : `\n${failures} chess check(s) failed.`);
} catch (err) {
  failures += 1;
  console.error(`ERROR ${err.message}`);
} finally {
  A.close();
  B.close();
  await wait(150);
  process.exit(failures === 0 ? 0 : 1);
}
