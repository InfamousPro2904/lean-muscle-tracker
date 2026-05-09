-- Migration 003: Fix self-referential RLS on leaderboard_members
-- Replaces the recursive EXISTS subquery with SECURITY DEFINER helper functions
-- that bypass RLS when checking group membership (prevents infinite recursion).

-- ── Helper: get all leaderboard IDs the calling user belongs to ──────────────
CREATE OR REPLACE FUNCTION public.get_my_leaderboard_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT DISTINCT leaderboard_id
    FROM leaderboard_members
    WHERE user_id = auth.uid()
  );
$$;

-- ── Helper: check if two users share any leaderboard ─────────────────────────
CREATE OR REPLACE FUNCTION public.shares_leaderboard_with_me(_other_user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM leaderboard_members my_mem
    JOIN leaderboard_members their_mem
      ON my_mem.leaderboard_id = their_mem.leaderboard_id
    WHERE my_mem.user_id   = auth.uid()
      AND their_mem.user_id = _other_user_id
  );
$$;

-- ── leaderboard_members: drop recursive policy, replace with two simple ones ──
DROP POLICY IF EXISTS "lb_members_same_group_read" ON leaderboard_members;

CREATE POLICY "lb_members_own_read"
  ON leaderboard_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "lb_members_group_read"
  ON leaderboard_members FOR SELECT
  USING (leaderboard_id = ANY(get_my_leaderboard_ids()));

-- ── daily_logs: replace recursive join with helper function ───────────────────
DROP POLICY IF EXISTS "daily_logs_member_read" ON daily_logs;

CREATE POLICY "daily_logs_member_read"
  ON daily_logs FOR SELECT
  USING (shares_leaderboard_with_me(user_id));

-- ── badges: same treatment ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "badges_member_read" ON badges;

CREATE POLICY "badges_member_read"
  ON badges FOR SELECT
  USING (
    leaderboard_id IS NOT NULL
    AND leaderboard_id = ANY(get_my_leaderboard_ids())
  );

-- ── reactions: replace chained join with helper ───────────────────────────────
DROP POLICY IF EXISTS "reactions_member_read" ON reactions;

CREATE POLICY "reactions_member_read"
  ON reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM weekly_archives wa
      WHERE wa.id = reactions.archive_id
        AND wa.leaderboard_id = ANY(get_my_leaderboard_ids())
    )
  );
