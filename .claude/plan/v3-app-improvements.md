# Lean Muscle Tracker — v3 Improvement Plan

**Author:** Opus 4.7 audit + planning pass
**Implementer:** Sonnet 4.6
**Repo:** `web-development/lean-muscle-tracker`
**Date:** 2026-05 (current)

This plan covers four pillars based on a full app audit:

1. **Bugs & vulnerabilities** caught from code review + Supabase advisor
2. **Cross-feature integrations** to make the existing pieces talk to each other
3. **UX-level enhancements** to existing features
4. **New advanced features** for stickiness + insight

Each section is split into discrete tasks with concrete acceptance criteria. Sonnet should implement Phase 1 first (highest impact + lowest risk), then prompt the user before continuing to Phases 2-4.

---

## Phase 1 — Bullseye (high impact, low effort, ship first)

These are the things that immediately make the app feel more "connected" and should be done together as one coherent release.

### 1.1 Cross-feature: Workout → Diet refuel prompt (NEW)

**Why:** Right after a user logs a workout, the natural next action is to log a post-workout meal. Today there's no cue.

**What to build:**
- After `saveWorkoutLog()` succeeds in `src/app/(app)/workouts/page.tsx`, instead of navigating straight to History, show a **toast prompt** for ~6 seconds:
  > 🥩 Just burnt **285 kcal**. Log your post-workout meal? *[Log meal →]*
- The button navigates to `/diet?meal_type=Post-Workout&suggest_protein=true&kcal_burnt=285`
- `/diet` reads the query params:
  - Sets `mealType` state to the requested meal_type
  - Shows a **green hint banner** above the search box: *"You burnt 285 kcal — eat 30-40g protein within 2 hours. Try chicken, paneer, eggs, or whey."*
  - Filters Quick Foods to show only `category: protein` items first (until user types in search)

**Acceptance:**
- [ ] After logging a non-rest workout, user sees the toast prompt for ~6 seconds
- [ ] Tapping the prompt deep-links into diet with meal type pre-selected
- [ ] The protein-rich Quick Foods rearrangement only happens when `?suggest_protein=true` is present

### 1.2 Cross-feature: Progress → Profile → Leaderboard auto-sync

**Why:** A user logs body weight in `/progress` daily, but `profiles.weight_kg` and `leaderboard_members.current_weight_kg` stay stale. This breaks scoring (TDEE wrong, goal-progress wrong).

**What to build:**
- In `src/app/(app)/progress/page.tsx`, modify `handleSave` so that after the `progress_logs` insert:
  ```typescript
  if (parseFloat(weightKg) > 0) {
    await supabase.from('profiles').update({ weight_kg: parseFloat(weightKg) }).eq('id', user.id)
    // Also update all this user's leaderboard_member rows
    await supabase.from('leaderboard_members')
      .update({ current_weight_kg: parseFloat(weightKg) })
      .eq('user_id', user.id)
  }
  ```
- Add a one-line confirmation message after save: *"✓ Profile + leaderboards updated"*
- Reverse path: if user changes `current_weight_kg` in MemberSettingsModal, also update `profiles.weight_kg`

**Acceptance:**
- [ ] Logging a new weight in /progress immediately updates the dashboard "Body Weight" card
- [ ] Updating weight from leaderboard My Settings updates /progress chart on next load

### 1.3 Cross-feature: Today's routine on dashboard

**Why:** User has weekly routine schedules (`workout_routines.day_of_week`) but the dashboard never tells them what to do today.

**What to build:**
- New section on `src/app/(app)/dashboard/page.tsx` placed below "This Week summary":
  ```
  Today's Plan · Tuesday
  ─────────────────────
  💪 Push Day (PPL routine)
     5 exercises · ~60 min target
     [Start workout →]
  ```
- Logic: query `workout_routines` for the user, filter where `day_of_week` array contains today's day index. If multiple, show a list. If none, show *"No workout scheduled today — Rest day? Yoga? [Browse routines]"*
- "Start workout" button deep-links to `/workouts?tab=log&routine=<id>` (workouts page reads this query param to auto-select)

**Acceptance:**
- [ ] Dashboard shows the day's scheduled routine name + exercise count
- [ ] Multiple routines show as separate cards
- [ ] Empty state on rest days suggests browsing or stretching

