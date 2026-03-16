-- Polynew database schema for Neon Postgres
-- Run this in your Neon SQL editor or via psql

-- users 表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(42) UNIQUE NOT NULL,
  credits INT DEFAULT 50,
  tavily_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- analysis_results 表
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL,
  event_title TEXT,
  event_slug VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_event ON analysis_results(user_id, event_id);
