/**
 * Trivia + Word Scramble smoke test — plays both quiz games over Socket.IO.
 *
 * Trivia runs one complete solo match (10 questions) and checks the timing,
 * scoring and end-of-game payload. Word Scramble runs one complete solo match
 * (10 rounds) and checks the round payload, the guess scoring and the finale.
 *
 * Run: node test-quiz-games.mjs
 *      SERVER_URL=https://the-game-31wo.onrender.com node test-quiz-games.mjs
 */
import fs from 'fs';
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const SERVER = process.env.SERVER_URL || 'http://localhost:4000';
const ONLY = process.env.GAME || 'all';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const waitFor = (socket, event, timeout = 12000) =>
  new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      socket.off(event, handler);
      resolve(null);
    }, timeout);
    function handler(payload) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(payload);
    }
    socket.once(event, handler);
  });

const emit = (socket, event, payload, timeout = 8000) =>
  new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve({ __timeout: true });
    }, timeout);
    socket.emit(event, payload, (res) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(res);
    });
  });

// Profiles read the persisted score row, so they are the end-to-end check that
// a finished match was recorded (and that the winner is not marked as a loss).
async function profile(nickname) {
  try {
    const res = await fetch(`${SERVER}/api/players/${encodeURIComponent(nickname)}`);
    const data = await res.json();
    return data?.player || null;
  } catch {
    return null;
  }
}

let failures = 0;
const ok = (cond, msg) => {
  console.log(cond ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!cond) failures++;
};

