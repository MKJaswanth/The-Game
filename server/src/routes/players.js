import { Router } from 'express';
import { inMemoryScores } from './scores.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';

const router = Router();

/**
 * Compute player stats (totals + per-game bests) from the in-memory score store.
 */
function computeInMemoryStats(nickname) {
  const games = inMemoryScores.filter(
    (s) => s.nickname.toLowerCase() === nickname.toLowerCase()
  );

  if (games.length === 0) return null;

  const totalScore = games.reduce((sum, g) => sum + g.score, 0);
  const wins = games.filter((g) => g.won).length;

  const bestByGameType = {};
  for (const g of games) {
    if (!bestByGameType[g.gameType] || g.score > bestByGameType[g.gameType].score) {
      bestByGameType[g.gameType] = { gameType: g.gameType, bestScore: g.score };
    }
  }

  return {
    nickname,
    totalScore,
    gamesPlayed: games.length,
    totalWins: wins,
    bestScores: Object.values(bestByGameType)
  };
}

/**
 * GET /api/players/:nickname — aggregate stats for a player (M10-01 / US-023)
 */
router.get('/:nickname', async (req, res) => {
  const { nickname } = req.params;
  const cleanNick = (nickname || '').trim();
  if (!cleanNick || cleanNick.length < 3 || cleanNick.length > 20) {
    return res.status(400).json({ success: false, error: 'Invalid nickname' });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: player, error: playerErr } = await supabase
        .from('players')
        .select('id, nickname, total_score, games_played')
        .eq('nickname', cleanNick)
        .single();

      if (!playerErr && player) {
        const { data: scoreRows, error: scoreErr } = await supabase
          .from('scores')
          .select('game_type, score, won')
          .eq('player_id', player.id);

        if (!scoreErr) {
          const rows = scoreRows || [];
          const totalWins = rows.filter((r) => r.won).length;

          const bestByGameType = {};
          for (const r of rows) {
            if (!bestByGameType[r.game_type] || r.score > bestByGameType[r.game_type].score) {
              bestByGameType[r.game_type] = { gameType: r.game_type, bestScore: r.score };
            }
          }

          return res.json({
            success: true,
            player: {
              nickname: player.nickname,
              totalScore: player.total_score || 0,
              gamesPlayed: player.games_played || 0,
              totalWins,
              bestScores: Object.values(bestByGameType),
              source: 'supabase'
            }
          });
        }
      }
      // fall through to in-memory if supabase miss
    } catch (dbErr) {
      console.warn(`[Players DB Error] Falling back to in-memory: ${dbErr.message}`);
    }
  }

  const stats = computeInMemoryStats(cleanNick);
  if (!stats) {
    return res.status(404).json({ success: false, error: 'Player not found' });
  }
  return res.json({ success: true, player: { ...stats, source: 'memory' } });
});

/**
 * GET /api/players/:nickname/history — last 20 games (M10-02 / US-024)
 */
router.get('/:nickname/history', async (req, res) => {
  const { nickname } = req.params;
  const cleanNick = (nickname || '').trim();
  if (!cleanNick || cleanNick.length < 3 || cleanNick.length > 20) {
    return res.status(400).json({ success: false, error: 'Invalid nickname' });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: player, error: playerErr } = await supabase
        .from('players')
        .select('id')
        .eq('nickname', cleanNick)
        .single();

      if (!playerErr && player) {
        const { data: rows, error: histErr } = await supabase
          .from('scores')
          .select('id, game_type, score, won, played_at')
          .eq('player_id', player.id)
          .order('played_at', { ascending: false })
          .limit(20);

        if (!histErr) {
          const history = (rows || []).map((r) => ({
            id: r.id,
            gameType: r.game_type,
            score: r.score,
            won: r.won,
            playedAt: r.played_at
          }));
          return res.json({ success: true, history, source: 'supabase' });
        }
      }
      // fall through to in-memory if supabase miss
    } catch (dbErr) {
      console.warn(`[Players DB Error] Falling back to in-memory: ${dbErr.message}`);
    }
  }

  const history = inMemoryScores
    .filter((s) => s.nickname.toLowerCase() === cleanNick.toLowerCase())
    .slice(-20)
    .reverse()
    .map((s) => ({
      id: s.id,
      gameType: s.gameType,
      score: s.score,
      won: s.won,
      playedAt: s.playedAt
    }));

  return res.json({ success: true, history, source: 'memory' });
});

export default router;
