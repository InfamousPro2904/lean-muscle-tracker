-- Feedback / Feature Requests board
-- Shared across all users (public read, author write)

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,                        -- cached display name at time of post
  title       TEXT NOT NULL,
  body        TEXT,
  category    TEXT NOT NULL DEFAULT 'feature',  -- 'feature' | 'bug' | 'improvement' | 'question'
  status      TEXT NOT NULL DEFAULT 'open',     -- 'open' | 'under_review' | 'planned' | 'implemented' | 'wont_fix'
  upvotes     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Upvote junction table (one upvote per user per item)
CREATE TABLE IF NOT EXISTS feedback_upvotes (
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (feedback_id, user_id)
);

-- Auto-update updated_at on feedback row changes
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at_trigger
  BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_upvotes ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all feedback
CREATE POLICY "feedback_select_all"
  ON feedback FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can submit feedback
CREATE POLICY "feedback_insert_own"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only the author can update their own post
CREATE POLICY "feedback_update_own"
  ON feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authors can delete their own posts
CREATE POLICY "feedback_delete_own"
  ON feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Upvotes: any authenticated user can read
CREATE POLICY "upvotes_select_all"
  ON feedback_upvotes FOR SELECT
  TO authenticated
  USING (true);

-- Users can add their own upvote
CREATE POLICY "upvotes_insert_own"
  ON feedback_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own upvote
CREATE POLICY "upvotes_delete_own"
  ON feedback_upvotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Realtime ─────────────────────────────────────────────────────
-- Enable realtime for the feedback table so the board updates live.
-- Run in Supabase dashboard: Realtime > Tables > enable 'feedback'
-- Or via supabase CLI: supabase realtime enable feedback

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS feedback_status_idx  ON feedback(status);
CREATE INDEX IF NOT EXISTS feedback_category_idx ON feedback(category);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);
