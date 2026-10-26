const STORAGE_KEY = 'the_game_personal_bests_v1';

const DEFAULTS = {
  gamesPlayed: 0,
  totalWins: 0,
  bestScores: {},
  winsByGame: {},
  flappyBestPipes: 0,
  flappyBestRunMs: 0,
  fastestFlappyWinMs: 0
};

function readStore() {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...DEFAULTS,
      ...parsed,
      bestScores: { ...DEFAULTS.bestScores, ...(parsed.bestScores || {}) },
      winsByGame: { ...DEFAULTS.winsByGame, ...(parsed.winsByGame || {}) }
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeStore(value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage can be blocked in private browsing; the in-memory result still
    // remains useful to the current screen.
  }
}

export function getPersonalBests() {
  return readStore();
}

export function recordPersonalResult({ gameType, score = 0, won = false, survivalMs = 0 }) {
  const next = readStore();
  const numericScore = Number(score) || 0;
  next.gamesPlayed += 1;
  next.bestScores[gameType] = Math.max(Number(next.bestScores[gameType]) || 0, numericScore);

  if (won) {
    next.totalWins += 1;
    next.winsByGame[gameType] = (Number(next.winsByGame[gameType]) || 0) + 1;
  }

  if (gameType === 'flappy') {
    next.flappyBestPipes = Math.max(next.flappyBestPipes, numericScore);
    next.flappyBestRunMs = Math.max(next.flappyBestRunMs, Number(survivalMs) || 0);
    const runMs = Number(survivalMs) || 0;
    if (won && runMs > 0) {
      next.fastestFlappyWinMs = next.fastestFlappyWinMs === 0
        ? runMs
        : Math.min(next.fastestFlappyWinMs, runMs);
    }
  }

  writeStore(next);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('personal-bests:update'));
  return next;
}

export function clearPersonalBests() {
  const next = { ...DEFAULTS };
  writeStore(next);
  return next;
}

export { STORAGE_KEY };