### 1.4 Cross-feature: Streak + badges surfacing on dashboard

**Why:** User has streaks (calculateStreak) and badges visible in leaderboard but not on dashboard. These are motivating signals.

**What to build:**
- Add `Activity` ring/card to dashboard header: streak icon + `7-day streak 🔥`
- Compute streak from `daily_logs` (already in scoring.ts)
- Below "This Week" tile, add a horizontal scrolling badge list with all badges earned across leaderboards
  ```
  Recent Badges
  ─────────────
  [🔥 7-day Streak] [👑 Week Champion] [💪 Top Scorer]
  ```
- Tap a badge → modal showing what it means + which leaderboard

**Acceptance:**
- [ ] Streak number visible on dashboard
- [ ] Last 5-10 badges shown as chips
- [ ] Empty state: *"Log a daily entry to start your streak!"*

### 1.5 Critical: Globalize the notification panel

**Why:** Notifications panel only lives on the leaderboard detail page header. Users never see notifications unless they happen to navigate there.

**What to build:**
- Move the bell icon into the `Navbar` (top-right of mobile header, top of desktop sidebar)
- Drop the `leaderboardId` filter — show ALL notifications for the user
- Group by source (leaderboard name when present, else "App")
- Add unread count badge on the Navbar bell

**Files:**
- Move `src/components/leaderboard/NotificationsPanel.tsx` → `src/components/NotificationsPanel.tsx`
- Add to `src/components/Navbar.tsx` desktop AND mobile rendering
- Remove from `src/app/(app)/leaderboard/[id]/page.tsx` header (keep the `leaderboardId` filter capability for that location optional — can still pass the prop)

**Acceptance:**
- [ ] Bell visible on every page
- [ ] Unread badge across all leaderboards
- [ ] Tap → see the last 30 notifications grouped by source

### 1.6 Bug: Validations missing across forms

**Why:** No bound checks on numeric inputs. Garbage inputs save without errors.

**What to build:**
- Helper `clampNumber(value, min, max, default)` in a new `src/lib/validation.ts`
- Apply to:
  - `daily_logs`: kcal_in [0, 9999], kcal_burnt [0, 5000]
  - `progress_logs.weight_kg` [30, 300], `body_fat_pct` [3, 60]
  - `meal_logs`: kcal [0, 5000], macros [0, 500]
  - `leaderboard_members`: weights [30, 300]
- All number inputs: `min={...} max={...}` HTML attributes + JS `Math.max(min, Math.min(max, parsed))`

**Acceptance:**
- [ ] Cannot save kcal_in = 99999
- [ ] Cannot save body_fat_pct = 150
- [ ] User-friendly error if value out of range

### 1.7 Security: Lock down SECURITY DEFINER functions

**Why:** Supabase advisor flagged `handle_new_user` and `rls_auto_enable` as callable via RPC by anonymous and authenticated users. Internal helpers should be revoked.

**What to build:** New migration `005_security_hardening.sql`:
```sql
-- Internal helpers — should NEVER be called via API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- Set explicit search_path on all SECURITY DEFINER functions
ALTER FUNCTION public.update_feedback_updated_at() SET search_path = '';
ALTER FUNCTION public.increment_feedback_upvotes(uuid) SET search_path = '';
ALTER FUNCTION public.decrement_feedback_upvotes(uuid) SET search_path = '';
ALTER FUNCTION public.update_daily_log_updated_at() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.get_my_leaderboard_ids() SET search_path = public, pg_temp;
ALTER FUNCTION public.shares_leaderboard_with_me(uuid) SET search_path = public, pg_temp;

-- Anonymous users should not call any RPC
REVOKE EXECUTE ON FUNCTION public.get_my_leaderboard_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_leaderboard_with_me(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_feedback_upvotes(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_feedback_upvotes(uuid) FROM anon;
```

Note: Do NOT revoke from `authenticated` for `get_my_leaderboard_ids` / `shares_leaderboard_with_me` — these are used by RLS policies and need to remain executable for signed-in users.

**Acceptance:**
- [ ] Migration applies cleanly
- [ ] Existing RLS still works (test by viewing leaderboard, daily logs as another user)
- [ ] `handle_new_user` no longer callable via REST RPC

### 1.8 Bug: Search timer cleanup on unmount

