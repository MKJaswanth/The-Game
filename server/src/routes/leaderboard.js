import { Router } from 'express';
import { inMemoryScores } from './scores.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';

const router = Router();

/**
 * Fetch top 20 leaderboard entries, optionally filtered by gameType
 */
async function getLeaderboardData(gameType) {
  const cleanType = gameType && gameType.toLowerCase() !== 'all' ? gameType.toLowerCase().trim() : null;

  if (isSupabaseConfigured && supabase) {
    try {
      if (!cleanType) {
        // Global Leaderboard: Aggregate across all games per player
        const { data, error } = await supabase
          .from('players')
          .select('id, nickname, total_score, games_played, created_at')
          .order('total_score', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          return data.map((item, idx) => ({
            rank: idx + 1,
            id: item.id,
            nickname: item.nickname || 'Anonymous',
            gameType: 'all',
            score: item.total_score || 0,
            gamesPlayed: item.games_played || 0,
            playedAt: item.created_at
          }));
        }
      } else {
        // Filtered by specific game: best score per player in that game
        const { data, error } = await supabase
          .from('scores')
          .select(`
            id,
            score,
            game_type,
            won,
            played_at,
            players (
              nickname
            )
          `)
          .eq('game_type', cleanType)
          .order('score', { ascending: false })
          .limit(50);

        if (!error && data) {
          const seen = new Set();
          const uniqueRows = [];
          for (const item of data) {
            const nick = item.players?.nickname || 'Anonymous';
            const key = nick.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              uniqueRows.push({
                rank: uniqueRows.length + 1,
                id: item.id,
                nickname: nick,
                gameType: item.game_type,
                score: item.score,
                won: item.won,
                playedAt: item.played_at
              });
              if (uniqueRows.length === 20) break;
            }
          }
          return uniqueRows;
        }
      }
    } catch (dbErr) {
      console.warn(`[Leaderboard DB Error] Falling back to in-memory: ${dbErr.message}`);
    }
  }

  // Fallback to in-memory store
  if (!cleanType) {
    // Global Leaderboard: Aggregate total score across all games per player
    const playerMap = new Map();
    for (const s of inMemoryScores) {
      const key = (s.nickname || 'Player').toLowerCase();
      if (!playerMap.has(key)) {
        playerMap.set(key, {
          id: s.id,
          nickname: s.nickname || 'Player',
          gameType: 'all',
          score: 0,
          gamesPlayed: 0,
          won: false,
          playedAt: s.playedAt
        });
      }
      const p = playerMap.get(key);
      p.score += Number(s.score) || 0;
      p.gamesPlayed += 1;
      if (s.won) p.won = true;
      if (s.playedAt && (!p.playedAt || new Date(s.playedAt) > new Date(p.playedAt))) {
        p.playedAt = s.playedAt;
      }
    }

    const aggregated = Array.from(playerMap.values());
    aggregated.sort((a, b) => b.score - a.score);
    return aggregated.slice(0, 20).map((item, idx) => ({
      rank: idx + 1,
      ...item
    }));
  }

  // Filtered by specific game: take each player's best score in that game
  const filtered = inMemoryScores.filter(s => s.gameType.toLowerCase() === cleanType);
  const bestByPlayer = new Map();
  for (const s of filtered) {
    const key = (s.nickname || 'Player').toLowerCase();
    const existing = bestByPlayer.get(key);
    if (!existing || s.score > existing.score) {
      bestByPlayer.set(key, s);
    }
  }

  const bestList = Array.from(bestByPlayer.values());
  bestList.sort((a, b) => b.score - a.score);
  return bestList.slice(0, 20).map((item, idx) => ({
    rank: idx + 1,
    id: item.id,
    nickname: item.nickname,
    gameType: item.gameType,
    score: item.score,
    won: item.won,
    playedAt: item.playedAt
  }));
}

// GET /api/leaderboard (with optional ?gameType= query)
router.get('/', async (req, res) => {
  try {
    const { gameType } = req.query;
    const leaderboard = await getLeaderboardData(gameType);
    return res.json({ success: true, leaderboard });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leaderboard/:gameType
router.get('/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    const leaderboard = await getLeaderboardData(gameType);
    return res.json({ success: true, leaderboard });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
