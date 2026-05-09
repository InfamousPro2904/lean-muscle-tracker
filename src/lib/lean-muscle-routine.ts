export const LEAN_MUSCLE_ROUTINE_NAME = 'Lean Muscle - Dumbbell Upper / Gym Lower'

export const OLD_BRO_SPLIT_ROUTINE_NAMES = [
  'Chest/Tri',
  'Back/Bi',
  'Legs',
  'Shoulders',
  'Arms/Core',
] as const

export type LeanMuscleSplitType = 'upper_body' | 'lower_body' | 'rest' | 'recovery'

export interface LeanMuscleExerciseTemplate {
  exercise_name: string
  muscle_group: string
  sets: string
  reps: string
  rest_seconds: number
  rest_label: string
  notes?: string
}

export interface LeanMuscleRoutineTemplate {
  name: string
  day_name: string
  day_of_week: number[]
  description: string
  split_type: LeanMuscleSplitType
  type_label: 'Upper Body' | 'Lower Body' | 'Rest' | 'Recovery'
  exercises: LeanMuscleExerciseTemplate[]
}

const routineDescription = '2000 kcal vegetarian lean-muscle plan; upper days are dumbbell/bodyweight only, lower days are gym-based.'

export const LEAN_MUSCLE_WEEKLY_ROUTINES: LeanMuscleRoutineTemplate[] = [
  {
    name: 'Upper A - Dumbbell',
    day_name: 'Monday',
    day_of_week: [1],
    description: routineDescription,
    split_type: 'upper_body',
    type_label: 'Upper Body',
    exercises: [
      { exercise_name: 'Dumbbell Incline Press', muscle_group: 'Chest', sets: '3', reps: '8-12', rest_seconds: 90, rest_label: '90s rest' },
      { exercise_name: 'One-Arm Dumbbell Row', muscle_group: 'Back', sets: '3', reps: '8-12 each side', rest_seconds: 90, rest_label: '90s rest' },
      { exercise_name: 'Dumbbell Flat Press or Floor Press', muscle_group: 'Chest', sets: '3', reps: '8-12', rest_seconds: 90, rest_label: '90s rest' },
      { exercise_name: 'Dumbbell Pullover', muscle_group: 'Back/Lats', sets: '2-3', reps: '10-15', rest_seconds: 90, rest_label: '60-90s rest' },
      { exercise_name: 'Dumbbell Lateral Raise', muscle_group: 'Shoulders', sets: '3', reps: '12-20', rest_seconds: 60, rest_label: '60s rest' },
      { exercise_name: 'Dumbbell Skull Crusher', muscle_group: 'Triceps', sets: '2', reps: '10-15', rest_seconds: 60, rest_label: '60s rest' },
      { exercise_name: 'Dumbbell Curl', muscle_group: 'Biceps', sets: '2', reps: '10-15', rest_seconds: 60, rest_label: '60s rest' },
    ],
  },
  {
    name: 'Lower A - Gym Squat Focus',
    day_name: 'Tuesday',
    day_of_week: [2],
    description: routineDescription,
    split_type: 'lower_body',
    type_label: 'Lower Body',
    exercises: [
      { exercise_name: 'Back Squat or Front Squat', muscle_group: 'Quads/Glutes', sets: '3', reps: '6-10', rest_seconds: 120, rest_label: '120s rest' },
      { exercise_name: 'Romanian Deadlift', muscle_group: 'Hamstrings/Glutes', sets: '3', reps: '8-10', rest_seconds: 90, rest_label: '90s rest' },
      { exercise_name: 'Leg Press', muscle_group: 'Quads/Glutes', sets: '3', reps: '10-12', rest_seconds: 90, rest_label: '90s rest' },
      { exercise_name: 'Seated or Lying Leg Curl', muscle_group: 'Hamstrings', sets: '3', reps: '10-15', rest_seconds: 90, rest_label: '60-90s rest' },
      { exercise_name: 'Standing or Seated Calf Raise', muscle_group: 'Calves', sets: '3', reps: '12-20', rest_seconds: 60, rest_label: '60s rest' },
      { exercise_name: 'Hanging Knee Raise or Cable Crunch', muscle_group: 'Core', sets: '3', reps: '10-15', rest_seconds: 60, rest_label: '60s rest' },
    ],
  },
  {
    name: 'Upper B - Dumbbell',
    day_name: 'Wednesday',
    day_of_week: [3],
    description: routineDescription,
    split_type: 'upper_body',
    type_label: 'Upper Body',
    exercises: [
      { exercise_name: 'Dumbbell Shoulder Press', muscle_group: 'Shoulders', sets: '3', reps: '8-12', rest_seconds: 90, rest_label: '90s rest' },
      { exercise_name: 'Chest-Supported Dumbbell Row or Bent-Over Dumbbell Row', muscle_group: 'Back', sets: '3', reps: '8-12', rest_seconds: 90, rest_label: '90s rest' },
      { exercise_name: 'Dumbbell Squeeze Press or Push-Up', muscle_group: 'Chest', sets: '3', reps: '10-15', rest_seconds: 90, rest_label: '60-90s rest' },
      { exercise_name: 'Dumbbell Rear Delt Fly', muscle_group: 'Rear Delts', sets: '3', reps: '12-20', rest_seconds: 60, rest_label: '60s rest' },
      { exercise_name: 'Dumbbell Lateral Raise', muscle_group: 'Shoulders', sets: '2-3', reps: '12-20', rest_seconds: 60, rest_label: '60s rest' },
      { exercise_name: 'Hammer Curl', muscle_group: 'Biceps', sets: '2', reps: '10-15', rest_seconds: 60, rest_label: '60s rest' },
      { exercise_name: 'Dumbbell Overhead Triceps Extension', muscle_group: 'Triceps', sets: '2', reps: '10-15', rest_seconds: 60, rest_label: '60s rest' },
    ],
  },
  {
    name: 'Rest',
    day_name: 'Thursday',
    day_of_week: [4],
    description: routineDescription,
    split_type: 'rest',
    type_label: 'Rest',
    exercises: [],
  },
  {
    name: 'Lower B - Gym Hinge Focus',
    day_name: 'Friday',
    day_of_week: [5],
    description: routineDescription,
    split_type: 'lower_body',
    type_label: 'Lower Body',
    exercises: [
      { exercise_name: 'Romanian Deadlift or Deadlift', muscle_group: 'Hamstrings/Glutes', sets: '3', reps: '6-10', rest_seconds: 120, rest_label: '120s rest' },
      { exercise_name: 'Bulgarian Split Squat', muscle_group: 'Quads/Glutes', sets: '3', reps: '8-12 each leg', rest_seconds: 90, rest_label: '90s rest' },
      { exercise_name: 'Hip Thrust', muscle_group: 'Glutes', sets: '3', reps: '8-12', rest_seconds: 90, rest_label: '90s rest' },
      { exercise_name: 'Leg Extension', muscle_group: 'Quads', sets: '3', reps: '12-15', rest_seconds: 60, rest_label: '60s rest' },
      { exercise_name: 'Seated or Lying Leg Curl', muscle_group: 'Hamstrings', sets: '2-3', reps: '10-15', rest_seconds: 90, rest_label: '60-90s rest' },
      { exercise_name: 'Standing or Seated Calf Raise', muscle_group: 'Calves', sets: '3', reps: '12-20', rest_seconds: 60, rest_label: '60s rest' },
      { exercise_name: 'Ab Wheel Rollout or Cable Crunch', muscle_group: 'Core', sets: '2-3', reps: '8-15', rest_seconds: 60, rest_label: '60s rest' },
    ],
  },
  {
    name: 'Rest',
    day_name: 'Saturday',
    day_of_week: [6],
    description: routineDescription,
    split_type: 'rest',
    type_label: 'Rest',
    exercises: [],
  },
  {
    name: 'Optional Recovery + Core',
    day_name: 'Sunday',
    day_of_week: [0],
    description: routineDescription,
    split_type: 'recovery',
    type_label: 'Recovery',
    exercises: [
      { exercise_name: 'Brisk Walk or Cycling', muscle_group: 'Cardio', sets: '1', reps: '25-40 minutes, easy pace', rest_seconds: 0, rest_label: '' },
      { exercise_name: 'Mobility Work', muscle_group: 'Mobility', sets: '1', reps: '10-15 minutes', rest_seconds: 0, rest_label: '' },
      { exercise_name: 'Plank or Dead Bug or Bird Dog', muscle_group: 'Core', sets: '2-3', reps: 'controlled reps/time', rest_seconds: 0, rest_label: '' },
    ],
  },
]

