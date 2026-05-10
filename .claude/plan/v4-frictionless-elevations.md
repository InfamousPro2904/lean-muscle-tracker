# v4 — Frictionless Elevations

**Constraint:** Elevate usefulness of existing features WITHOUT creating user hassle.
That means: zero new screens, zero new forms, no extra clicks, no decisions.

The principle: **the app gets smarter for the user, not more demanding of them.**

Each improvement falls in one of two categories:
- **Pure automation** — the app derives or pre-fills something the user used to enter
- **Passive surface** — show more useful info in the same space, no new interactions

---

## Tier 1 — Pure automation (zero UI footprint)

### A1 · Auto-fill weights from last session (Workouts)

When the user selects a routine in Log Workout tab, immediately fetch that routine's most recent `workout_log` and pre-fill each exercise's first set with the last session's reps × weight. So you open the page, pick "Push Day", and your sets are already populated with last week's loads — just adjust if needed.

**Implementation:**
- After `handleSelectRoutine(routineId)`, query `workout_logs.id WHERE routine_id = ? ORDER BY date DESC LIMIT 1`
- For that log id, fetch all `exercise_logs` rows
- Match against the freshly-loaded `exerciseEntries` by exercise name
- For each match, populate the first set with `{ reps, weight_kg }` from the most recent occurrence

### A2 · Auto-detect today's routine on tab open (Workouts)

When user opens `/workouts?tab=log` and no routine is selected yet, look up the routine scheduled for today (via `day_of_week` array) and auto-select it.

**Implementation:**
- After routines fetched, on Log tab open with `selectedRoutineId === ''`, find the first routine matching today's day-of-week
- If exactly one match, auto-select via `handleSelectRoutine(id)`
- If multiple (multi-active routines on same day), don't auto-select — let user pick

### A3 · Smart meal_type by time of day (Diet)

The default `mealType` state is hardcoded to `MEAL_TYPES[0]` ("Breakfast"). Replace with time-aware default:
- 04:00–10:30 → Breakfast
- 10:30–14:00 → Lunch
- 14:00–17:30 → Snack
- 17:30–22:00 → Dinner
- Workout window detection: if user just logged a workout in the last 90 min, suggest Post-Workout instead

**Implementation:** New helper `defaultMealTypeForNow()` in `src/lib/insights.ts`. Use as initial state.

### A4 · Last-week comparison deltas on dashboard tiles

Every tile in "This Week" already shows the current value. Show ↑/↓/→ vs last week's value:
```
Workouts: 4 sessions  ↑ 1 vs last week
Burnt:   1,200 kcal  ↑ 250
Kcal in: 12,400      → 0
Active days: 5/7     ↑ 1
```

**Implementation:**
- Extend dashboard fetchData to also pull last week's `daily_logs` + `meal_logs` + `workout_logs`
- Compute deltas inline on the tiles
- Color-code: green for "good direction", red for regression — direction depends on whether user is in cut/bulk/maintenance (pull from any recent leaderboard membership; default neutral colors)

### A5 · 7-day weight average on dashboard

Daily weight has noise (water retention, hydration). Surface a 7-day moving average alongside the latest weight:
```
74.0 kg (latest)    73.6 kg avg (7d)
```

**Implementation:** In dashboard, after `latestProgress`, also fetch the last 7 progress_logs and compute a simple average.

### A6 · PR auto-detection (Workouts)

When `saveWorkoutLog()` succeeds, scan the new exercise_logs against the user's full historical max-weight and max-1RM (Epley: `w × (1 + r/30)`) for each exercise. If any new set exceeds previous max, insert a notification with the exercise name + new weight.

**Implementation:**
- New `src/lib/prs.ts` exporting `findNewPRs(newLogs, allHistoricalLogs)` returning `[{ exercise, newWeight, prevWeight, new1RM }]`
- In workouts saveWorkoutLog, after the kcal sync, fetch `exercise_logs WHERE user_id = ?` (last 6 months for cap), call findNewPRs, then for each PR insert a row in `notifications`
- Notification surfaces in the global navbar bell automatically

### A7 · Streak-protection notification

If the user's streak is ≥ 3 days AND they haven't logged today by 8 PM (local time), insert a notification: "🔥 Keep your N-day streak alive — log a meal or workout".

**Implementation:**
- In NotificationsPanel.load() or dashboard fetchData(), check current time + today's logs + streak
- If conditions met AND no `daily_streak_reminder_<today>` notification already exists, insert one
- Localstorage flag prevents duplicate inserts within the same day

---

## Tier 2 — Passive surfaces (more info, no new clicks)

### B1 · "Last time" hints under exercise inputs (Workouts)

Below each exercise's "Reps" and "Weight" inputs in Log Workout, show subtle text: `Last: 60 kg × 8`. Already computed in A1 — just render it.

### B2 · "X to catch leader" badge (Leaderboard)

