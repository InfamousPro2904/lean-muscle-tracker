-- Migration 002: Social Leaderboard Feature
-- Run in Supabase SQL Editor after 001_feedback.sql

-- ═══════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Unified daily log — one row per user per date
-- Serves as the source of truth for leaderboard scoring
CREATE TABLE IF NOT EXISTS daily_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  kcal_in      INTEGER NOT NULL DEFAULT 0,
  kcal_burnt   INTEGER NOT NULL DEFAULT 0,
  workout_done BOOLEAN NOT NULL DEFAULT false,
  is_rest_day  BOOLEAN NOT NULL DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Leaderboard groups (invite-only)
CREATE TABLE IF NOT EXISTS leaderboards (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Per-leaderboard membership with goal questionnaire
CREATE TABLE IF NOT EXISTS leaderboard_members (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leaderboard_id    UUID REFERENCES leaderboards(id) ON DELETE CASCADE NOT NULL,
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_type         TEXT NOT NULL DEFAULT 'athletic',   -- cut | bulk | athletic
  target_weight_kg  DECIMAL(5,2),
  start_weight_kg   DECIMAL(5,2),
  current_weight_kg DECIMAL(5,2),
  activity_level    TEXT NOT NULL DEFAULT 'moderate',  -- sedentary | light | moderate | active | very_active
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(leaderboard_id, user_id)
);

-- Archived completed weeks (creator archives at end of week)
CREATE TABLE IF NOT EXISTS weekly_archives (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE NOT NULL,
  week_start     DATE NOT NULL,
  week_end       DATE NOT NULL,
  winner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scores         JSONB NOT NULL DEFAULT '{}',
  archived_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(leaderboard_id, week_start)
);

-- Earned badges
CREATE TABLE IF NOT EXISTS badges (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE,
  badge_type     TEXT NOT NULL,
  meta           JSONB DEFAULT '{}',
  earned_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, leaderboard_id, badge_type)
);

-- Emoji reactions on archived weeks
CREATE TABLE IF NOT EXISTS reactions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  archive_id     UUID REFERENCES weekly_archives(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji          TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(archive_id, target_user_id, from_user_id, emoji)
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB DEFAULT '{}',
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

-- Auto-update updated_at on daily_logs
CREATE OR REPLACE FUNCTION update_daily_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_log_updated_at ON daily_logs;
CREATE TRIGGER daily_log_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION update_daily_log_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE daily_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_archives     ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- ── daily_logs ──────────────────────────────────────────────────────
-- Own full access
CREATE POLICY "daily_logs_own"
  ON daily_logs FOR ALL
  USING (auth.uid() = user_id);

-- Leaderboard members can read each other's daily logs
CREATE POLICY "daily_logs_member_read"
  ON daily_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM leaderboard_members my_mem
      JOIN leaderboard_members their_mem
        ON my_mem.leaderboard_id = their_mem.leaderboard_id
      WHERE my_mem.user_id   = auth.uid()
        AND their_mem.user_id = daily_logs.user_id
    )
  );

-- ── profiles (extend existing RLS to allow leaderboard member reads) ─
DROP POLICY IF EXISTS "Leaderboard members can view member profiles" ON profiles;
CREATE POLICY "Leaderboard members can view member profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM leaderboard_members my_mem
      JOIN leaderboard_members their_mem
        ON my_mem.leaderboard_id = their_mem.leaderboard_id
      WHERE my_mem.user_id   = auth.uid()
        AND their_mem.user_id = profiles.id
    )
  );

-- ── leaderboards ────────────────────────────────────────────────────
-- Any authenticated user can look up by invite code (for join flow)
CREATE POLICY "leaderboards_invite_lookup"
  ON leaderboards FOR SELECT
  USING (true);  -- invite code is the access control; visibility is fine

-- Authenticated user can create
CREATE POLICY "leaderboards_insert_own"
  ON leaderboards FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only creator can update/delete
CREATE POLICY "leaderboards_update_own"
  ON leaderboards FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "leaderboards_delete_own"
  ON leaderboards FOR DELETE
  USING (auth.uid() = created_by);

-- ── leaderboard_members ─────────────────────────────────────────────
-- Members of same leaderboard can see each other
CREATE POLICY "lb_members_same_group_read"
  ON leaderboard_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM leaderboard_members my_mem
      WHERE my_mem.leaderboard_id = leaderboard_members.leaderboard_id
        AND my_mem.user_id = auth.uid()
    )
  );

-- Anyone can join (insert own membership)
CREATE POLICY "lb_members_join"
  ON leaderboard_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Members can update their own membership (update weight, goals)
CREATE POLICY "lb_members_update_own"
  ON leaderboard_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Members can leave
CREATE POLICY "lb_members_leave"
  ON leaderboard_members FOR DELETE
  USING (auth.uid() = user_id);

-- Creator can remove members too
CREATE POLICY "lb_members_creator_manage"
  ON leaderboard_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM leaderboards
      WHERE id = leaderboard_members.leaderboard_id
        AND created_by = auth.uid()
    )
  );

-- ── weekly_archives ─────────────────────────────────────────────────
CREATE POLICY "archives_member_read"
  ON weekly_archives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leaderboard_members
      WHERE leaderboard_id = weekly_archives.leaderboard_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "archives_creator_insert"
  ON weekly_archives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leaderboards
      WHERE id = weekly_archives.leaderboard_id
        AND created_by = auth.uid()
    )
  );

-- ── badges ──────────────────────────────────────────────────────────
CREATE POLICY "badges_own"
  ON badges FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "badges_member_read"
  ON badges FOR SELECT
  USING (
    leaderboard_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM leaderboard_members
      WHERE leaderboard_id = badges.leaderboard_id
        AND user_id = auth.uid()
    )
  );

-- ── reactions ───────────────────────────────────────────────────────
CREATE POLICY "reactions_member_read"
  ON reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM weekly_archives wa
      JOIN leaderboard_members lm ON lm.leaderboard_id = wa.leaderboard_id
      WHERE wa.id = reactions.archive_id
        AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "reactions_insert_own"
  ON reactions FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "reactions_delete_own"
  ON reactions FOR DELETE
  USING (auth.uid() = from_user_id);

-- ── notifications ───────────────────────────────────────────────────
CREATE POLICY "notifications_own"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS daily_logs_user_date    ON daily_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS lb_members_lb_id        ON leaderboard_members(leaderboard_id);
CREATE INDEX IF NOT EXISTS lb_members_user_id      ON leaderboard_members(user_id);
CREATE INDEX IF NOT EXISTS archives_lb_week        ON weekly_archives(leaderboard_id, week_start DESC);
CREATE INDEX IF NOT EXISTS badges_user_lb          ON badges(user_id, leaderboard_id);
CREATE INDEX IF NOT EXISTS notifs_user_unread      ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS reactions_archive_id    ON reactions(archive_id);
