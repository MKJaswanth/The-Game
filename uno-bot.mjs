/**
 * M11 verification helper — joins an existing UNO room as a second player
 * and auto-plays on its turn. Run: node uno-bot.mjs <ROOMCODE>
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const URL = 'http://localhost:4000';
const roomCode = (process.argv[2] || '').toUpperCase();
if (!roomCode) { console.error('Usage: node uno-bot.mjs <ROOMCODE>'); process.exit(1); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const s = io(URL, { transports: ['websocket'] });

let state = null;
s.on('uno:session', (g) => { state = g; });
s.on('uno:end', (payload) => {
  console.log('[BOT] uno:end', payload?.winner || payload || '');
  state = null;
});

const join = () => s.emit('room:join', { roomCode, nickname: 'CardBot' }, (res) => {
  if (res?.success) console.log(`[BOT] joined room ${roomCode}`);
  else { console.error('[BOT] join failed:', res?.error); process.exit(1); }
});

s.on('connect', join);
if (s.connected) join();

console.log('[BOT] waiting for game start…');
let running = true;

async function loop() {
  while (running) {
    await wait(200);
    if (!state) continue;
    if (state.status === 'finished') continue;
    if (!state.isYourTurn) continue;

    const playable = state.playableIds || [];
    const hand = state.yourHand || [];

    if (hand.length === 1 && !state.hasCalledUno) {
      s.emit('uno:call', { roomCode }, () => {});
    }

    if (playable.length > 0) {
      const card = hand.find((c) => c.id === playable[0]);
      const chosen = card.color === 'wild' ? 'red' : undefined;
      console.log(`[BOT] plays ${card.color} ${card.type}${card.type === 'number' ? ' ' + card.value : ''}`);
      s.emit('uno:play', { roomCode, cardId: card.id, chosenColor: chosen }, (res) => {
        if (res && !res.success) console.error('[BOT] play rejected:', res.error);
      });
    } else {
      console.log('[BOT] draws');
      s.emit('uno:draw', { roomCode }, (res) => {
        if (res && !res.success) console.error('[BOT] draw rejected:', res.error);
      });
    }
  }
}
loop();

setTimeout(() => { running = false; process.exit(0); }, 300000);
