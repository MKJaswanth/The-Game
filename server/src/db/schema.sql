-- The Game Database Schema (PostgreSQL / Supabase)

-- 1. Players Table
CREATE TABLE IF NOT EXISTS players (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname     TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  total_score  INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0
);

-- 2. Game Sessions Table
CREATE TABLE IF NOT EXISTS game_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type  TEXT NOT NULL,          -- 'snake', 'trivia', 'wordscramble', 'tictactoe'
  room_code  TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at   TIMESTAMPTZ,
  status     TEXT DEFAULT 'waiting'  -- 'waiting', 'active', 'finished'
);

-- 3. Scores Table
CREATE TABLE IF NOT EXISTS scores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID REFERENCES players(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  game_type  TEXT NOT NULL,
  score      INTEGER NOT NULL,
  won        BOOLEAN DEFAULT false,
  played_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_players_nickname ON players(nickname);
CREATE INDEX IF NOT EXISTS idx_scores_game_type ON scores(game_type);
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_played_at ON scores(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_room ON game_sessions(room_code);
