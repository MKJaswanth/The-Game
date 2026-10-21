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
      let query = supabase
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
        .order('score', { ascending: false })
        .limit(20);

      if (cleanType) {
        query = query.eq('game_type', cleanType);
      }

      const { data, error } = await query;
      if (!error && data) {
        const mapped = data.map((item, idx) => ({
          rank: idx + 1,
          id: item.id,
          nickname: item.players?.nickname || 'Anonymous',
          gameType: item.game_type,
          score: item.score,
          won: item.won,
          playedAt: item.played_at
        }));
        return mapped;
      }
    } catch (dbErr) {
      console.warn(`[Leaderboard DB Error] Falling back to in-memory: ${dbErr.message}`);
    }
  }

  // Fallback to in-memory store
  let filtered = [...inMemoryScores];
  if (cleanType) {
    filtered = filtered.filter(s => s.gameType.toLowerCase() === cleanType);
  }

  filtered.sort((a, b) => b.score - a.score);
  return filtered.slice(0, 20).map((item, idx) => ({
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
