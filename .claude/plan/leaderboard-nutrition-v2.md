# Implementation Plan v2 — Leaderboard + Nutrition Overhaul

**Author:** Opus 4.7 planning pass
**Implementer:** Sonnet 4.6
**Scope:** Two pages (`leaderboard`, `diet`) + DB migration 004 + new lib files
**Status:** Ready to implement (no further questions)

---

## Audit Summary

### Leaderboard — Issues Identified

**User-reported:**
- L-A: No edit options (creator can't rename/delete; member can't change goal/leave)
- L-B: Doesn't auto-sync week archives — creator must manually click

**My audit (additional):**
- L-C: `calculateWeeklyScore` receives `profile.age` but the `profiles` table only stores `date_of_birth` — age is always null → defaults to 28 → wrong TDEE for everyone
- L-D: Score uses `profile.weight_kg` only as last fallback; new members with no `start_weight_kg` get neutral progress=0.5 forever
- L-E: Member rows show goal label but not current weight, target weight, or progress toward goal
- L-F: No trend indicator next to score (↑/↓ vs last archive)
- L-G: Detail page header shows invite code but not your TDEE / kcal target — user doesn't know what to aim for
- L-H: No "Manage" button for creator — Archive button is the only action visible
- L-I: Notifications insert to DB but no UI to display them
- L-J: "Update weight" is a tiny text link — should be merged into a settings modal
- L-K: Confetti only fires when you're top scorer of >1 member group; awkward edge case
- L-L: No way to remove a member despite RLS policy `lb_members_creator_manage` allowing it
- L-M: `archiveWeek` uses `await` on `supabase.from('badges').upsert(...)` inside a `.forEach()` callback — fire-and-forget, race condition possible
- L-N: Past-weeks archive list won't paginate beyond 52 weeks
- L-O: No pre-flight check — if creator has no profile, leaderboard insert FK could fail silently

### Nutrition — Issues Identified

**User-reported:**
- N-A: No Indian foods in quick presets (chapati, dal, rice, paneer, etc.)
- N-B: Open Food Facts results are packaged-product noise, not relevant whole foods
- N-C: No way to save a recurring meal (overnight oats + milk + berries → daily breakfast)
- N-D: Can't add multiple items in one go — have to log breakfast as 4 separate entries