function connect() {
  const s = io(SERVER, { transports: ['websocket'], reconnection: false });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket connect timed out')), 15000);
    s.once('connect', () => {
      clearTimeout(timer);
      resolve(s);
    });
    s.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/* ------------------------------------------------------------------ Trivia */

// Match a served question against the local bank so the harness can answer
// correctly (the server never sends correctIndex with the question).
const localBank = JSON.parse(
  fs.readFileSync('server/src/data/triviaQuestions.json', 'utf8')
);
const bankByQuestion = new Map();
for (const q of localBank) {
  bankByQuestion.set(q.question.toLowerCase().trim(), q.options[q.correctIndex]);
}

async function runTrivia({ solo }) {
  console.log(`\n=== Trivia (${solo ? 'solo' : '2 players'}) @ ${SERVER} ===`);
  const A = await connect();
  const B = solo ? null : await connect();

  const created = await emit(A, 'room:create', {
    gameType: 'trivia',
    nickname: 'QuizHost',
    isSolo: solo,
    maxPlayers: solo ? undefined : 2
  });
  ok(created?.success, 'trivia room:create succeeds');
  const roomCode = created?.roomCode;

  if (B) {
    const joined = await emit(B, 'room:join', { roomCode, nickname: 'QuizGuest' });
    ok(joined?.success, 'trivia room:join succeeds');
  }

  const starting = waitFor(A, 'trivia:starting', 12000);
  if (!solo) {
    const started = await emit(A, 'room:start', { roomCode });
    ok(started?.success, 'trivia room:start succeeds');
  }
  const startInfo = await starting;
  ok(startInfo && startInfo.totalQuestions === 10, `trivia announces 10 questions (got ${startInfo?.totalQuestions})`);
  ok(startInfo?.timeLimit === 15, 'trivia announces a 15s per-question limit');

  let questions = 0;
  let correctAnswers = 0;
  let lastScores = null;
  let firstQuestionAt = Date.now();

  const endPromise = waitFor(A, 'trivia:end', 120000);

  // Answer every question until the server ends the match.
  while (questions < 10) {
    const q = await waitFor(A, 'trivia:question', 20000);
    if (!q) {
      ok(false, `trivia question ${questions + 1} arrived`);
      break;
    }
    questions += 1;
    if (questions === 1) {
      const waitMs = Date.now() - firstQuestionAt;
      ok(waitMs < 12000, `first question arrived in ${(waitMs / 1000).toFixed(1)}s`);
      ok(Array.isArray(q.options) && q.options.length === 4, 'question has 4 options');
      ok(typeof q.question === 'string' && q.question.length > 5, 'question text is present');
      ok(q.correctIndex === undefined, 'server does not leak correctIndex with the question');
      ok(q.scores && q.scores.QuizHost === 0, 'scoreboard starts at zero');
    }

    const bankAnswer = bankByQuestion.get(q.question.toLowerCase().trim());
    const answerIndex = bankAnswer ? q.options.indexOf(bankAnswer) : 0;

    // Listen before answering: a full answer set closes the round inside the
    // emit callback, so the result can land before a late listener is attached.
    const resultPromise = waitFor(A, 'trivia:result', 20000);

    const res = await emit(A, 'trivia:answer', {
      roomCode,
      nickname: 'QuizHost',
      answerIndex: Math.max(0, answerIndex)
    });
    ok(res?.success === true, `Q${questions} answer accepted`);
    if (res?.isCorrect) correctAnswers += 1;

    if (B) {
      const resB = await emit(B, 'trivia:answer', {
        roomCode,
        nickname: 'QuizGuest',
        answerIndex: (Math.max(0, answerIndex) + 1) % 4
      });
      ok(resB?.success === true || resB?.error, `Q${questions} guest answer handled`);
    }

    const result = await resultPromise;
    if (questions === 1) {
      ok(Boolean(result), 'question result broadcast');
      ok(typeof result?.correctIndex === 'number', 'result includes correctIndex');
      ok(result?.answers?.QuizHost, 'result includes the answer record');
      ok(result?.nextQuestionIn === 3, 'result announces a 3s pause');
    }
    if (result?.scores) lastScores = result.scores;

    // Duplicate answers must be rejected once the round is closed.
    if (questions === 1) {
      const dupe = await emit(A, 'trivia:answer', { roomCode, nickname: 'QuizHost', answerIndex: 0 });
      ok(dupe?.success === false, 'answering twice in one question is rejected');
    }
  }

  const end = await endPromise;
  ok(Boolean(end), 'trivia:end broadcast after 10 questions');
  ok(Array.isArray(end?.rankings) && end.rankings.length === (solo ? 1 : 2), 'rankings cover every player');
  if (solo) {
    ok(end?.winner?.nickname === 'QuizHost', `host wins a solo match (${end?.winner?.nickname} ${end?.winner?.score})`);
  } else {
    const names = (end?.rankings || []).map((r) => r.nickname);
    ok(names.includes('QuizHost') && names.includes('QuizGuest'), 'both players appear in the rankings');
    ok(['QuizHost', 'QuizGuest'].includes(end?.winner?.nickname), `winner is a seated player (${end?.winner?.nickname} ${end?.winner?.score})`);
    ok(end.rankings[0].score >= end.rankings[1].score, 'rankings are sorted by score');
  }
  if (correctAnswers > 0) {
    ok((lastScores?.QuizHost || 0) > 0, `correct answers scored points (${correctAnswers}/10 correct)`);
  } else {
    console.log('NOTE could not map any question to the local bank — scoring not asserted');
  }
  ok(typeof end?.finalScores?.QuizHost === 'number', 'final scores included');

  // A match with no points on the board records nothing, so only a scored
  // winner proves the result reached the store (and with the right verdict).
  await wait(700);
  const champion = end?.rankings?.[0];
  if (champion && champion.score > 0) {
    const champProfile = await profile(champion.nickname);
    ok(champProfile?.gamesPlayed >= 1, 'trivia result reached the profile store');
    ok(champProfile?.totalWins >= 1, `the winner is recorded as a win, not a loss (${champion.nickname} ${champion.score})`);

    const board = await fetch(`${SERVER}/api/leaderboard/trivia`).then((r) => r.json()).catch(() => null);
    const row = (board?.leaderboard || []).find((r) => r.nickname === champion.nickname && r.score === champion.score);
    ok(row?.won === true, 'the winning leaderboard row is flagged as a win');
  } else {
    console.log('NOTE nobody scored in this trivia match — win recording not asserted');
  }

  await emit(A, 'room:leave', { roomCode, nickname: 'QuizHost' });
  if (B) await emit(B, 'room:leave', { roomCode, nickname: 'QuizGuest' });
  A.disconnect();
  B?.disconnect();
  return { questions, correctAnswers };
}

/* ---------------------------------------------------------- Word Scramble */

const words = JSON.parse(
  fs.readFileSync('server/src/data/words.json', 'utf8')
).map((w) => w.word.toUpperCase());

const solve = (scrambled) => {
  const key = [...scrambled].sort().join('');
  return words.find((w) => [...w].sort().join('') === key) || null;
};

async function runScramble() {
  console.log(`\n=== Word Scramble (solo) @ ${SERVER} ===`);
  const A = await connect();

  const created = await emit(A, 'room:create', {
    gameType: 'wordscramble',
    nickname: 'WordHost',
    isSolo: true
  });
  ok(created?.success, 'scramble room:create succeeds');
  const roomCode = created?.roomCode;

  const endPromise = waitFor(A, 'scramble:end', 120000);
  let rounds = 0;
  let solved = 0;
  let lastScores = null;
  const t0 = Date.now();

  while (rounds < 10) {
    const round = await waitFor(A, 'scramble:round', 20000);
    if (!round) {
      ok(false, `scramble round ${rounds + 1} arrived`);
      break;
    }
    rounds += 1;
    if (rounds === 1) {
      const waitMs = Date.now() - t0;
      ok(waitMs < 8000, `first round arrived in ${(waitMs / 1000).toFixed(1)}s`);
      ok(typeof round.scrambled === 'string' && round.scrambled.length > 1, 'round ships scrambled letters');
      ok(round.scrambled.length === round.length, 'scrambled length matches the word length');
      ok(round.scrambled !== solve(round.scrambled), 'the scramble is actually shuffled');
      ok(round.timeLimit === 30, 'round announces a 30s limit');
      ok(round.scores && round.scores.WordHost === 0, 'scoreboard starts at zero');
      const state = await emit(A, 'scramble:get_state', { roomCode });
      ok(state?.success === true && state.status === 'round_active', 'scramble:get_state reports the live round');
      ok(state.scrambled === round.scrambled, 'get_state matches the broadcast scramble');
    }

    const answer = solve(round.scrambled);
    if (!answer) {
      ok(false, `round ${rounds} scramble is solvable from the word bank`);
      break;
    }

    // Same race as trivia: a correct solo guess ends the round instantly.
    const resultPromise = waitFor(A, 'scramble:result', 20000);

    if (rounds === 1) {
      const wrong = await emit(A, 'scramble:guess', { roomCode, nickname: 'WordHost', guess: 'ZZZZZZ' });
      ok(wrong?.success === true && wrong.correct === false, 'a wrong guess is rejected without penalty');
    }

    const res = await emit(A, 'scramble:guess', { roomCode, nickname: 'WordHost', guess: answer });
    ok(res?.success === true && res.correct === true, `round ${rounds} guess accepted (${answer})`);
    if (res?.correct) {
      solved += 1;
      ok(res.points >= 100, `round ${rounds} scored ${res.points} pts`);
    }

    const result = await resultPromise;
    if (rounds === 1) {
      ok(result?.correctWord === answer, 'result reveals the correct word');
      ok(result?.roundGuesses?.WordHost, 'result includes the guess record');
      ok(result?.nextRoundIn === 4, 'result announces a 4s pause');
    }
    if (result?.scores) lastScores = result.scores;
  }

  const end = await endPromise;
  ok(Boolean(end), 'scramble:end broadcast after 10 rounds');
  ok(end?.winner?.nickname === 'WordHost', `solo player wins (${end?.winner?.score} pts)`);
  ok(solved === rounds, `every round was solvable (${solved}/${rounds})`);
  ok((lastScores?.WordHost || 0) > 0, 'scores accumulated across rounds');

  await wait(700);
  const hostProfile = await profile('WordHost');
  ok(hostProfile?.gamesPlayed >= 1, 'scramble result reached the profile store');

  // Match this run's score, not just the nickname: an older win for the same
  // callsign would otherwise hide a regression in how wins are recorded.
  const board = await fetch(`${SERVER}/api/leaderboard/wordscramble`).then((r) => r.json()).catch(() => null);
  const row = (board?.leaderboard || []).find(
    (r) => r.nickname === 'WordHost' && r.score === end?.winner?.score
  );
  ok(row?.won === true, `the scramble winner is recorded as a win, not a loss (${end?.winner?.score} pts)`);

  await emit(A, 'room:leave', { roomCode, nickname: 'WordHost' });
  A.disconnect();
  return { rounds, solved };
}

/* ------------------------------------------------------------------- main */

try {
  if (ONLY === 'all' || ONLY === 'trivia') await runTrivia({ solo: true });
  if (ONLY === 'all' || ONLY === 'trivia-duo') await runTrivia({ solo: false });
  if (ONLY === 'all' || ONLY === 'scramble') await runScramble();
} catch (err) {
  failures += 1;
  console.error('TEST ERROR:', err?.message || err);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
