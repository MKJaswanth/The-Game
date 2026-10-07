import { Router } from 'express';
import { inMemoryScores } from './scores.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  const { gameType } = req.query;

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

      if (gameType) {
        query = query.eq('game_type', gameType);
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
        return res.json({ success: true, leaderboard: mapped });
      }
    } catch (dbErr) {
      console.warn(`[Leaderboard DB Error] Falling back to in-memory: ${dbErr.message}`);
    }
  }

  // Fallback to in-memory store
  let filtered = [...inMemoryScores];
  if (gameType) {
    filtered = filtered.filter(s => s.gameType.toLowerCase() === gameType.toLowerCase());
  }

  filtered.sort((a, b) => b.score - a.score);
  const top20 = filtered.slice(0, 20).map((item, idx) => ({
    rank: idx + 1,
    ...item
  }));

  return res.json({
    success: true,
    leaderboard: top20
  });
});

export default router;
