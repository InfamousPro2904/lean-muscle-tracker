// Calorie-burn estimation for resistance + bodyweight workouts.
//
// Based on the Compendium of Physical Activities (Ainsworth et al., 2011) MET
// values and the standard formula:
//
//   kcal = MET × body_weight_kg × duration_hours
//
// Reference MET values used:
//   • Light resistance (machines, low load):       3.5 MET
//   • Moderate resistance (free weights):           5.0 MET
//   • Vigorous resistance (heavy free weights):     6.0 MET
//   • Bodyweight calisthenics, moderate:            3.8 MET
//   • Vigorous bodyweight / circuit training:       8.0 MET
//   • Cardio (steady-state, moderate):              7.0 MET
//   • HIIT / vigorous cardio:                       9.0 MET
//
// Intensity is auto-classified from total session volume relative to the
// athlete's bodyweight when no explicit MET is supplied.
//
// If duration_minutes is missing we fall back to a per-set heuristic
// (avg ~2 min between completed sets including rest) before applying MET.

export interface SetSummary {
  reps:      number | null
  weight_kg: number | null
}

export interface ExerciseSummary {
  exercise_name: string
  muscle_group:  string
  sets:          SetSummary[]
}

export interface KcalEstimate {
  kcal:          number
  met:           number
  intensity:     'light' | 'moderate' | 'vigorous'
  durationMin:   number
  source:        'duration+volume' | 'set-count' | 'rest-day' | 'no-body-weight'
  notes:         string
}

const DEFAULT_BODY_WEIGHT_KG = 70  // last-resort if profile.weight_kg unset

/**
 * Estimate kcal_burnt for a single workout session.
 *
 * @param exercises        Exercises with their completed sets (reps × weight).
 * @param durationMin      Minutes the session ran. If null, estimated from set count.
 * @param bodyWeightKg     Athlete's body weight in kg (from profiles.weight_kg). Defaults to 70.
 * @param isCardioOrHIIT   Caller hint: tag the workout as cardio/HIIT to boost MET.
 */
export function estimateWorkoutKcal(
  exercises:      ExerciseSummary[],
  durationMin:    number | null | undefined,
  bodyWeightKg:   number | null | undefined,
  isCardioOrHIIT = false,
): KcalEstimate {
  const bw = bodyWeightKg && bodyWeightKg > 30 ? bodyWeightKg : DEFAULT_BODY_WEIGHT_KG

  // Empty session → no kcal
  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0)
  if (totalSets === 0 && (!durationMin || durationMin <= 0)) {
    return { kcal: 0, met: 0, intensity: 'light', durationMin: 0, source: 'rest-day', notes: 'No sets logged' }
  }

  // Compute total volume + average load fraction (load / bodyweight)
  // Bodyweight exercises (weight = 0 or null) get scored based on rep count.
  let totalVolume = 0
  let weightedSets = 0
  let bodyweightSets = 0
  for (const ex of exercises) {
    for (const set of ex.sets) {
      const reps = set.reps ?? 0
      const wt   = set.weight_kg ?? 0
      if (wt > 0) {
        totalVolume += reps * wt
        weightedSets++
      } else if (reps > 0) {
        bodyweightSets++
      }
    }
  }

  // Duration: prefer user-provided, else heuristic (~2 min/set incl. rest)
  const dur = durationMin && durationMin > 0
    ? durationMin
    : Math.max(8, Math.round(totalSets * 2))

  // Pick MET based on intensity classification
  let met: number
  let intensity: 'light' | 'moderate' | 'vigorous'

  if (isCardioOrHIIT) {
    // Caller-flagged cardio/HIIT — use higher MET
    met = 8.5
    intensity = 'vigorous'
  } else if (bodyweightSets > 0 && weightedSets === 0) {
    // Pure bodyweight session
    // Score by reps/min density: >1.5 reps/min/set ⇒ vigorous
    const totalReps = exercises.reduce((s, e) => s + e.sets.reduce((ss, st) => ss + (st.reps ?? 0), 0), 0)
    const repsPerMin = totalReps / dur
    if (repsPerMin >= 4) { met = 8.0; intensity = 'vigorous' }
    else                 { met = 3.8; intensity = 'moderate' }
  } else {
    // Resistance-dominated session — classify by avg load fraction
    const avgLoad = weightedSets > 0 ? totalVolume / weightedSets : 0  // avg kg-reps per set
    const avgLoadPerRep = weightedSets > 0
      ? exercises.reduce((s, e) => s + e.sets.reduce((ss, st) => ss + (st.weight_kg ?? 0), 0), 0) / weightedSets
      : 0
    const loadFraction = avgLoadPerRep / bw
    if (loadFraction >= 0.7) {
      met = 6.0; intensity = 'vigorous'
    } else if (loadFraction >= 0.35) {
      met = 5.0; intensity = 'moderate'
    } else if (avgLoad > 0) {
      met = 3.5; intensity = 'light'
    } else {
      met = 3.5; intensity = 'light'
    }
  }

  const kcal = Math.round(met * bw * (dur / 60))
  const source: KcalEstimate['source'] = durationMin && durationMin > 0 ? 'duration+volume' : 'set-count'
  const notes = `${intensity} intensity (MET ${met}) × ${bw} kg × ${dur} min`

  return { kcal, met, intensity, durationMin: dur, source, notes }
}

/**
 * Estimate kcal for a "rest day" or unlogged-day with just a few sets.
 * Useful for the leaderboard to score mobility/stretching as light activity.
 */
export function estimateLightActivityKcal(durationMin: number, bodyWeightKg: number | null | undefined): number {
  const bw = bodyWeightKg && bodyWeightKg > 30 ? bodyWeightKg : DEFAULT_BODY_WEIGHT_KG
  return Math.round(2.3 * bw * (durationMin / 60))  // 2.3 MET = stretching / mobility
}
