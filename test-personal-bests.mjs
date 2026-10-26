globalThis.window = {
  localStorage: {
    values: new Map(),
    getItem(key) { return this.values.get(key) || null; },
    setItem(key, value) { this.values.set(key, value); }
  },
  dispatchEvent() {}
};

const { clearPersonalBests, getPersonalBests, recordPersonalResult } = await import('./client/src/utils/personalBests.js');
clearPersonalBests();
recordPersonalResult({ gameType: 'snake', score: 120, won: false });
recordPersonalResult({ gameType: 'snake', score: 80, won: true });
recordPersonalResult({ gameType: 'flappy', score: 9, survivalMs: 18000, won: true });
const bests = getPersonalBests();

const ok = (condition, message) => {
  console.log(condition ? `PASS ${message}` : `FAIL ${message}`);
  if (!condition) process.exitCode = 1;
};

ok(bests.bestScores.snake === 120, 'personal best keeps the highest score');
ok(bests.totalWins === 2, 'personal wins persist across games');
ok(bests.flappyBestPipes === 9 && bests.flappyBestRunMs === 18000, 'Flappy run metrics persist');
