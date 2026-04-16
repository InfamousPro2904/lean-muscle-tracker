# Supabase Setup Guide (Free Tier)

## New: Feedback Table Migration (2026-04-14)

Run `supabase/migrations/001_feedback.sql` in the Supabase SQL Editor to create
the shared `feedback` and `feedback_upvotes` tables with RLS.

After running the migration, enable Realtime on the `feedback` table:
Supabase Dashboard > Realtime > Tables > toggle ON `feedback`

Also add these two RPC functions to your schema for upvote counts:
```sql
CREATE OR REPLACE FUNCTION increment_feedback_upvotes(fid UUID)
RETURNS VOID AS $$
  UPDATE feedback SET upvotes = upvotes + 1 WHERE id = fid;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION decrement_feedback_upvotes(fid UUID)
RETURNS VOID AS $$
  UPDATE feedback SET upvotes = GREATEST(0, upvotes - 1) WHERE id = fid;
$$ LANGUAGE SQL;
```

---

## Step 1: Create Account
1. Go to https://supabase.com
2. Click "Start your project" → Sign up with **GitHub** (easiest)
3. Authorize the app

## Step 2: Create Project
1. Click **"New Project"**
2. Fill in:
   - **Name:** `lean-muscle-tracker`
   - **Database Password:** Choose something strong (save it somewhere!)
   - **Region:** Pick closest to your location (e.g., Mumbai for India)
3. Click **"Create new project"** — wait ~2 minutes for setup

## Step 3: Get Your Keys
1. In your project dashboard, go to **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL:** `https://your-project-id.supabase.co`
   - **anon / public key:** Starts with `eyJ...` (long string)
3. Paste them into `.env.local` in the project root:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJyour-key-here
   ```

## Step 4: Run the Database Setup
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the ENTIRE contents of `supabase/schema.sql` from this project
4. Paste it into the SQL editor
5. Click **"Run"** (or Ctrl+Enter)
6. You should see "Success. No rows returned" — that means it worked!

## Step 5: Enable Auth
1. Go to **Authentication** (left sidebar) → **Providers**
2. **Email** should already be enabled (default)
3. Optional: Disable "Confirm email" for easier testing:
   - Go to **Authentication** → **Settings**
   - Under "Email Auth", toggle OFF "Enable email confirmations"

## You're done! Run the app:
```bash
cd web-development/lean-muscle-tracker
npm run dev
```
Open http://localhost:3000