For non-#1 members, show a small chip below their score: `8 to catch leader` or `you're 12 ahead of #2`. Surfaces in the rank list view.

### B3 · Macro-balance donut on diet summary

Above the macro big-numbers, a small (~80px) donut chart showing the percentage split of today's calories from protein/carbs/fat. Uses recharts PieChart. Helps user see if they're carb-heavy / fat-heavy.

### B4 · Per-measurement deltas on progress page

Next to each measurement in the recent log list, show `+0.3 cm` or `−1.2 kg` from previous entry. Quick visual feedback on direction.

### B5 · Volume + tonnage in expanded workout history

In the expanded view of each workout in History, add a stats line:
```
12,400 kg total volume · 28 sets · est. 285 kcal · 47 min
```

---

## Tier 3 — Light optimizations

### C1 · Smart action card on dashboard

A single card that auto-rotates content based on context:
- Morning + no breakfast logged → "Start your day · Log breakfast"
- After workout + no Post-Workout meal → "Refuel · Log post-workout meal"
- Workout day + not yet trained + after 6 PM → "Push Day waiting · Start workout"
- Late evening + no dinner → "Dinner time · Log meal"
- All caught up → hide the card

Single dismissable card, never multiple at once.

### C2 · Optimistic UI for meal log

When user taps "Log Meal" in basket, immediately add it to "Today's Meals" list with a faded loading indicator, then confirm/rollback once the DB write returns. Reduces perceived latency.

### C3 · Persist basket to localStorage

Basket survives page refresh / accidental tab close. On page load, hydrate `basket` from localStorage if non-empty and same date.

---

## Files affected

### New files

| File | Purpose |
|---|---|
| `src/lib/insights.ts` | `defaultMealTypeForNow`, `weeklyDelta`, `lastWeekRange`, smart-action context helpers |
| `src/lib/prs.ts` | Epley 1RM, `findNewPRs(newLogs, allLogs)`, `getExerciseHistory(name)` |

### Modified files

| File | Changes |
|---|---|
| `src/app/(app)/workouts/page.tsx` | A1 prefill, A2 auto-detect today's routine, A6 PR detection, B1 "Last: X" hints, B5 volume stats |
| `src/app/(app)/diet/page.tsx` | A3 smart meal_type default, B3 macro donut, C2 optimistic, C3 basket persist |
| `src/app/(app)/dashboard/page.tsx` | A4 weekly deltas, A5 7-day avg, C1 smart action card |
| `src/app/(app)/progress/page.tsx` | B4 per-measurement deltas |
| `src/app/(app)/leaderboard/[id]/page.tsx` | B2 "X to catch leader" |
| `src/components/NotificationsPanel.tsx` | A7 streak-protection check on load |

### No DB changes
This entire roadmap is pure code — no migrations, no schema changes.

---

## Acceptance criteria

- [ ] Pick a routine in Log Workout → first sets pre-filled with last session weights
- [ ] Open Log Workout tab → today's scheduled routine auto-selected
- [ ] Open `/diet` mid-afternoon → meal_type defaults to "Snack"
- [ ] Dashboard shows ↑/↓ deltas on This Week tiles
- [ ] Dashboard shows latest weight + 7-day average
- [ ] Workout PRs trigger a notification automatically
- [ ] After 8 PM with empty log + active streak, streak-protection notification appears
- [ ] Diet page shows macro donut split
- [ ] Workout history shows volume + sets + kcal in expanded view
- [ ] Refresh diet page mid-basket → basket survives
- [ ] No new buttons / forms added — every existing UI element remains in the same place

---

## Brutal-audit checklist (Opus reviews after Sonnet implements)

After execution, Opus audits:
1. **Did A1 actually populate sets?** — pick a routine, look at first set inputs
2. **Did A2 auto-select?** — open Log tab, see if a routine is pre-selected
3. **Is A3 timezone-correct?** — check default at 6 PM IST
4. **Are deltas direction-correct?** — 5 workouts this week vs 3 last week → ↑ 2
5. **Does PR detection account for set order?** — same workout has 3 sets, does the LAST highest one count?
6. **Streak notif idempotent?** — refresh page 5 times, only 1 notification inserted
7. **Macro donut color-coded?** — protein blue, carbs yellow, fat red
8. **Basket persist scoped to date?** — yesterday's basket shouldn't show today
9. **Mobile responsiveness** — donut + deltas don't break narrow screens
10. **No console errors** — clean dev tools

---

## Sequencing

1. New libs first: `insights.ts`, `prs.ts` (no UI dependency)
2. A3, A5, A4 — small dashboard/diet wiring
3. A1, A2 — workouts logic (related, share routines fetch)
4. A6, A7 — notification triggers
5. B-tier passives — render-only, low risk
6. C-tier — optimistic + localStorage; do last
7. Build verify, commit, push
8. Opus audit
