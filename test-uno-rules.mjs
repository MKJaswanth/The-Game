/**
 * Focused UNO rule test — a player may draw when only wild special cards are
 * playable, but a normal color/number match still requires them to play.
 * Run: node test-uno-rules.mjs
 */
import { canDrawWithoutMatch } from './server/src/socket/games/uno.js';

const game = {
  current: { color: 'red', type: 'number', value: 7 },
  pendingDraw: 0
};

const card = (id, color, type, value = null) => ({ id, color, type, value });
const cases = [
  {
    name: 'a lone Wild +4 does not block drawing',
    hand: [card('wild4-0', 'wild', 'wild4')],
    expected: true
  },
  {
    name: 'a matching number still requires a play',
    hand: [card('blue-7-0', 'blue', 'number', 7), card('wild4-1', 'wild', 'wild4')],
    expected: false
  },
  {
    name: 'a non-matching special card does not block a draw',
    hand: [card('blue-skip-0', 'blue', 'skip')],
    expected: true
  },
  {
    name: 'a hand with no playable cards can draw',
    hand: [card('blue-2-0', 'blue', 'number', 2)],
    expected: true
  }
];

let failures = 0;
for (const test of cases) {
  const actual = canDrawWithoutMatch(game, test.hand);
  const passed = actual === test.expected;
  console.log(passed ? `PASS ${test.name}` : `FAIL ${test.name}: got ${actual}`);
  if (!passed) failures += 1;
}

process.exit(failures === 0 ? 0 : 1);
