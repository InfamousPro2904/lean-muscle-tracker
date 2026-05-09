-- Migration 004: Phase 2 Features
-- - Leaderboard auto_archive + is_public toggles
-- - Multi-item meal grouping via meal_session_id
-- - meal_templates (saved meal compositions)
-- - food_favorites (Phase 3 placeholder, table created so app can be deployed once)

-- ── leaderboards: settings columns ──────────────────────────────────────────
ALTER TABLE leaderboards ADD COLUMN IF NOT EXISTS auto_archive BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE leaderboards ADD COLUMN IF NOT EXISTS is_public    BOOLEAN NOT NULL DEFAULT false;

-- ── meal_logs: meal_session_id for grouping multi-item meals ────────────────
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS meal_session_id UUID;
CREATE INDEX IF NOT EXISTS meal_logs_session_idx
  ON meal_logs(meal_session_id) WHERE meal_session_id IS NOT NULL;

-- ── meal_templates: saved meal compositions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_templates (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name              TEXT NOT NULL,
  default_meal_type TEXT,
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_favorite       BOOLEAN NOT NULL DEFAULT false,
  use_count         INTEGER NOT NULL DEFAULT 0,
  last_used_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_own"
  ON meal_templates FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS meal_templates_user_idx ON meal_templates(user_id, last_used_at DESC NULLS LAST);

-- ── food_favorites: starred foods (Phase 3 placeholder) ─────────────────────
CREATE TABLE IF NOT EXISTS food_favorites (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  food_name     TEXT NOT NULL,
  per_100g      JSONB NOT NULL,
  use_count     INTEGER NOT NULL DEFAULT 0,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, food_name)
);

ALTER TABLE food_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_own"
  ON food_favorites FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS food_favorites_user_idx ON food_favorites(user_id, last_used_at DESC NULLS LAST);
