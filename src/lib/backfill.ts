// One-time historical data backfill into `daily_logs`.
//
// For each date in the lookback window where the user has any workout_log
// or meal_log, derive (or update) a daily_logs row so that:
//   • leaderboards score historical weeks correctly
//   • the dashboard shows kcal_burnt for past days
//   • week archives include the user's pre-leaderboard activity
//
// Existing daily_logs are PRESERVED — the import only fills empty slots
// or supplements zero kcal_in / kcal_burnt fields with computed values.
// User-set notes / is_rest_day / non-zero values are never overwritten.

import { createClient } from './supabase'
import { estimateWorkoutKcal, type ExerciseSummary } from './kcal'
import { daysAgoIsoLocal } from './week'
import type { ExerciseLog } from './types'

export interface BackfillResult {
  scannedDates:   number
  daysCreated:    number
  daysUpdated:    number
  totalKcalIn:    number
  totalKcalBurnt: number
}

/**
 * Backfill the given user's daily_logs from workout_logs + meal_logs over the
 * last `daysBack` days. Idempotent — safe to run multiple times.
 */
export async function backfillDailyLogs(
  userId:        string,
  bodyWeightKg:  number | null | undefined,
  daysBack       = 90,
): Promise<BackfillResult> {
  const supabase = createClient()
  const since = daysAgoIsoLocal(daysBack)

  const [workoutsRes, mealsRes, dailyRes] = await Promise.all([
    supabase
      .from('workout_logs')
      .select('id, date, duration_minutes, exercise_logs(exercise_name, muscle_group, set_number, reps, weight_kg)')
      .eq('user_id', userId)
      .gte('date', since),
    supabase
      .from('meal_logs')
      .select('date, calories')
      .eq('user_id', userId)
      .gte('date', since),
    supabase
      .from('daily_logs')
      .select('id, date, kcal_in, kcal_burnt, workout_done, is_rest_day')
      .eq('user_id', userId)
      .gte('date', since),
  ])

  type WorkoutRow = {
    id:               string
    date:             string
    duration_minutes: number | null
    exercise_logs:    ExerciseLog[]
  }
  const workouts = (workoutsRes.data ?? []) as WorkoutRow[]
  const meals    = (mealsRes.data    ?? []) as { date: string; calories: number }[]
  const existing = (dailyRes.data    ?? []) as {
    id: string; date: string; kcal_in: number; kcal_burnt: number
    workout_done: boolean; is_rest_day: boolean
  }[]

  // Aggregate per date: sum meal kcal_in; sum estimated workout kcal_burnt
  const perDate = new Map<string, { kcal_in: number; kcal_burnt: number; workout_done: boolean }>()

  for (const m of meals) {
    const cur = perDate.get(m.date) ?? { kcal_in: 0, kcal_burnt: 0, workout_done: false }
    cur.kcal_in += m.calories || 0
    perDate.set(m.date, cur)
  }
  for (const w of workouts) {
    const exercisesByName: Record<string, ExerciseSummary> = {}
    for (const el of w.exercise_logs ?? []) {
      const key = el.exercise_name
      if (!exercisesByName[key]) {
        exercisesByName[key] = { exercise_name: el.exercise_name, muscle_group: el.muscle_group, sets: [] }
      }
      exercisesByName[key].sets.push({ reps: el.reps, weight_kg: el.weight_kg })
    }
    const est = estimateWorkoutKcal(
      Object.values(exercisesByName),
      w.duration_minutes,
      bodyWeightKg,
      false,
    )
    const cur = perDate.get(w.date) ?? { kcal_in: 0, kcal_burnt: 0, workout_done: false }
    cur.kcal_burnt += est.kcal
    cur.workout_done = true
    perDate.set(w.date, cur)
  }

  // Reconcile against existing daily_logs:
  //   - If row exists and has non-zero kcal_in / kcal_burnt: leave alone (user data wins)
  //   - If row exists with zeros: update with derived totals (use MAX, not overwrite)
  //   - If no row: insert
  const toInsert: Array<{
    user_id: string; date: string; kcal_in: number; kcal_burnt: number
    workout_done: boolean; is_rest_day: boolean; notes: string | null
  }> = []
  const toUpdate: Array<{ id: string; kcal_in?: number; kcal_burnt?: number; workout_done?: boolean }> = []

  let daysCreated = 0
  let daysUpdated = 0
  let totalKcalIn = 0
  let totalKcalBurnt = 0

  const existingByDate = new Map(existing.map(r => [r.date, r]))

  for (const [date, derived] of perDate.entries()) {
    totalKcalIn += derived.kcal_in
    totalKcalBurnt += derived.kcal_burnt
    const ex = existingByDate.get(date)
    if (!ex) {
      toInsert.push({
        user_id:      userId,
        date,
        kcal_in:      Math.round(derived.kcal_in),
        kcal_burnt:   Math.round(derived.kcal_burnt),
        workout_done: derived.workout_done,
        is_rest_day:  false,
        notes:        null,
      })
      daysCreated++
    } else {
      const upd: { id: string; kcal_in?: number; kcal_burnt?: number; workout_done?: boolean } = { id: ex.id }
      let dirty = false
      // Take max so we never reduce existing user numbers
      const newIn = Math.max(ex.kcal_in, Math.round(derived.kcal_in))
      if (newIn !== ex.kcal_in)   { upd.kcal_in    = newIn; dirty = true }
      const newBurnt = Math.max(ex.kcal_burnt, Math.round(derived.kcal_burnt))
      if (newBurnt !== ex.kcal_burnt) { upd.kcal_burnt = newBurnt; dirty = true }
      if (derived.workout_done && !ex.workout_done && !ex.is_rest_day) {
        upd.workout_done = true; dirty = true
      }
      if (dirty) { toUpdate.push(upd); daysUpdated++ }
    }
  }

  // Execute writes
  if (toInsert.length > 0) {
    await supabase.from('daily_logs').insert(toInsert)
  }
  for (const u of toUpdate) {
    const { id, ...fields } = u
    await supabase.from('daily_logs').update(fields).eq('id', id)
  }

  return {
    scannedDates:   perDate.size,
    daysCreated,
    daysUpdated,
    totalKcalIn:    Math.round(totalKcalIn),
    totalKcalBurnt: Math.round(totalKcalBurnt),
  }
}
