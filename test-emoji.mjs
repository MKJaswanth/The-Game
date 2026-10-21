/**
 * M14 Emoji Guessing test — two players over real Socket.IO, five full rounds.
 * Run: node test-emoji.mjs (server must be listening on :4000)
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const await_ = async (fn, label, timeout = 8000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = fn();
    if (value) return value;
    await wait(50);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

function connect(nick) {
  const s = io(URL, { transports: ['websocket'] });
  s.nick = nick;
  s.state = null;
  s.secret = null;
  s.feed = [];
  s.on('emoji:state', (g) => { s.state = g; });
  s.on('emoji:answer', (a) => { s.secret = a; });
  s.on('emoji:guess', (g) => { s.feed.push(g); });
  return s;
}

const emit = (socket, ev, payload) =>
  new Promise((resolve) => socket.emit(ev, payload, (res) => resolve(res)));

let failures = 0;
const ok = (cond, msg) => {
  console.log(cond ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!cond) failures++;
};

const A = connect('Mia');
const B = connect('Noah');

const roomCode = (await emit(A, 'room:create', { gameType: 'emoji', nickname: 'Mia', maxPlayers: 4 })).roomCode;

async function playRound(roundNo) {
  await await_(() => A.state?.phase === 'clue' && A.state.round === roundNo, `round ${roundNo} clue phase`);

  const clueGiver = A.state.clueGiver;
  const giverSocket = clueGiver === A.nick ? A : B;
  const guesserSocket = clueGiver === A.nick ? B : A;

  // The clue-giver is the only socket that should know the answer.
  await await_(() => giverSocket.secret?.round === roundNo, `secret answer for ${clueGiver}`);
  ok(giverSocket.secret.answer.length > 0, `round ${roundNo}: clue-giver received the answer (${giverSocket.secret.answer})`);
  ok(A.state.answer === null && B.state.answer === null, `round ${roundNo}: answer hidden from the broadcast`);

  // Only the clue-giver may submit a clue.
  const wrongAuthor = await emit(guesserSocket, 'emoji:clue', { roomCode, clue: '🍕' });
  ok(!wrongAuthor.success, `round ${roundNo}: non-clue-giver cannot write the clue`);

  const clue = await emit(giverSocket, 'emoji:clue', { roomCode, clue: '🎬🍿' });
  ok(clue.success, `round ${roundNo}: clue accepted`);
  await await_(() => A.state.phase === 'guessing', 'guessing phase');

  ok(A.state.clue === '🎬🍿', `round ${roundNo}: clue broadcast (${A.state.clue})`);
  ok(A.state.remainingMs > 55000, `round ${roundNo}: 60s guess clock started (${Math.round(A.state.remainingMs / 1000)}s)`);

  // The clue-giver cannot answer their own round.
  const selfGuess = await emit(giverSocket, 'emoji:guess', { roomCode, guess: giverSocket.secret.answer });
  ok(!selfGuess.success, `round ${roundNo}: clue-giver cannot guess their own answer`);

  const wrong = await emit(guesserSocket, 'emoji:guess', { roomCode, guess: 'definitely not it' });
  ok(wrong.success && wrong.correct === false, `round ${roundNo}: wrong guess accepted as feedback`);
  await await_(() => guesserSocket.feed.some((g) => g.correct === false), 'wrong guess feed');

  const answer = giverSocket.secret.answer;
  const right = await emit(guesserSocket, 'emoji:guess', { roomCode, guess: answer.toUpperCase() });
  ok(right.success && right.correct, `round ${roundNo}: correct guess accepted (${answer})`);
  ok(right.points >= 60 && right.points <= 100, `round ${roundNo}: speed-scaled points (${right.points})`);

  await await_(() => A.state.phase === 'reveal', 'reveal phase');
  ok(A.state.answer === answer, `round ${roundNo}: answer revealed after the round`);
  ok(A.state.roundWinner === guesserSocket.nick, `round ${roundNo}: round winner recorded (${A.state.roundWinner})`);

  const giverScore = A.state.scores.find((s) => s.nickname === clueGiver)?.score || 0;
  ok(giverScore >= 40, `round ${roundNo}: clue-giver earned 40 (${giverScore})`);

  return { clueGiver, guesser: guesserSocket.nick };
}

try {
  const joined = await emit(B, 'room:join', { roomCode, nickname: 'Noah' });
  ok(joined?.success, 'second player joined the emoji room');

  const started = await emit(A, 'room:start', { roomCode });
  ok(started?.success, 'host starts the game');
  await await_(() => A.state && B.state, 'first emoji state');

  ok(A.state.phase === 'clue', 'game opens in the clue phase');
  ok(A.state.totalRounds === 5, 'five rounds per game');
  ok(A.state.clueGiver === 'Mia', `host gives the first clue (${A.state.clueGiver})`);
  ok(A.state.answerLength > 0, 'answer length exposed for the blanks UI');

  const first = await playRound(1);
  const second = await playRound(2);
  ok(first.clueGiver !== second.clueGiver, 'clue-giver rotates between rounds');
  ok(first.guesser === second.clueGiver, 'rotation follows the seat order');

  await playRound(3);
  await playRound(4);
  await playRound(5);

  await await_(() => A.state.phase === 'finished', 'finished phase', 9000);

  const standings = A.state.standings || A.state.scores;
  const sorted = [...standings].sort((a, b) => b.score - a.score);
  ok(sorted[0].score > 0, `somebody scored (${sorted[0].nickname}: ${sorted[0].score})`);
  ok(A.state.winner === sorted[0].nickname, `winner matches the top score (${A.state.winner})`);
  const total = sorted.reduce((sum, s) => sum + s.score, 0);
  ok(total >= 5 * 100 && total <= 5 * 140, `five rounds paid out within the expected range (${total})`);

  await wait(600);
  const board = await (await fetch(`${URL}/api/leaderboard/emoji`)).json();
  const rows = board.leaderboard || [];
  ok(rows.length >= 2, `emoji scores persisted to the leaderboard (${rows.length} rows)`);
  ok(rows.some((r) => r.gameType === 'emoji'), 'rows are tagged with the emoji game type');

  const vote = await emit(A, 'emoji:rematch', { roomCode });
  ok(vote.success && vote.waiting, 'rematch waits for both votes');
  const vote2 = await emit(B, 'emoji:rematch', { roomCode });
  ok(vote2.success && vote2.restarted, 'second vote restarts the game');
  await await_(() => A.state.phase === 'clue' && A.state.round === 1, 'fresh rematch');
  ok(A.state.scores.every((s) => s.score === 0), 'rematch resets the scores');

  console.log(failures === 0 ? '\nAll emoji checks passed.' : `\n${failures} emoji check(s) failed.`);
} catch (err) {
  failures += 1;
  console.error(`ERROR ${err.message}`);
} finally {
  A.close();
  B.close();
  await wait(150);
  process.exit(failures === 0 ? 0 : 1);
}
