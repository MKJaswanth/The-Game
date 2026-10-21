/**
 * Emoji Guessing sparring bot — joins a room, writes a clue when it is the
 * clue-giver, and throws one wrong guess per round otherwise.
 * Its secret answer is printed to stdout so a human guesser can finish rounds.
 *
 * Usage: node emoji-bot.mjs <ROOMCODE> [nickname]
 */
import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

const roomCode = (process.argv[2] || '').toUpperCase();
const nick = process.argv[3] || 'EmojiBot';

if (!roomCode) {
  console.error('Usage: node emoji-bot.mjs <ROOMCODE> [nickname]');
  process.exit(1);
}

const URL = process.env.SERVER_URL || 'http://localhost:4000';
const socket = io(URL, { transports: ['websocket'] });

let currentRound = null;
let guessedRound = null;

socket.on('connect', () => console.log(`[bot] connected as ${nick}`));

socket.emit('room:join', { roomCode, nickname: nick }, (res) => {
  if (!res?.success) {
    console.error(`[bot] join failed: ${res?.error}`);
    process.exit(1);
  }
  console.log(`[bot] joined ${roomCode}`);
});

socket.on('emoji:answer', (payload) => {
  console.log(`[bot] ANSWER round=${payload.round} answer="${payload.answer}" hint=${payload.hint}`);
  setTimeout(() => {
    socket.emit('emoji:clue', { roomCode, clue: payload.hint }, (res) => {
      console.log(res?.success ? `[bot] sent clue ${payload.hint}` : `[bot] clue rejected: ${res?.error}`);
    });
  }, 1500);
});

socket.on('emoji:state', (state) => {
  if (state.roomCode !== roomCode) return;
  if (state.phase === 'finished') {
    console.log(`[bot] game over: ${(state.standings || []).map((s) => `${s.nickname}:${s.score}`).join(', ')}`);
    socket.close();
    process.exit(0);
  }

  if (state.phase === 'clue') currentRound = state.round;

  if (state.phase === 'guessing' && state.clueGiver !== nick && guessedRound !== state.round) {
    guessedRound = state.round;
    setTimeout(() => {
      socket.emit('emoji:guess', { roomCode, guess: 'banana' }, (res) => {
        console.log(res?.success ? `[bot] guessed (${res.correct ? 'correct' : 'wrong'})` : `[bot] guess rejected: ${res?.error}`);
      });
    }, 1800);
  }
});

// Stays for a whole match; Ctrl+C to stop sooner.
setTimeout(() => {
  console.log('[bot] timed out');
  process.exit(0);
}, 45 * 60 * 1000);
