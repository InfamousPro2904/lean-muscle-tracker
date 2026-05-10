// Personal Record (PR) detection for resistance exercises.
//
// Two PR types tracked:
//   • max_weight   — heaviest single set (any reps)
//   • max_1rm      — best estimated 1-rep max via the Epley formula:
//                    1RM = weight × (1 + reps / 30)
// Both are computed per exercise name. We also track the date observed.
//
// Bodyweight-only exercises (weight = 0 or null) are skipped — there's no
// load to PR. Reps PRs for bodyweight could be added later but are noisy.

import type { ExerciseLog } from './types'

export interface ExercisePRs {
  exercise:     string
  maxWeight:    number   // kg
  maxWeightAt:  string   // YYYY-MM-DD
  max1RM:       number   // kg (Epley estimate)
  max1RMAt:     string   // YYYY-MM-DD
}

export interface NewPR {
  exercise:    string
  /** What kind of record was broken */
  kind:        'max_weight' | 'max_1rm' | 'both'
  newWeight:   number
  newReps:     number
  new1RM:      number
  prevWeight:  number
  prev1RM:     number
}

/** Standard Epley 1RM estimate. Caps reps at 30 to avoid asymptote weirdness. */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  const r = Math.min(reps, 30)
  return Math.round(weight * (1 + r / 30) * 10) / 10
}

/** Build a per-exercise PR map from a flat list of historical sets. */
export function summarizePRs(
  sets: Array<{ exercise_name: string; reps: number | null; weight_kg: number | null; date: string }>
): Map<string, ExercisePRs> {
  const map = new Map<string, ExercisePRs>()
  for (const s of sets) {
    const w = s.weight_kg ?? 0
    const r = s.reps ?? 0
    if (w <= 0 || r <= 0) continue
    const oneRm = epley1RM(w, r)
    const cur = map.get(s.exercise_name)
    if (!cur) {
      map.set(s.exercise_name, {
        exercise: s.exercise_name, maxWeight: w, maxWeightAt: s.date,
        max1RM: oneRm, max1RMAt: s.date,
      })
      continue
    }
    if (w > cur.maxWeight)     { cur.maxWeight = w; cur.maxWeightAt = s.date }
    if (oneRm > cur.max1RM)    { cur.max1RM = oneRm; cur.max1RMAt = s.date }
  }
  return map
}

/**
 * Given a freshly-saved workout's exercise sets and the user's full
 * historical-PR map (from BEFORE this session), return any PRs broken.
 *
 * historical = baseline. newSets = candidates. Only the BEST set per exercise
 * in newSets contributes a PR — we don't fire 3 notifications for 3 PR sets.
 */
export function findNewPRs(
  newSets:    Array<{ exercise_name: string; reps: number | null; weight_kg: number | null }>,
  historical: Map<string, ExercisePRs>,
): NewPR[] {
  // Reduce newSets to a per-exercise best
  const bestByExercise = new Map<string, { weight: number; reps: number; oneRm: number }>()
  for (const s of newSets) {
    const w = s.weight_kg ?? 0
    const r = s.reps ?? 0
    if (w <= 0 || r <= 0) continue
    const oneRm = epley1RM(w, r)
    const cur = bestByExercise.get(s.exercise_name)
    if (!cur || oneRm > cur.oneRm) {
      bestByExercise.set(s.exercise_name, { weight: w, reps: r, oneRm })
    }
  }

  const prs: NewPR[] = []
  for (const [exercise, best] of bestByExercise) {
    const prev = historical.get(exercise)
    const prevWeight = prev?.maxWeight ?? 0
    const prev1RM    = prev?.max1RM    ?? 0
    const beatsWeight = best.weight > prevWeight
    const beats1RM    = best.oneRm  > prev1RM
    if (!beatsWeight && !beats1RM) continue
    prs.push({
      exercise,
      kind:       beatsWeight && beats1RM ? 'both' : (beatsWeight ? 'max_weight' : 'max_1rm'),
      newWeight:  best.weight,
      newReps:    best.reps,
      new1RM:     best.oneRm,
      prevWeight,
      prev1RM,
    })
  }
  return prs
}

/** Build a "Last time" hint string for an exercise: "Last: 60 kg × 8" or null. */
export function formatLastTime(
  history: Array<{ exercise_name: string; reps: number | null; weight_kg: number | null }>,
  exerciseName: string,
): string | null {
  // Find the LATEST occurrence — list is expected sorted by date desc by caller
  const last = history.find(h => h.exercise_name === exerciseName && (h.weight_kg ?? 0) > 0)
  if (!last) return null
  return `Last: ${last.weight_kg} kg × ${last.reps ?? '?'}`
}

export interface VolumeStats {
  totalVolumeKg: number
  setCount:      number
  exerciseCount: number
}

/** Compute total volume (sum reps × weight) + counts for a list of exercise sets. */
export function computeVolumeStats(
  sets: Pick<ExerciseLog, 'reps' | 'weight_kg' | 'exercise_name'>[]
): VolumeStats {
  let totalVolumeKg = 0
  let setCount = 0
  const exercises = new Set<string>()
  for (const s of sets) {
    setCount++
    exercises.add(s.exercise_name)
    const w = s.weight_kg ?? 0
    const r = s.reps ?? 0
    if (w > 0 && r > 0) totalVolumeKg += w * r
  }
  return { totalVolumeKg: Math.round(totalVolumeKg), setCount, exerciseCount: exercises.size }
}
