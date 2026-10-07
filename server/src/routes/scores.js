import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';

const router = Router();

// In-memory score store fallback
export const inMemoryScores = [];

// Helper function to record score both in-memory and in Supabase
export async function recordScore(nickname, gameType, score, won = false) {
  const numScore = parseInt(score, 10);
  if (isNaN(numScore) || numScore < 0) {
    throw new Error('Valid positive integer score is required');
  }

  const newScore = {
    id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    nickname: nickname.trim(),
    gameType: gameType.trim(),
    score: numScore,
    won: Boolean(won),
    playedAt: new Date().toISOString()
  };

  inMemoryScores.push(newScore);
  console.log(`[Scores] Recorded score for ${newScore.nickname}: ${newScore.score} in ${newScore.gameType}`);

  // If Supabase is configured, persist to database
  if (isSupabaseConfigured && supabase) {
    try {
      let { data: player } = await supabase
        .from('players')
        .select('id, total_score, games_played')
        .eq('nickname', newScore.nickname)
        .single();

      if (!player) {
        const { data: createdPlayer } = await supabase
          .from('players')
          .insert({ nickname: newScore.nickname })
          .select('id, total_score, games_played')
          .single();
        player = createdPlayer;
      }

      if (player) {
        await supabase.from('scores').insert({
          player_id: player.id,
          game_type: newScore.gameType,
          score: newScore.score,
          won: newScore.won
        });

        await supabase
          .from('players')
          .update({
            total_score: (player.total_score || 0) + newScore.score,
            games_played: (player.games_played || 0) + 1
          })
          .eq('id', player.id);
      }
    } catch (err) {
      console.warn(`[Scores DB Error] Could not sync to Supabase: ${err.message}`);
    }
  }

  return newScore;
}

router.post('/', async (req, res) => {
  const { nickname, gameType, score, won = false } = req.body;

  if (!nickname || typeof nickname !== 'string') {
    return res.status(400).json({ success: false, error: 'Nickname is required' });
  }

  if (!gameType || typeof gameType !== 'string') {
    return res.status(400).json({ success: false, error: 'Game type is required' });
  }

  try {
    const newScore = await recordScore(nickname, gameType, score, won);
    return res.status(201).json({
      success: true,
      score: newScore
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
