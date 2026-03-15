export interface Profile {
  id: string
  full_name: string
  age: number | null
  weight_kg: number | null
  height_cm: number | null
  goal: string
  activity_level: string
  calorie_target: number
  protein_target: number
  carb_target: number
  fat_target: number
  created_at: string
  updated_at: string
}

export interface WorkoutRoutine {
  id: string
  user_id: string
  name: string
  description: string | null
  split_type: string
  day_of_week: number[]
  is_active: boolean
  created_at: string
  updated_at: string
  exercises?: RoutineExercise[]
}

export interface RoutineExercise {
  id: string
  routine_id: string
  exercise_name: string
  muscle_group: string
  sets: number
  reps: string
  rest_seconds: number
  notes: string | null
  sort_order: number
}

export interface WorkoutLog {
  id: string
  user_id: string
  routine_id: string | null
  workout_name: string
  date: string
  duration_minutes: number | null
  notes: string | null
  created_at: string
  exercise_logs?: ExerciseLog[]
}

export interface ExerciseLog {
  id: string
  workout_log_id: string
  exercise_name: string
  muscle_group: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  notes: string | null
}

export interface MealLog {
  id: string
  user_id: string
  date: string
  meal_type: string
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  quantity: string | null
  notes: string | null
  created_at: string
}

export interface ProgressLog {
  id: string
  user_id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  chest_cm: number | null
  waist_cm: number | null
  arms_cm: number | null
  thighs_cm: number | null
  notes: string | null
  created_at: string
}

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves',
  'Abs', 'Traps', 'Full Body'
] as const

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'] as const

export const SPLIT_TYPES = [
  { value: 'ppl', label: 'Push/Pull/Legs' },
  { value: 'upper_lower', label: 'Upper/Lower' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'bro_split', label: 'Bro Split (1 muscle/day)' },
  { value: 'custom', label: 'Custom' },
] as const

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