**Why:** `src/app/(app)/diet/page.tsx` `searchTimerRef` setTimeout is never cleared on component unmount. Memory leak + can fire after navigation.

**Fix:** Add to the existing search useEffect:
```typescript
useEffect(() => {
  // ... existing logic
  return () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
  }
}, [searchQuery])
```

### 1.9 Bug: Fix `confetti` runs forever

**Why:** `src/app/(app)/leaderboard/[id]/page.tsx` `Confetti` component starts a CSS animation that runs `2.5s + 1.05s` worst case, but the `setShowConfetti` state is set to false after 4s — there's a brief overlap. Also the 48 DOM nodes stay rendered until unmount. Minor but tidy.

**Fix:** Increase setTimeout from 4000ms to 4500ms to ensure animation completes; add CSS `pointer-events: none` is already there. Acceptable as-is, low priority.

### 1.10 Polish: Empty states across the app

**Why:** New users land on /diet, /workouts, etc. with mostly nothing logged. Today's pages just show empty grids.

**What to build:** Branded empty states with one CTA each:
- `/diet` (no meals today): *"Track your first meal — search 'banana' or pick from Quick Foods 👇"*
- `/workouts` (no routines): *"Build a routine or browse the AI Planner from your dashboard"*
- `/progress` (no logs): *"Step on the scale once a week — small data unlocks big insights"*
- `/leaderboard` (no groups): already good

---

## Phase 2 — Core feature enhancements

### 2.1 Workouts: PR (personal record) tracking

**Why:** Users grind for PRs. App should celebrate them.

**What to build:**
- New `src/lib/prs.ts` with helpers:
  - `findExercisePRs(exerciseLogs: ExerciseLog[]): Map<exerciseName, { maxWeight, maxReps, max1RM }>` (1RM via Epley formula: `w * (1 + reps/30)`)
- In workouts page, when displaying a session in History expanded view, mark sets that are a PR with a 🏆 badge
- In `saveWorkoutLog`, after insert, query the user's previous best for each exercise. If any new set is a new max-weight or max-1RM, insert a `notification`:
  > 🏆 New PR: Bench Press 80kg × 8 reps (1RM ≈ 100kg)

**Acceptance:**
- [ ] PR badges visible in expanded workout history
- [ ] Notification sent on new PR

### 2.2 Workouts: "Use last weights" / Repeat last session

**Why:** When logging the same routine multiple times, you want last week's loads as the starting point.

**What to build:**
- When user selects a routine in Log Workout tab, fetch the most recent `workout_log` for that routine_id
- For each exercise in the routine, pre-fill `set_number, reps, weight_kg` from the previous session
- Add a button: *"Repeat last [routine name]"* in the Log tab top
- Show a subtle hint per set: *"Last time: 60kg × 8"* below the weight input

### 2.3 Workouts: Filter history by exercise / muscle group

**What to build:**
- Add filter chips above the history list: *[All] [Push] [Pull] [Legs]* (muscle groups)
- Multi-select chips that filter the visible logs
- Search bar: type exercise name → only shows logs containing that exercise

### 2.4 Workouts: Edit a logged workout

**Why:** Currently the only option after saving is delete. Mistakes happen.

**What to build:**
- Add edit pencil to each history row
- Tap → modal with the same Log Workout form, pre-filled
- On save, update workout_logs + delete-and-reinsert exercise_logs (simpler than diffing)
- Recompute kcal_burnt and update daily_logs (subtract old, add new)

### 2.5 Diet: Water tracking

**What to build:**
- New column on `daily_logs`: `water_ml INTEGER NOT NULL DEFAULT 0`
- New mini-section above macros: 8 droplet icons (each = 250ml glass), tap to fill/unfill
- Auto-saves to daily_logs on every tap
- Goal: 2000ml default (from profile.water_target_ml — add this column too)
- Surface in dashboard "This Week" tile

**Migration 006:**
```sql
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS water_ml INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS water_target_ml INTEGER NOT NULL DEFAULT 2000;
```

### 2.6 Diet: Smart "X kcal left" suggestions

**What to build:**
- Below the daily summary, add a thin recommendations strip:
  > 💡 You have **520 kcal** + **30g protein** left. Try: chicken breast (250g, 410 kcal, 78g P) · Greek yogurt (200g, 118 kcal, 20g P)