export function parseRoutineSetCount(sets: string | number): number {
  if (typeof sets === 'number') return sets
  const match = sets.match(/\d+/)
  return match ? Number(match[0]) : 1
}

export function isOldBroSplitRoutineName(name: string): boolean {
  return OLD_BRO_SPLIT_ROUTINE_NAMES.some((oldName) => (
    name === oldName ||
    name.startsWith(`${oldName} -`) ||
    name.startsWith(`${oldName} `)
  ))
}

export function formatRoutineReps(reps: string): string {
  const value = reps.trim()
  if (/reps?|minutes?|mins?|seconds?|secs?|pace|time/i.test(value)) return value
  if (/each side/i.test(value)) return value.replace(/each side/i, 'reps each side')
  if (/each leg/i.test(value)) return value.replace(/each leg/i, 'reps each leg')
  return `${value} reps`
}

export function formatRoutinePrescription(exercise: {
  sets: string | number
  reps: string
  rest_seconds?: number
  rest_label?: string
}): string {
  const setCount = parseRoutineSetCount(exercise.sets)
  const setLabel = typeof exercise.sets === 'string'
    ? `${exercise.sets} sets`
    : `${exercise.sets} ${setCount === 1 ? 'set' : 'sets'}`
  const restLabel = exercise.rest_label || (
    exercise.rest_seconds && exercise.rest_seconds > 0 ? `${exercise.rest_seconds}s rest` : ''
  )

  return [setLabel, formatRoutineReps(exercise.reps), restLabel].filter(Boolean).join(' x ')
}
