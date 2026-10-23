/**
 * M12 Flappy Race smoke test — 2 players over Socket.IO.
 * Run: node test-flappy.mjs (server must be running on :4000)
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const BIRD_X = 110;
const PIPE_W = 62;
const BIRD_R = 12;

function client(nick) {
  const s = io(URL, { transports: ['websocket'] });
  s.nick = nick;
  return s;
}

const emit = (socket, ev, payload) =>
  new Promise((resolve) => socket.emit(ev, payload, (res) => resolve(res)));

const A = client('Flyer');
const B = client('Dropper');

const latest = {};
let stateCount = 0;
[A, B].forEach((s) =>
  s.on('flappy:state', (st) => {
    latest[s.nick] = st;
    if (s === A) stateCount += 1;
  })
);

let failures = 0;
const ok = (cond, msg) => {
  console.log(cond ? `PASS ${msg}` : `FAIL ${msg}`);
  if (!cond) failures++;
};

/** Autopilot: aim for the centre of the next pipe gap. */
function autopilot(socket) {
  const timer = setInterval(() => {
    const st = latest[socket.nick];
    if (!st || st.status !== 'racing') return;
    const me = st.birds.find((b) => b.nickname === socket.nick);
    if (!me || !me.alive) return;
    const next = st.pipes
      .filter((p) => p.x + PIPE_W > BIRD_X - BIRD_R)
      .sort((a, b) => a.x - b.x)[0];
    const target = next ? next.gapY + next.gapH / 2 : 280;
    if (me.y > target - 6) socket.emit('flappy:flap', { roomCode: roomCode }, () => {});
  }, 25);
  return () => clearInterval(timer);
}

let roomCode = '';

try {
  const created = await emit(A, 'room:create', { gameType: 'flappy', nickname: 'Flyer' });
  ok(created?.success, 'room:create succeeds');
  roomCode = created.roomCode;
  ok(created?.room?.capacity?.max === 4, `capacity allows 4 racers (${created?.room?.capacity?.max})`);

  const joined = await emit(B, 'room:join', { roomCode, nickname: 'Dropper' });
  ok(joined?.success, 'room:join succeeds');

  const ends = { A: null, B: null };
  A.once('flappy:end', (p) => { ends.A = p; });
  B.once('flappy:end', (p) => { ends.B = p; });

  await emit(A, 'room:start', { roomCode });
  await wait(300);

  const s0 = latest.Flyer;
  ok(s0 && s0.status === 'countdown', `race opens in countdown (${s0?.status})`);
  ok(s0 && s0.birds.length === 2, `both birds on the course (${s0?.birds?.length})`);
  ok(s0 && s0.pipes.length >= 2, `pipe course generated (${s0?.pipes?.length})`);

  // out-of-race flap while counting down must be rejected
  const early = await emit(A, 'flappy:flap', { roomCode });
  ok(early && early.success === false, `flap rejected during countdown (${early?.error})`);

  await wait(2600);
  ok(latest.Flyer?.status === 'racing', `countdown hands over to racing (${latest.Flyer?.status})`);

  // only Flyer flies; Dropper never flaps and must hit the ground
  const stopAuto = autopilot(A);

  let crashed = false;
  for (let i = 0; i < 60; i++) {
    await wait(100);
    const b = latest.Flyer?.birds?.find((x) => x.nickname === 'Dropper');
    if (b && !b.alive) { crashed = true; break; }
  }
  ok(crashed, 'a bird that never flaps crashes');

  const deadFlap = await emit(B, 'flappy:flap', { roomCode });
  ok(deadFlap && deadFlap.success === false && /crash/i.test(deadFlap.error || ''),
    `crashed bird cannot flap (${deadFlap?.error})`);

  const flyingBird = latest.Flyer.birds.find((x) => x.nickname === 'Flyer');
  ok(flyingBird && flyingBird.alive, 'autopilot bird is still flying');

  // let the survivor fly long enough to clear a few pipe columns
  let scored = 0;
  for (let i = 0; i < 140; i++) {
    await wait(100);
    const bird = latest.Flyer?.birds?.find((x) => x.nickname === 'Flyer');
    scored = bird?.score || 0;
    if (scored >= 2) break;
  }
  ok(scored > 0, `pipes passed are scored (${scored})`);

  // measure the broadcast rate over a clean 2-second window
  const countBefore = stateCount;
  const tBefore = Date.now();
  await wait(2000);
  const rate = (stateCount - countBefore) / ((Date.now() - tBefore) / 1000);
  ok(rate > 20, `state broadcast keeps ~30 fps (${rate.toFixed(1)}/s observed)`);

  // stop flapping → Flyer crashes → race ends
  stopAuto();
  let ended = false;
  for (let i = 0; i < 80; i++) {
    await wait(100);
    if (ends.A) { ended = true; break; }
  }
  ok(ended, 'flappy:end broadcast when every bird is down');

  const payload = ends.A;
  ok(payload?.winner === 'Flyer', `winner is the last bird standing (${payload?.winner})`);
  ok(payload?.standings?.length === 2, 'standings list every racer');
  ok(payload?.standings?.[0]?.isWinner === true, 'top of standings is flagged winner');
  ok(
    payload?.standings?.[0]?.score >= payload?.standings?.[1]?.score,
    `standings sorted by pipes (${payload?.standings?.map((s) => s.score).join(' vs ')})`
  );

  const lb = await fetch(`${URL}/api/leaderboard/flappy`).then((r) => r.json());
  const saved = (lb.leaderboard || []).some((row) => row.nickname === 'Flyer');
  ok(saved, 'race scores reach the flappy leaderboard');

  // solo room auto-starts
  const solo = client('SoloBird');
  const soloCreated = await emit(solo, 'room:create', { gameType: 'flappy', nickname: 'SoloBird', isSolo: true });
  ok(soloCreated?.success && soloCreated?.room?.status === 'in_game', 'solo Flappy room starts immediately');
  await wait(3200);
  const soloState = await new Promise((resolve) => {
    solo.on('flappy:state', (st) => resolve(st));
    solo.emit('flappy:get', { roomCode: soloCreated.roomCode }, () => {});
  });
  ok(soloState?.birds?.length === 1, 'solo race has a single bird');
  solo.disconnect();
} catch (err) {
  failures++;
  console.error('ERROR', err.message);
} finally {
  A.disconnect();
  B.disconnect();
  console.log(failures === 0 ? '\nALL FLAPPY TESTS PASSED' : `\n${failures} FLAPPY TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