- Pulls from QUICK_FOODS, picks 3 items that fit remaining macros (greedy: protein density first, kcal-budget aware)

### 2.7 Diet: Adjusted target on workout days

**Why:** If user burnt 350 kcal today, their effective target is `target + 350`. Show this clearly.

**What to build:**
- In Daily Summary, when `daily_logs.kcal_burnt > 0`:
  > Calorie target: 2,500 + 350 burnt = **2,850 effective**
- The "X kcal left" calculation uses the adjusted target

### 2.8 Leaderboard: "vs me" comparison view

**What to build:**
- Tap any other member's row → opens a side-by-side overlay
- Shows you (left) vs them (right) for the current week:
  - Score totals + breakdown bars side-by-side
  - Active days, kcal in/out, workouts
- Closes by tapping outside

### 2.9 Leaderboard: Weekly mini-targets

**What to build:**
- New table `leaderboard_targets`:
  ```sql
  CREATE TABLE leaderboard_targets (
    id UUID PK,
    member_id UUID REFERENCES leaderboard_members,
    week_start DATE,
    target_score INT,
    achieved BOOLEAN
  )
  ```
- In MemberSettingsModal: *"This week's target: ___ / 100"*
- On leaderboard detail, your row shows progress: `Score 67 / Target 75 → 8 to go`
- Auto-mark achieved when score hits target on any sync

### 2.10 Progress: Charts for measurements

**What to build:**
- The /progress page already has `LineChart` import but I haven't seen it rendered. Add charts for:
  - Weight over time (already there?)
  - Body fat % over time
  - Chest / waist / arms / thighs (multi-line chart)
- Time-range selector reuses the existing `timeRange` state

---

## Phase 3 — New advanced features

### 3.1 Onboarding wizard for new users

**Why:** New user lands on dashboard with empty data and no idea where to start.

**What to build:**
- On first login (no `profile.weight_kg` set OR `created_at` < 5 min), show a 4-step modal:
  1. **Welcome:** name, units (kg/lbs)
  2. **Body:** age, height, current weight, target weight
  3. **Goals:** activity level, goal type (cut/bulk/athletic) → derives daily calorie target via TDEE
  4. **Routine:** "Pick a starter plan" (PPL 6-day / Upper-Lower 4-day / Full-body 3-day) → auto-creates `workout_routines`
- Skippable but encouraged

### 3.2 Weekly recap modal (Sunday/Monday)

**What to build:**
- On the first leaderboard or dashboard visit AFTER Sunday 23:59 local, show a recap modal for the week that just ended:
  > ✨ Week of May 4-10
  > Score: 78 / 100 (+5 vs last)
  > Workouts: 4 sessions, 12,400 kcal burnt
  > Adherence: 82% on calories
  > Best lift: Squat 100kg × 5 (PR!)
  > [Share recap] [Continue]
- Stored in `localStorage` with key `recap_seen_<week_start>` to avoid repeat

### 3.3 Personal insights / trends

**What to build:** New page `/insights` or section on dashboard showing computed observations:
- "Your protein intake is 15% below average this week"
- "You haven't trained legs in 11 days"
- "Your 1RM Bench has gone from 80kg → 90kg in 30 days"
- "Most consistent meal: Breakfast (logged 6/7 days)"

Logic in `src/lib/insights.ts` — runs on dashboard mount.

### 3.4 Smart routine: "Today is rest day if I trained 6/7 days"

**What to build:**
- When auto-suggesting today's routine on dashboard, check if user already trained 6 days this week
- If yes, suggest rest/recovery day instead of the scheduled day
- Educates user about deload importance

### 3.5 PWA + offline mode

**What to build:**
- Add `next-pwa` package
- `manifest.json` for "Add to Home Screen"
- Service worker caches the app shell
- IndexedDB queue for writes when offline (sync when reconnected)
- Lower priority — high effort

---

## Phase 4 — Polish, perf, observability

### 4.1 Loading skeletons

Replace `Loading...` text on dashboard, diet, leaderboard, workouts with shimmer skeleton placeholders matching the final layout. Reduces perceived latency.

### 4.2 Error boundaries

Wrap each page in a boundary that catches errors and shows a friendly screen:
```
Something went wrong on this page.
[Reload] [Report]
```