**My audit (additional):**
- N-E: All foods displayed as "per 100g" — no "1 medium banana" or "1 chapati" portion presets
- N-F: No "copy yesterday's breakfast" or "log this same meal again" affordance
- N-G: No favorites/recent foods — frequently logged foods are not surfaced
- N-H: Edit existing meal forces manual macro entry (can't re-search)
- N-I: Daily summary shows percent only — better as "X kcal left to go"
- N-J: API debounce 400ms + network ≈ >1s. Local list should be larger to reduce API dependence
- N-K: Search results have no source distinction (local vs online) in UI
- N-L: Manual entry mode duplicates meal-type selector (already at top)
- N-M: Weekly chart only shows kcal — no protein/carbs/fat trend
- N-N: No water tracking, no fiber, no sugar (out of scope for v2 but flagging)

---

## Phase 1 — Bullseye (User-Reported)

### LB-1 · Member self-edit modal

Replace the tiny "Update weight" link with a single "My Settings" button on the detail page header.

**Modal contents (`MemberSettingsModal`):**

| Field | Source | Validation |
|---|---|---|
| Goal type | `leaderboard_members.goal_type` | enum: cut/bulk/athletic |
| Activity level | `leaderboard_members.activity_level` | enum (5) |
| Current weight kg | `leaderboard_members.current_weight_kg` | 30–300 |
| Target weight kg | `leaderboard_members.target_weight_kg` | 30–300 (optional) |
| Start weight kg | `leaderboard_members.start_weight_kg` | 30–300 (advanced) |

**Bottom action:** Red "Leave Leaderboard" button → confirms → `supabase.from('leaderboard_members').delete().eq('id', myMem.id)` → router.push('/leaderboard')

After save, call `load()` to refresh. Score recomputes locally for instant feedback (already done for weight in `updateMyWeight`).

**File:** `src/app/(app)/leaderboard/[id]/page.tsx`
**Trigger:** Replace the `<button onClick={() => setShowWtModal(true)}>Update weight</button>` text-link with a small `<Settings className="w-3.5 h-3.5" />` icon button + label "My Settings".
**Reuses:** `Questionnaire` component pattern — but inline in this page, not imported. Don't cross-import from list page.

### LB-2 · Creator manage modal

Visible only when `lb.created_by === myId`. Add a "Manage" button next to "Archive This Week".

**Modal contents (`LeaderboardManageModal`):**

1. **Edit details** section
   - Name (TEXT, max 40)
   - Description (TEXT, max 200)
   - Save → `update leaderboards`

2. **Settings** section
   - Toggle: `is_active` (deactivating hides from member lists; existing members keep access)
   - Toggle: `auto_archive` (NEW column — see DB Migration 004)
   - Toggle: `is_public` (NEW — currently always invite-only)
   - Button: "Regenerate invite code" with confirm

3. **Members** section
   - List all members with name + role (Creator/Member)
   - Each non-creator row has a "Remove" button → `delete from leaderboard_members where id = ?`

4. **Danger zone**
   - "Delete leaderboard" with double-confirm (type the leaderboard name to confirm)
   - Cascades via `ON DELETE CASCADE` on members/archives/badges/reactions

**File:** `src/app/(app)/leaderboard/[id]/page.tsx`

### LB-3 · Auto-archive

**Problem:** Sonnet's previous archive flow is manual click. User wants this automatic.

**Approach:** Client-side fallback (no pg_cron required). When ANY member opens the detail page:

```typescript
// After load() resolves, before render:
async function autoArchiveIfDue() {
  if (!lb || !myMem) return
  if (!isCreator) return                     // only creator can archive
  if (!lb.auto_archive) return               // user-controlled toggle
  
  // Compute the most recent COMPLETE week (Mon-Sun ending before this week's Mon)
  const now = new Date()
  const thisWeekStart = getWeekStart(now)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekStartIso = lastWeekStart.toISOString().split('T')[0]
  const lastWeekEndIso = getWeekEnd(lastWeekStartIso)
  
  // Already archived?
  if (archives.some(a => a.week_start === lastWeekStartIso)) return
  
  // Fetch last week's logs for ALL members
  const memberIds = rows.map(r => r.user_id)
  const { data: lastWeekLogs } = await supabase
    .from('daily_logs')
    .select('*')
    .in('user_id', memberIds)
    .gte('date', lastWeekStartIso)
    .lte('date', lastWeekEndIso)
  
  // Compute last week's scores
  const scores: Record<string, WeeklyScore> = {}
  let topScore = -1
  let winner: string | null = null
  for (const row of rows) {
    const memLogs = (lastWeekLogs ?? []).filter(l => l.user_id === row.user_id)
    if (memLogs.length === 0) {
      // Skip members with no activity that week — null score
      continue
    }
    const score = calculateWeeklyScore(row, memLogs as DailyLog[], row.profile)
    scores[row.user_id] = score
    if (score.total > topScore) { topScore = score.total; winner = row.user_id }
  }
  
  // Insert archive (silent — no UI error if it conflicts)
  await supabase.from('weekly_archives').insert({
    leaderboard_id: lb.id,
    week_start: lastWeekStartIso,
    week_end:   lastWeekEndIso,
    winner_user_id: winner,
    scores,
  })
  
  // Award badges (same logic as manual archiveWeek)
  // ... (factor out into shared `awardBadgesForWeek(scores, winner)` helper)
  
  await load()  // refresh archives
}
```

**Critical: factor out shared logic.** Manual `archiveWeek` and auto-archive both compute scores + award badges + insert notifications. Create `archiveWeekHelper(weekStart, weekEnd, isAutomatic)` and have both paths call it.

**Acceptance criteria:**
- If creator opens leaderboard on Monday and last week is unarchived AND auto_archive=true → archive runs silently, archives tab shows it
- Manual button still works (for non-auto leaderboards or to archive future incomplete weeks)
- If member visits but no creator has visited yet → previous week stays unarchived, but a banner appears: "Last week's results pending — waiting for creator"

### NT-1 · Indian foods + extended food database

Replace the 20-food `QUICK_FOODS` list with a tiered structure:

**Tier 1 — Quick foods (shown by default, 18-24 items):** mix of common Indian + Western items most likely to be eaten daily.

**Tier 2 — Extended database (searched but not shown):** ~200 foods covering Indian, Western, Asian, dairy, snacks.

**File structure:** Move foods to `src/lib/foods.ts` (new file). Export:
```typescript
export interface FoodItem {
  name: string
  category: 'breads' | 'rice' | 'curry' | 'protein' | 'dairy' | 'vegetable' | 'fruit' | 'snack' | 'sweet' | 'drink' | 'other'
  cuisine: 'indian' | 'western' | 'asian' | 'universal'
  per100g: { kcal: number; protein: number; carbs: number; fat: number }
  // Optional: common portion presets (e.g. "1 chapati ≈ 40g")
  portions?: { label: string; grams: number }[]
}

export const QUICK_FOODS: FoodItem[]      // ~20 default tiles
export const EXTENDED_FOODS: FoodItem[]   // ~200 searchable
export const ALL_FOODS = [...QUICK_FOODS, ...EXTENDED_FOODS]
```

**Indian foods to include (40+ items):**

```typescript
// Breads
{ name: 'Chapati / Roti',       per100g: { kcal: 297, protein: 11,  carbs: 56,  fat: 4   }, portions: [{ label: '1 medium', grams: 40 }] },
{ name: 'Plain Paratha',        per100g: { kcal: 320, protein: 7,   carbs: 45,  fat: 12  }, portions: [{ label: '1 medium', grams: 80 }] },
{ name: 'Naan',                 per100g: { kcal: 310, protein: 9,   carbs: 50,  fat: 7   }, portions: [{ label: '1 piece',  grams: 90 }] },
{ name: 'Plain Dosa',           per100g: { kcal: 168, protein: 4,   carbs: 30,  fat: 3   }, portions: [{ label: '1 dosa',   grams: 80 }] },
{ name: 'Idli',                 per100g: { kcal: 132, protein: 4,   carbs: 27,  fat: 0.5 }, portions: [{ label: '1 piece',  grams: 30 }] },
{ name: 'Poha (cooked)',        per100g: { kcal: 130, protein: 2.6, carbs: 27,  fat: 1.5 }, portions: [{ label: '1 bowl',   grams: 150 }] },
{ name: 'Upma (cooked)',        per100g: { kcal: 132, protein: 3.5, carbs: 22,  fat: 3   }, portions: [{ label: '1 bowl',   grams: 200 }] },

// Curries / Mains
{ name: 'Dal (Toor / Moong)',   per100g: { kcal: 116, protein: 9,    carbs: 20, fat: 0.4 }, portions: [{ label: '1 katori', grams: 150 }] },
{ name: 'Sambar',               per100g: { kcal: 67,  protein: 4,    carbs: 11, fat: 1   }, portions: [{ label: '1 cup',    grams: 200 }] },
{ name: 'Rajma (cooked)',       per100g: { kcal: 127, protein: 8.7,  carbs: 22, fat: 0.5 }, portions: [{ label: '1 katori', grams: 150 }] },
{ name: 'Chana / Chole',        per100g: { kcal: 164, protein: 8.9,  carbs: 27, fat: 2.6 }, portions: [{ label: '1 katori', grams: 150 }] },
{ name: 'Paneer',               per100g: { kcal: 296, protein: 18,   carbs: 6,  fat: 22  }, portions: [{ label: '1 cube',   grams: 25 }] },
{ name: 'Palak Paneer',         per100g: { kcal: 180, protein: 8,    carbs: 8,  fat: 13  }, portions: [{ label: '1 katori', grams: 150 }] },
{ name: 'Chicken Curry',        per100g: { kcal: 175, protein: 12,   carbs: 5,  fat: 12  } },
{ name: 'Butter Chicken',       per100g: { kcal: 270, protein: 13,   carbs: 4,  fat: 22  } },
{ name: 'Veg Biryani',          per100g: { kcal: 200, protein: 7,    carbs: 26, fat: 7   } },
{ name: 'Chicken Biryani',      per100g: { kcal: 245, protein: 11,   carbs: 26, fat: 11  } },

// Vegetables / Sabzi
{ name: 'Aloo Gobi',            per100g: { kcal: 100, protein: 3,    carbs: 15, fat: 4   } },
{ name: 'Bhindi (Okra Sabzi)',  per100g: { kcal: 90,  protein: 2,    carbs: 11, fat: 4   } },
{ name: 'Baingan Bharta',       per100g: { kcal: 95,  protein: 2,    carbs: 8,  fat: 7   } },
{ name: 'Mixed Veg Curry',      per100g: { kcal: 110, protein: 3,    carbs: 12, fat: 6   } },

// Dairy
{ name: 'Curd / Dahi',          per100g: { kcal: 60,  protein: 3.5,  carbs: 4.7, fat: 3.3 }, portions: [{ label: '1 katori', grams: 100 }] },
{ name: 'Sweet Lassi',          per100g: { kcal: 80,  protein: 2,    carbs: 13, fat: 2   }, portions: [{ label: '1 glass', grams: 250 }] },
{ name: 'Buttermilk / Chaas',   per100g: { kcal: 40,  protein: 2,    carbs: 4,  fat: 1.5 }, portions: [{ label: '1 glass', grams: 250 }] },

// Snacks
{ name: 'Samosa',               per100g: { kcal: 250, protein: 4,    carbs: 24, fat: 16  }, portions: [{ label: '1 piece', grams: 60 }] },
{ name: 'Pakora',               per100g: { kcal: 290, protein: 8,    carbs: 30, fat: 16  } },
{ name: 'Dhokla',               per100g: { kcal: 160, protein: 6,    carbs: 25, fat: 4   }, portions: [{ label: '1 piece', grams: 50 }] },
{ name: 'Vada Pav',             per100g: { kcal: 280, protein: 7,    carbs: 35, fat: 13  }, portions: [{ label: '1 piece', grams: 120 }] },

// Sweets
{ name: 'Gulab Jamun',          per100g: { kcal: 350, protein: 4,    carbs: 45, fat: 18  }, portions: [{ label: '1 piece', grams: 50 }] },
{ name: 'Rasgulla',             per100g: { kcal: 186, protein: 4,    carbs: 41, fat: 1.5 }, portions: [{ label: '1 piece', grams: 40 }] },
{ name: 'Jalebi',               per100g: { kcal: 400, protein: 1,    carbs: 65, fat: 16  } },

// Drinks
{ name: 'Masala Chai (with sugar)', per100g: { kcal: 50, protein: 1.2, carbs: 7, fat: 2 }, portions: [{ label: '1 cup', grams: 150 }] },
{ name: 'Filter Coffee',        per100g: { kcal: 35,  protein: 1,    carbs: 5,  fat: 1.5 }, portions: [{ label: '1 cup', grams: 150 }] },

// Indian fruits
{ name: 'Mango',                per100g: { kcal: 60,  protein: 0.8,  carbs: 15, fat: 0.4 }, portions: [{ label: '1 medium', grams: 200 }] },
{ name: 'Pomegranate',          per100g: { kcal: 83,  protein: 1.7,  carbs: 19, fat: 1.2 }, portions: [{ label: '1 cup', grams: 174 }] },
{ name: 'Coconut Water',        per100g: { kcal: 19,  protein: 0.7,  carbs: 4,  fat: 0.2 }, portions: [{ label: '1 glass', grams: 240 }] },
```

**For QUICK_FOODS tiles (default screen):** Pick 18 universally common items mixing Indian and Western:
1. Chapati / Roti
2. Dal
3. Rice (white, cooked)
4. Curd / Dahi
5. Paneer
6. Egg (whole)
7. Chicken Breast (cooked)
8. Brown Rice
9. Oats (rolled)
10. Whey Protein
11. Banana
12. Greek Yogurt
13. Whole Milk
14. Almonds
15. Peanut Butter
16. Sweet Potato
17. Salmon
18. Avocado

### NT-2 · Meal templates (saved presets)

**DB:** New table `meal_templates` (see migration 004 below).

**UI changes (`src/app/(app)/diet/page.tsx`):**

Add a third mode tab to "Log Food" section: `[ Search | Templates | Manual ]`.

**Templates view:**
- Grid of saved templates with: name, item count, total kcal, "Log" button, "Edit" / "Delete" / star icons
- Empty state: "No templates yet — save a meal you eat often to log it in one tap"
- "+ New template" button → opens template editor (uses the multi-item composer below)

**Template editor:**
- Name field
- Default meal type selector
- Items list (reuse the basket composer from NT-3)
- "Save template" button

**Logging from template:**
- Tap a template → preview modal with all items + grams (editable per item) + meal type (editable) + "Log Now" button
- Sets `meal_logs.meal_session_id` to a fresh UUID for this log session

**Save current basket as template:**
- After composing a multi-item meal in NT-3, before logging, button "Save as template" → name prompt → insert template
- Or after logging, toast: "Save this as 'Daily Breakfast'?"

### NT-3 · Multi-item meal composer

**Data flow:** Pure client-side basket state. No DB schema change for the basket itself; on submit, insert N rows in `meal_logs` with shared `meal_session_id` (NEW column in migration 004).

**UI:**
- After a search result is tapped, instead of the "selected food card" replacing the search, the food gets ADDED TO A BASKET
- Basket appears below search bar as a list:
  ```
  ╭ Building [Breakfast] · 4 items · 480 kcal · P 22g · C 65g · F 14g
  ├─ Rolled Oats ─ 50g ─ 195 kcal ─ [✕]
  ├─ Whole Milk ─ 100ml ─ 61 kcal ─ [✕]
  ├─ Strawberries ─ 30g ─ 10 kcal ─ [✕]
  ├─ Blueberries ─ 30g ─ 17 kcal ─ [✕]
  ╰ [Save as template] [Log Meal]
  ```
- Each item editable inline (tap → grams input)
- "Log Meal" inserts N rows
- "Save as template" prompts for name then inserts a `meal_templates` row

**Toggle:** A "single-item" mode for fast logging (current behavior) vs "build meal" mode. Default to single-item; switch to multi-item via a "+ Add another" button after first selection.

### NT-4 · Better search relevance

**Problem:** Open Food Facts returns `"Heinz Beanz In Tomato Sauce"` when user searches "beans".

**Fix 1 — Larger local DB.** With 200+ foods in `EXTENDED_FOODS`, most searches resolve locally before API is hit.

**Fix 2 — Filter API results by relevance:**
```typescript
// Before adding API item to results:
const queryLower = q.toLowerCase()
const nameLower  = (p.product_name as string).toLowerCase()
// Reject if product name doesn't contain the query
if (!nameLower.includes(queryLower)) return false
// Reject if it's clearly a packaged brand (very long name with multiple commas)
if ((p.product_name as string).split(',').length > 3) return false
// Prefer items without brands or with kcal in reasonable range
const kcal = n['energy-kcal_100g'] ?? 0
if (kcal < 5 || kcal > 900) return false
```

**Fix 3 — Source labels in UI:**
```
Quick foods    [tile]
─────────────
🥄 Local (12)
  Chapati / Roti        297 kcal/100g
  Dal                   116 kcal/100g
─────────────
🌐 Online (3)
  ...
```

**Fix 4 — Skip API call when local has 5+ matches.** No need to network-fetch if local DB already covers the query well.

---

## Phase 2 — Critical Bug Fixes

### LB-4 · Age from DOB

**Bug:** `calculateWeeklyScore` reads `profile.age` — that field doesn't exist on `profiles`. Profile has `date_of_birth`. Result: TDEE is wrong for everyone.

**Fix in `src/lib/scoring.ts`:**
```typescript
// New helper at top of file:
export function calculateAge(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const diff = Date.now() - birth.getTime()
  const age = new Date(diff).getUTCFullYear() - 1970
  return age >= 13 && age <= 100 ? age : null
}
```

**Fix in `src/app/(app)/leaderboard/[id]/page.tsx`:**
```typescript
// In the .select() for members:
'profiles(full_name, weight_kg, height_cm, date_of_birth)'

// Where building MemberRow:
const profileForScore = {
  weight_kg: profile.weight_kg,
  height_cm: profile.height_cm,
  age: calculateAge(profile.date_of_birth),
}
const score = calculateWeeklyScore(mem, memberLogs, profileForScore)
```

### LB-5 · Profile fallback chains

In `calculateWeeklyScore`, when start_weight_kg/current_weight_kg are null, fall back to `profile.weight_kg`. Already done for current weight; ensure start weight also falls back, otherwise progress=0.5 forever.

```typescript
// In calculateWeeklyScore:
const startW = member.start_weight_kg ?? profile.weight_kg
const currW  = member.current_weight_kg ?? profile.weight_kg
```

### LB-6 · Member row enhancements

Show on each row (collapsed):
- Goal type label + small "→ target Xkg" if target_weight_kg set
- Goal progress bar showing distance toward target weight (e.g. "75kg → 70kg, currently 73kg = 40% progress")

Calc:
```typescript
function goalProgressPct(member: LeaderboardMember): number | null {
  const start = member.start_weight_kg
  const target = member.target_weight_kg
  const current = member.current_weight_kg
  if (start == null || target == null || current == null) return null
  if (start === target) return 100
  const total = Math.abs(target - start)
  const moved = Math.abs(start - current)
  return Math.min(100, Math.round((moved / total) * 100))
}
```

### LB-7 · Score trend indicator

Compare current week score to most recent archived week's score for same user. Show ↑ / ↓ / → next to the score number.

```typescript
function scoreTrend(userId: string, currentScore: number, archives: WeeklyArchive[]): 'up' | 'down' | 'flat' | null {
  const lastArch = archives[0]  // archives sorted desc
  if (!lastArch) return null
  const prev = lastArch.scores[userId]?.total
  if (prev == null) return null
  if (currentScore > prev + 2) return 'up'
  if (currentScore < prev - 2) return 'down'
  return 'flat'
}
```

### LB-8 · Race-fix archiveWeek upserts

Currently:
```typescript
rows.forEach(r => {
  if (...) supabase.from('badges').upsert(...)  // no await
})
```

Wrap in `Promise.all`:
```typescript
await Promise.all(rows.flatMap(r => {
  const inserts = []
  if (r.score.total >= 100) inserts.push(supabase.from('badges').upsert({...}))
  // etc.
  return inserts
}))
```

---

## Phase 3 — Polish (User-Optional)

### NT-5 · Copy from history

Button: "Copy yesterday's [meal_type]" beside the meal type pills. Fetches yesterday's logs of same meal_type, opens basket pre-populated, user reviews then logs.

### NT-6 · Recent foods + favorites

- "Recent" button next to Quick Foods: shows last 30 days of distinct food_names sorted by frequency.
- Star icon on any food item (search result, basket item, food name in past meal): toggles `food_favorites` row.
- "Favorites" button next to Recent: shows starred foods.

DB: New table `food_favorites` (in migration 004).

### NT-7 · "X kcal left" prominent

Replace the % badge under each macro big-number with: `247 left` (or `+150 over` if exceeded). Clearer call-to-action than abstract %.

### LB-9 · Notifications panel

Add a bell icon to the leaderboard detail page header → opens a popover listing the user's `notifications` rows for this leaderboard. Mark-as-read on view.

### LB-10 · Score explainer

Tap a tooltip / info icon next to "100" on score → modal showing the formula (40% adherence + 30% burnt + 20% consistency + 10% progress) with current week's actual values.

---

## Database Migration 004

**File:** `supabase/migrations/004_phase2_features.sql`

```sql
-- ── leaderboards: settings columns ──────────────────────────────────────────
ALTER TABLE leaderboards ADD COLUMN IF NOT EXISTS auto_archive BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE leaderboards ADD COLUMN IF NOT EXISTS is_public    BOOLEAN NOT NULL DEFAULT false;

-- Allow creators to update is_active, auto_archive, is_public, name, description
-- (already covered by existing leaderboards_update_own policy)

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

-- ── food_favorites: starred foods (Phase 3) ─────────────────────────────────
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
```

---

## File-by-file change list

### NEW files

| File | Purpose |
|---|---|
| `src/lib/foods.ts` | `QUICK_FOODS` (18) + `EXTENDED_FOODS` (~200, heavy Indian) + `FoodItem` type + `searchFoods(query)` helper |
| `src/lib/age.ts` | `calculateAge(dob)` helper (or inline in scoring.ts) |
| `src/components/leaderboard/MemberSettingsModal.tsx` | LB-1 (extracted to keep `[id]/page.tsx` under 800 lines) |
| `src/components/leaderboard/LeaderboardManageModal.tsx` | LB-2 (creator) |
| `src/components/diet/MealBasket.tsx` | NT-3 multi-item composer |
| `src/components/diet/MealTemplates.tsx` | NT-2 templates UI |
| `supabase/migrations/004_phase2_features.sql` | DB schema |

### MODIFIED files

| File | Phase | Change |
|---|---|---|
| `src/lib/scoring.ts` | LB-4, LB-5 | Add `calculateAge`, fix profile fallback |
| `src/lib/types.ts` | NT-2, NT-3 | Add `MealTemplate`, `BasketItem`, `FoodFavorite` types; add `auto_archive`, `is_public` to `Leaderboard`; add `meal_session_id` to `MealLog` |
| `src/app/(app)/leaderboard/[id]/page.tsx` | LB-1..LB-8 | Wire in modals, auto-archive, trends, age fix; remove inline `UpdateWeightModal` |
| `src/app/(app)/diet/page.tsx` | NT-1..NT-4 | Switch to `foods.ts` import, add Templates tab, basket mode, source labels, better filter |
| `src/components/Navbar.tsx` | (none) | unchanged |

### DB migrations

| File | When |
|---|---|
| `supabase/migrations/004_phase2_features.sql` | Apply BEFORE Phase 1 implementation begins |

---

## Implementation sequence (ordered dependencies)

1. **Apply migration 004** (via Supabase MCP `apply_migration`) — unblocks everything
2. **Update `src/lib/types.ts`** — add new interfaces (no logic, no risk)
3. **Create `src/lib/foods.ts`** — pure data, no UI dependency
4. **Fix `src/lib/scoring.ts`** (LB-4, LB-5) — pure functions, easy to verify
5. **Refactor `[id]/page.tsx`** to use `calculateAge` and pass `date_of_birth` (LB-4) — small safe edit
6. **Build `MemberSettingsModal`** (LB-1) — replace `UpdateWeightModal`
7. **Build `LeaderboardManageModal`** (LB-2) — new feature
8. **Wire auto-archive logic** (LB-3) — depends on shared `archiveWeekHelper`
9. **Add LB-6, LB-7, LB-8** small enhancements
10. **Rewrite `diet/page.tsx` Add Meal section:**
    a. Switch QUICK_FOODS import to `foods.ts`
    b. Add basket state + multi-item flow (NT-3)
    c. Add Templates tab (NT-2)
    d. Tighten search filter (NT-4)
11. **(Optional Phase 3)** copy-from-history, favorites, kcal-left display, notifications panel, score explainer

After each major step: `npx tsc --noEmit` must pass before continuing.

---

## Acceptance Criteria

**Leaderboard:**
- [ ] Member can change goal/activity/weight/target via single "My Settings" modal
- [ ] Member can leave leaderboard from same modal
- [ ] Creator sees "Manage" button → can rename, edit description, toggle auto-archive, regenerate code, kick member, delete leaderboard
- [ ] Creator with `auto_archive: true` opens detail page on Mon → previous week is archived silently
- [ ] Score reflects user's correct age (computed from `profiles.date_of_birth`), not 28
- [ ] Trend arrow shows next to score (↑/↓/→) when ≥1 archive exists
- [ ] Goal progress bar shown on member row when start+target+current weights all set
- [ ] All state changes refresh the page without full reload

**Nutrition:**
- [ ] Quick foods grid includes Indian items (chapati, dal, rice, paneer, curd, etc.)
- [ ] Searching "dal" returns local matches BEFORE any API result
- [ ] Open Food Facts results filtered: long brand names suppressed, irrelevant matches dropped
- [ ] User can save a multi-item meal as a template (name, items, default type)
- [ ] Templates tab shows saved templates with one-tap log
- [ ] Multi-item basket: tap food → adds to basket → tap "+ Add another" → log all at once
- [ ] All items logged in same basket share `meal_session_id` and group visually in Today's Meals
- [ ] Manual entry mode still works for foods not in any DB
- [ ] No regressions in date navigation, daily summary, weekly chart, edit/delete

---

## Risk register

| Risk | Mitigation |
|---|---|
| `[id]/page.tsx` already 793 lines; adding two modals would push past 1200 | Extract modals to `src/components/leaderboard/` |
| Auto-archive double-archives if multiple creators visit simultaneously | UNIQUE(leaderboard_id, week_start) constraint already in DB; insert error handled silently |
| Open Food Facts API rate limits or downtime | Local DB now covers most queries; API failure shows local results without error toast |
| Computing last week's scores requires fetching last week's logs — adds DB call to every detail page load | Only fetch when `auto_archive=true && previous week unarchived && isCreator` (rare) |
| User has multiple meal_logs for same date with the same meal_session_id but rendered separately | Group in UI by `meal_session_id` before display in Today's Meals |
| Migration 004 alters `meal_logs` — old rows have `meal_session_id=null` | Existing logs render as singletons, which is correct |

---

## Out-of-scope (explicit non-goals for v2)

- Water tracking
- Fiber / sugar / sodium tracking
- Meal photos
- Barcode scan
- Macro pie chart on weekly chart (kcal-only is fine for v2)
- Reordering of leaderboard tabs
- Push notifications (still in-DB only)
- pg_cron-based server-side auto-archive (client-side fallback is sufficient for v2)
- LB-9 (notifications panel) and LB-10 (score explainer) — Phase 3, opt-in

---

## Hand-off

**Implementer:** Sonnet 4.6
**Resume command:**
```
/ccg:execute .claude/plan/leaderboard-nutrition-v2.md
```

When implementing, work through Phases sequentially. After Phase 1 lands and is verified working, prompt user before starting Phase 2 cleanup.
