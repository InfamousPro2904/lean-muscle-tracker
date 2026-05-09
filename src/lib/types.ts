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
  meal_session_id: string | null
}

// Per-100g macro values (kcal + grams of P/C/F)
export interface Macros100g {
  kcal:    number
  protein: number
  carbs:   number
  fat:     number
}

// Item in a multi-item meal basket / template (computed at log time)
export interface BasketItem {
  id:      string
  name:    string
  brand?:  string
  per100g: Macros100g
  grams:   number
}

// JSONB items inside meal_templates.items
export interface TemplateItem {
  food_name: string
  grams:     number
  per_100g:  Macros100g
}

export interface MealTemplate {
  id:                string
  user_id:           string
  name:              string
  default_meal_type: string | null
  items:             TemplateItem[]
  is_favorite:       boolean
  use_count:         number
  last_used_at:      string | null
  created_at:        string
}

export interface FoodFavorite {
  id:           string
  user_id:      string
  food_name:    string
  per_100g:     Macros100g
  use_count:    number
  last_used_at: string | null
  created_at:   string
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
  'Abs', 'Core', 'Traps', 'Back/Lats', 'Rear Delts',
  'Quads/Glutes', 'Hamstrings/Glutes', 'Cardio', 'Mobility',
  'Full Body'
] as const

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'] as const

export const SPLIT_TYPES = [
  { value: 'ppl', label: 'Push/Pull/Legs' },
  { value: 'upper_lower', label: 'Upper/Lower' },
  { value: 'upper_body', label: 'Upper Body' },
  { value: 'lower_body', label: 'Lower Body' },
  { value: 'rest', label: 'Rest' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'bro_split', label: 'Bro Split (1 muscle/day)' },
  { value: 'custom', label: 'Custom' },
] as const

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

// ── Leaderboard types ──────────────────────────────────────────────

export type GoalType      = 'cut' | 'bulk' | 'athletic'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type BadgeType     = 'first_log' | 'streak_7' | 'streak_30' | 'week_winner' | 'top_scorer' | 'consistent' | 'century'

export interface DailyLog {
  id:           string
  user_id:      string
  date:         string
  kcal_in:      number
  kcal_burnt:   number
  workout_done: boolean
  is_rest_day:  boolean
  notes:        string | null
  created_at:   string
  updated_at:   string
}

export interface Leaderboard {
  id:           string
  created_by:   string
  name:         string
  description:  string | null
  invite_code:  string
  is_active:    boolean
  auto_archive: boolean
  is_public:    boolean
  created_at:   string
}

export interface LeaderboardMember {
  id:                string
  leaderboard_id:    string
  user_id:           string
  goal_type:         GoalType
  target_weight_kg:  number | null
  start_weight_kg:   number | null
  current_weight_kg: number | null
  activity_level:    ActivityLevel
  joined_at:         string
  profile?:          { full_name: string; weight_kg: number | null; height_cm: number | null; age: number | null }
}

export interface WeeklyScore {
  total:       number
  adherence:   number
  burnt:       number
  consistency: number
  progress:    number
}

export interface WeeklyArchive {
  id:             string
  leaderboard_id: string
  week_start:     string
  week_end:       string
  winner_user_id: string | null
  scores:         Record<string, WeeklyScore>
  archived_at:    string
}

export interface Badge {
  id:             string
  user_id:        string
  leaderboard_id: string | null
  badge_type:     BadgeType
  meta:           Record<string, unknown>
  earned_at:      string
}

export interface Reaction {
  id:             string
  archive_id:     string
  target_user_id: string
  from_user_id:   string
  emoji:          string
  created_at:     string
}

export interface Notification {
  id:         string
  user_id:    string
  type:       string
  title:      string
  body:       string | null
  data:       Record<string, unknown>
  read:       boolean
  created_at: string
}
