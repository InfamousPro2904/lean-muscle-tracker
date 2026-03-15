-- Lean Muscle Tracker — Database Schema
-- Run this in Supabase SQL Editor

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INTEGER,
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  goal TEXT DEFAULT 'lean_muscle',
  activity_level TEXT DEFAULT 'moderate',
  calorie_target INTEGER DEFAULT 2500,
  protein_target INTEGER DEFAULT 150,
  carb_target INTEGER DEFAULT 300,
  fat_target INTEGER DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout routines (templates)
CREATE TABLE IF NOT EXISTS workout_routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  split_type TEXT DEFAULT 'custom', -- ppl, upper_lower, full_body, custom
  day_of_week INTEGER[], -- 0=Sun, 1=Mon, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises within routines
CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID REFERENCES workout_routines(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '8-12', -- text to allow ranges like "8-12"
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout logs (actual completed workouts)
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES workout_routines(id) ON DELETE SET NULL,
  workout_name TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual exercise logs within a workout
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight_kg DECIMAL(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal logs
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
  food_name TEXT NOT NULL,
  calories INTEGER DEFAULT 0,
  protein_g DECIMAL(6,2) DEFAULT 0,
  carbs_g DECIMAL(6,2) DEFAULT 0,
  fat_g DECIMAL(6,2) DEFAULT 0,
  quantity TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress tracking (body measurements)
CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  weight_kg DECIMAL(5,2),
  body_fat_pct DECIMAL(4,1),
  chest_cm DECIMAL(5,2),
  waist_cm DECIMAL(5,2),
  arms_cm DECIMAL(5,2),
  thighs_cm DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (each user sees only their data)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- Policies (drop if exist, then recreate)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own routines" ON workout_routines;
DROP POLICY IF EXISTS "Users can manage own routine exercises" ON routine_exercises;
DROP POLICY IF EXISTS "Users can manage own workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Users can manage own exercise logs" ON exercise_logs;
DROP POLICY IF EXISTS "Users can manage own meals" ON meal_logs;
DROP POLICY IF EXISTS "Users can manage own progress" ON progress_logs;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own routines" ON workout_routines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own routine exercises" ON routine_exercises FOR ALL USING (
  routine_id IN (SELECT id FROM workout_routines WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own workout logs" ON workout_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own exercise logs" ON exercise_logs FOR ALL USING (
  workout_log_id IN (SELECT id FROM workout_logs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own meals" ON meal_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own progress" ON progress_logs FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