### 4.3 Mobile UX

- Pull-to-refresh on dashboard, diet
- Swipe left to delete on meal/workout rows
- Better tap targets (currently some buttons too small)

### 4.4 Profile picture upload

- Supabase Storage bucket `avatars`
- Upload + crop UI in /profile
- Shown next to name in leaderboard rankings

### 4.5 Theme toggle

System default works. Add manual toggle: dark / light. Tailwind already supports it. Persist in localStorage.

### 4.6 Auth: Enable HaveIBeenPwned password protection

Supabase Auth dashboard → Settings → enable leaked-password protection. (Manual step, not migration.)

---

## Database migrations needed

| File | Purpose |
|---|---|
| `005_security_hardening.sql` | Lock down SECURITY DEFINER functions (Phase 1.7) |
| `006_water_tracking.sql` | `daily_logs.water_ml` + `profiles.water_target_ml` (Phase 2.5) |
| `007_leaderboard_targets.sql` | `leaderboard_targets` table (Phase 2.9) |

---

## Files affected (Phase 1 only — for sequencing)

### New files
| File | Purpose |
|---|---|
| `src/lib/validation.ts` | Numeric clamps + helpers (1.6) |
| `src/components/dashboard/TodaysRoutineCard.tsx` | (1.3) |
| `src/components/dashboard/StreakAndBadges.tsx` | (1.4) |
| `supabase/migrations/005_security_hardening.sql` | (1.7) |

### Modified files
| File | Change |
|---|---|
| `src/app/(app)/workouts/page.tsx` | Refuel toast prompt (1.1) |
| `src/app/(app)/diet/page.tsx` | Read query params + post-workout banner (1.1) + cleanup timer (1.8) |
| `src/app/(app)/progress/page.tsx` | Auto-sync weight to profile + leaderboards (1.2) |
| `src/components/leaderboard/MemberSettingsModal.tsx` | Reverse-sync weight to profile (1.2) |
| `src/app/(app)/dashboard/page.tsx` | Today's routine + streak/badges sections (1.3, 1.4) |
| `src/components/Navbar.tsx` | Mount NotificationsPanel (1.5) |
| `src/components/NotificationsPanel.tsx` (moved) | Drop required leaderboardId filter (1.5) |
| Empty-state strings across pages | (1.10) |

---

## Acceptance criteria (Phase 1 overall)

- [ ] Log a workout → see refuel toast → tap → diet page opens with meal type pre-set + protein hint
- [ ] Log new weight in /progress → dashboard "Body Weight" updates without refresh
- [ ] Dashboard shows today's day-of-week routine (or "rest day" suggestion)
- [ ] Streak number visible on dashboard, badges scrollable
- [ ] Bell icon in navbar shows unread count for ALL notifications
- [ ] Migration 005 applied; security advisor warnings reduced
- [ ] All numeric inputs reject out-of-range values gracefully
- [ ] No memory-leak warnings in dev tools
- [ ] Empty states branded across /diet, /workouts, /progress

---

## Non-goals (explicit, for v3)

- Apple Health / Google Fit integration (parking for v4)
- Social feed / friends list (v4)
- Workout marketplace (v4)
- Real-time websocket updates (v4)
- AI meal recommender via LLM (v4)
- Multi-user gym equipment booking (out of scope)

---

## Sequencing recommendation for Sonnet

Implement Phase 1 in this order to minimize cross-file conflicts:

1. **1.7** Migration 005 first (DB hardening, no code changes)
2. **1.6** `validation.ts` + apply where input is added (small, isolated)
3. **1.8** Search timer cleanup (1-line fix)
4. **1.2** Progress → Profile sync (small, isolated)
5. **1.5** Globalize notifications (move file + modify Navbar)
6. **1.3** + **1.4** Dashboard new sections (combine into one PR)
7. **1.1** Workout → Diet refuel prompt (touches both pages, do last)
8. **1.10** Empty states (cosmetic, finish at the end)

After each step, `npx tsc --noEmit && npx next build` must pass.
After all of Phase 1: commit + push + verify on Vercel before starting Phase 2.

---

## Hand-off

```
/ccg:execute .claude/plan/v3-app-improvements.md
```

Sonnet should start with Phase 1 in the order above. Stop after Phase 1 commits. Wait for user confirmation before Phase 2.
