'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Dumbbell, UtensilsCrossed, TrendingUp, Target, Flame, Plus,
  ChevronDown, ChevronUp, Sparkles, Calendar, Clock, Zap,
  Activity, BarChart2, BookOpen, BookmarkPlus, CheckCircle2,
  AlertCircle, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Profile, MealLog, WorkoutLog, ProgressLog, DailyLog, WorkoutRoutine, Badge } from '@/lib/types'
import { getWeekStartIso, getWeekEndIso, todayIsoLocal, formatWeekRange, daysAgoIsoLocal } from '@/lib/week'
import { calculateStreak, BADGE_DEFINITIONS } from '@/lib/scoring'
import { lastWeekRange, computeDelta, pickSmartAction, type SmartAction, shouldSendStreakReminder, markStreakReminderSent } from '@/lib/insights'
import { MUSCLE_GROUPS as PRESET_GROUPS } from '@/lib/exercise-presets'
import {
  LEAN_MUSCLE_ROUTINE_NAME,
  LEAN_MUSCLE_WEEKLY_ROUTINES,
  formatRoutineReps,
  parseRoutineSetCount,
} from '@/lib/lean-muscle-routine'

// ── AI Workout Planner ─────────────────────────────────────────────

type PlanGoal = 'lean_muscle' | 'fat_loss' | 'strength' | 'maintenance'
type PlanDays = 3 | 4 | 5 | 6 | 7
type PlanTime = 30 | 45 | 60 | 90
type PlanEquipment = 'bodyweight' | 'dumbbells' | 'full_gym'
type PlanLevel = 'beginner' | 'intermediate' | 'advanced'

interface PlannerForm {
  goal: PlanGoal
  days: PlanDays
  time: PlanTime
  equipment: PlanEquipment
  level: PlanLevel
}

interface PlannedExercise {
  name: string
  muscleGroup: string
  sets: string
  reps: string
  equipment: string
  restSeconds: number
  restLabel?: string
  notes?: string
}

interface DayPlan {
  dayName: string
  focus: string
  workoutName: string
  typeLabel: string
  splitType?: string
  description?: string
  exercises: PlannedExercise[]
  isRest?: boolean
  isRecovery?: boolean
}

const SPLIT_CONFIGS: Record<string, (days: number) => string[]> = {
  3: () => ['Push', 'Pull', 'Legs'],
  4: () => ['Upper', 'Lower', 'Push', 'Pull'],
  5: () => ['Upper', 'Lower', 'Upper', 'Lower', 'Recovery'],
  6: () => ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function generateWorkoutPlan(form: PlannerForm): DayPlan[] {
  if (form.days === 7 && form.goal === 'lean_muscle') {
    return LEAN_MUSCLE_WEEKLY_ROUTINES.map((routine) => ({
      dayName: routine.day_name,
      focus: routine.name,
      workoutName: routine.name,
      typeLabel: routine.type_label,
      splitType: routine.split_type,
      description: `${LEAN_MUSCLE_ROUTINE_NAME}: ${routine.description}`,
      isRest: routine.split_type === 'rest',
      isRecovery: routine.split_type === 'recovery',
      exercises: routine.exercises.map((exercise) => ({
        name: exercise.exercise_name,
        muscleGroup: exercise.muscle_group,
        sets: exercise.sets,
        reps: exercise.reps,
        equipment: routine.type_label,
        restSeconds: exercise.rest_seconds,
        restLabel: exercise.rest_label,
        notes: exercise.notes,
      })),
    }))
  }

  const allDays = [...DAY_NAMES]
  const splitLabels = SPLIT_CONFIGS[form.days]?.(form.days) ?? ['Full Body', 'Rest', 'Full Body']

  const exercisesPerDay = form.time <= 30 ? 3 : form.time <= 45 ? 4 : form.time <= 60 ? 5 : 6
  const setCount = form.level === 'beginner' ? '3' : form.level === 'intermediate' ? '3–4' : '4'

  const equipMap: Record<PlanEquipment, 'bodyweight' | 'free_weight' | 'machine'> = {
    bodyweight: 'bodyweight',
    dumbbells: 'free_weight',
    full_gym: 'machine',
  }
  const equipPref = equipMap[form.equipment]

  const repRanges: Record<PlanGoal, string> = {
    lean_muscle: '8–12',
    fat_loss: '12–15',
    strength: '4–6',
    maintenance: '10–12',
  }
  const reps = repRanges[form.goal]

  // Map split focus → preset muscle group IDs
  const focusToMuscles: Record<string, string[]> = {
    Push:      ['chest', 'shoulders', 'triceps'],
    Pull:      ['back', 'biceps'],
    Legs:      ['quadriceps', 'hamstrings', 'glutes', 'calves'],
    Upper:     ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    Lower:     ['quadriceps', 'hamstrings', 'glutes', 'calves'],
    Recovery:  ['core_abs'],
    'Full Body':    ['chest', 'back', 'quadriceps', 'shoulders', 'biceps'],
  }

  const plans: DayPlan[] = []

  for (let i = 0; i < 7; i++) {
    const splitIdx = i < form.days ? i : -1
    const isRest = splitIdx === -1

    if (isRest) {
      plans.push({
        dayName: allDays[i],
        focus: 'Rest & Recovery',
        workoutName: 'Rest',
        typeLabel: 'Rest',
        splitType: 'rest',
        exercises: [],
        isRest: true,
      })
      continue
    }

    const focus = splitLabels[splitIdx]
    const muscleIds = focusToMuscles[focus] ?? ['chest']

    // Collect exercises from preset groups matching the muscle IDs
    const candidates: PlannedExercise[] = []

    for (const muscleId of muscleIds) {
      const group = PRESET_GROUPS.find(g => g.id === muscleId)
      if (!group) continue

      for (const entry of group.exercises) {
        // Prefer the configured equipment, fall back down the chain
        const variant =
          (equipPref === 'machine' ? entry.machine : null) ??
          (equipPref === 'free_weight' || form.equipment === 'dumbbells' ? entry.free_weight : null) ??
          entry.bodyweight ??
          entry.machine ??
          entry.free_weight

        if (!variant) continue

        const eqLabel =
          equipPref === 'machine' && entry.machine ? 'Machine' :
          (equipPref === 'free_weight' || form.equipment === 'dumbbells') && entry.free_weight ? 'Free Weight' :
          entry.bodyweight ? 'Bodyweight' : 'Any'

        candidates.push({
          name: variant.name,
          muscleGroup: '',
          sets: setCount,
          reps,
          equipment: eqLabel,
          restSeconds: parseRoutineSetCount(variant.rest_seconds),
        })

        if (candidates.length >= exercisesPerDay) break
      }
      if (candidates.length >= exercisesPerDay) break
    }

    plans.push({
      dayName: allDays[i],
      focus,
      workoutName: `${focus} - ${allDays[i]}`,
      typeLabel: focus,
      exercises: candidates.slice(0, exercisesPerDay),
    })
  }

  return plans
}

// ── Save-plan helpers ──────────────────────────────────────────────

const DAY_NAME_TO_IDX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

const FOCUS_TO_SPLIT: Record<string, string> = {
  Push: 'ppl', Pull: 'ppl', Legs: 'ppl',
  Upper: 'upper_lower', Lower: 'upper_lower',
  Recovery: 'recovery',
  Rest: 'rest',
  'Full Body': 'full_body',
}

const FOCUS_TO_MUSCLE: Record<string, string> = {
  Push: 'Chest', Pull: 'Back', Legs: 'Quads',
  Upper: 'Chest', Lower: 'Quads',
  Recovery: 'Core',
  Rest: 'Full Body',
  'Full Body': 'Full Body',
}

// ── Stat ring component ────────────────────────────────────────────

function RingProgress({ percent, color, children }: {
  percent: number
  color: string
  children: React.ReactNode
}) {
  const circumference = 2 * Math.PI * 28
  const strokeDash = `${(percent / 100) * circumference} ${circumference}`
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="#1e1e1e" strokeWidth="6" />
        <circle
          cx="32" cy="32" r="28" fill="none" stroke={color}
          strokeWidth="6" strokeLinecap="round"
          strokeDasharray={strokeDash}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [todayMeals, setTodayMeals] = useState<MealLog[]>([])
  const [weekMeals, setWeekMeals] = useState<MealLog[]>([])
  const [weekWorkouts, setWeekWorkouts] = useState<WorkoutLog[]>([])
  const [todayDailyLog, setTodayDailyLog] = useState<DailyLog | null>(null)
  const [weekDailyLogs, setWeekDailyLogs] = useState<DailyLog[]>([])
  const [recentDailyLogs, setRecentDailyLogs] = useState<DailyLog[]>([])
  const [todayRoutines, setTodayRoutines] = useState<WorkoutRoutine[]>([])
  const [recentBadges, setRecentBadges] = useState<Badge[]>([])
  const [latestProgress, setLatestProgress] = useState<ProgressLog | null>(null)
  const [recentProgress, setRecentProgress] = useState<ProgressLog[]>([])
  // Last-week aggregates for delta arrows (A4)
  const [lastWeekDailyLogs, setLastWeekDailyLogs] = useState<DailyLog[]>([])
  const [lastWeekMeals,     setLastWeekMeals]     = useState<MealLog[]>([])
  const [lastWeekWorkouts,  setLastWeekWorkouts]  = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)

  // Planner state
  const [showPlanner, setShowPlanner] = useState(false)
  const [plannerForm, setPlannerForm] = useState<PlannerForm>({
    goal: 'lean_muscle', days: 7, time: 60, equipment: 'full_gym', level: 'intermediate',
  })
  const [weekPlan, setWeekPlan] = useState<DayPlan[] | null>(null)
  const [planExpanded, setPlanExpanded] = useState<number | null>(null)

  // Save-plan state
  const [savingPlan, setSavingPlan] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today     = todayIsoLocal()
    const weekStart = getWeekStartIso()
    const weekEnd   = getWeekEndIso(weekStart)

    // Today's day-of-week index (0=Sun..6=Sat) — used to filter scheduled routines
    const todayDow = new Date().getDay()
    const ninetyAgo = daysAgoIsoLocal(90)
    const lastWeek = lastWeekRange()

    const [
      profileRes, todayMealsRes, weekMealsRes, workoutsRes, progressRes,
      todayDailyRes, weekDailyRes, recentDailyRes, routinesRes, badgesRes,
      recentProgressRes, lastWeekDailyRes, lastWeekMealsRes, lastWeekWorkoutsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('meal_logs').select('*').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('workout_logs').select('*, exercise_logs(*)').eq('user_id', user.id)
        .gte('date', weekStart).lte('date', weekEnd).order('date', { ascending: false }),
      supabase.from('progress_logs').select('*').eq('user_id', user.id)
        .order('date', { ascending: false }).limit(1).single(),
      supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('daily_logs').select('*').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('daily_logs').select('date').eq('user_id', user.id).gte('date', ninetyAgo),
      supabase.from('workout_routines').select('*, routine_exercises(id)')
        .eq('user_id', user.id).eq('is_active', true)
        .contains('day_of_week', [todayDow]),
      supabase.from('badges').select('*').eq('user_id', user.id)
        .order('earned_at', { ascending: false }).limit(8),
      // Last 14 days of progress logs for the 7-day weight average
      supabase.from('progress_logs').select('*').eq('user_id', user.id)
        .gte('date', daysAgoIsoLocal(14)).order('date', { ascending: false }),
      // Last week aggregates for delta arrows
      supabase.from('daily_logs').select('*').eq('user_id', user.id)
        .gte('date', lastWeek.start).lte('date', lastWeek.end),
      supabase.from('meal_logs').select('*').eq('user_id', user.id)
        .gte('date', lastWeek.start).lte('date', lastWeek.end),
      supabase.from('workout_logs').select('id, date').eq('user_id', user.id)
        .gte('date', lastWeek.start).lte('date', lastWeek.end),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (todayMealsRes.data) setTodayMeals(todayMealsRes.data)
    if (weekMealsRes.data)  setWeekMeals(weekMealsRes.data as MealLog[])
    if (workoutsRes.data) setWeekWorkouts(workoutsRes.data)
    if (progressRes.data) setLatestProgress(progressRes.data)
    if (todayDailyRes.data) setTodayDailyLog(todayDailyRes.data as DailyLog)
    if (weekDailyRes.data) setWeekDailyLogs(weekDailyRes.data as DailyLog[])
    if (recentDailyRes.data) setRecentDailyLogs(recentDailyRes.data as DailyLog[])
    if (routinesRes.data) setTodayRoutines(routinesRes.data as WorkoutRoutine[])
    if (badgesRes.data) setRecentBadges(badgesRes.data as Badge[])
    if (recentProgressRes.data) setRecentProgress(recentProgressRes.data as ProgressLog[])
    if (lastWeekDailyRes.data)    setLastWeekDailyLogs(lastWeekDailyRes.data as DailyLog[])
    if (lastWeekMealsRes.data)    setLastWeekMeals(lastWeekMealsRes.data as MealLog[])
    if (lastWeekWorkoutsRes.data) setLastWeekWorkouts(lastWeekWorkoutsRes.data as WorkoutLog[])

    // ─── A7: Streak-protection notification ───
    // After 8 PM, if streak ≥ 3 and nothing logged today → insert a one-time
    // reminder. localStorage dedup so refreshing doesn't spam.
    try {
      const streakDays = calculateStreak((recentDailyRes.data ?? []) as DailyLog[])
      const todayDaily = todayDailyRes.data as DailyLog | null
      const hasLoggedToday =
        (todayMealsRes.data && todayMealsRes.data.length > 0) ||
        (todayDaily?.workout_done ?? false) ||
        (todayDaily?.is_rest_day ?? false) ||
        ((todayDaily?.kcal_in ?? 0) > 0) ||
        ((todayDaily?.kcal_burnt ?? 0) > 0)
      if (shouldSendStreakReminder({ streakDays, hasLoggedToday })) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type:    'streak_reminder',
          title:   `🔥 Keep your ${streakDays}-day streak alive`,
          body:    'Log a meal, workout, or rest day before midnight.',
          data:    { streak: streakDays },
        })
        markStreakReminderSent()
      }
    } catch {
      // Non-blocking
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const todayCalories = todayMeals.reduce((s, m) => s + m.calories, 0)
  const todayProtein  = todayMeals.reduce((s, m) => s + m.protein_g, 0)
  const todayCarbs    = todayMeals.reduce((s, m) => s + m.carbs_g, 0)
  const todayFat      = todayMeals.reduce((s, m) => s + m.fat_g, 0)

  const calTarget  = profile?.calorie_target ?? 2500
  const protTarget = profile?.protein_target ?? 150
  const carbTarget = profile?.carb_target ?? 250
  const fatTarget  = profile?.fat_target ?? 80

  const calPct  = Math.min(Math.round((todayCalories / calTarget) * 100), 100)
  const protPct = Math.min(Math.round((todayProtein / protTarget) * 100), 100)
  const carbPct = Math.min(Math.round((todayCarbs / carbTarget) * 100), 100)
  const fatPct  = Math.min(Math.round((todayFat / fatTarget) * 100), 100)

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const handleGeneratePlan = () => {
    const plan = generateWorkoutPlan(plannerForm)
    setWeekPlan(plan)
    setPlanExpanded(null)
    setSaveSuccess(false)
    setSaveError('')
  }

  const savePlanToWorkouts = async () => {
    if (!weekPlan) return
    setSavingPlan(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const routinesToSave = plannerForm.days === 7 ? weekPlan : weekPlan.filter(d => !d.isRest)

      for (const day of routinesToSave) {
        const dayIdx = DAY_NAME_TO_IDX[day.dayName] ?? 1
        const splitType = day.splitType ?? FOCUS_TO_SPLIT[day.typeLabel] ?? FOCUS_TO_SPLIT[day.focus] ?? 'custom'
        const muscleGroup = FOCUS_TO_MUSCLE[day.typeLabel] ?? FOCUS_TO_MUSCLE[day.focus] ?? day.typeLabel

        const goalLabel = plannerForm.goal.replace(/_/g, ' ')

        const { data: routine, error: routineError } = await supabase
          .from('workout_routines')
          .insert({
            user_id: user.id,
            name: day.workoutName,
            description: day.description ?? `Auto-generated ${goalLabel} plan - ${plannerForm.time} min - ${plannerForm.level}`,
            split_type: splitType,
            day_of_week: [dayIdx],
            is_active: true,
          })
          .select()
          .single()

        if (routineError) throw routineError

        if (day.exercises.length > 0) {
          const rows = day.exercises.map((ex, idx) => ({
            routine_id: routine.id,
            exercise_name: ex.name,
            muscle_group: ex.muscleGroup || muscleGroup,
            sets: parseRoutineSetCount(ex.sets),
            reps: ex.reps,
            rest_seconds: ex.restSeconds,
            notes: ex.notes ?? `Equipment: ${ex.equipment}`,
            sort_order: idx + 1,
          }))

          const { error: exError } = await supabase
            .from('routine_exercises')
            .insert(rows)

          if (exError) throw exError
        }
      }

      setSaveSuccess(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save plan')
    } finally {
      setSavingPlan(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Dumbbell className="w-10 h-10 text-blue-400 animate-pulse" />
          <p className="text-[#666] text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">

      {/* ── Header + streak ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-[#555] uppercase tracking-widest mb-1 font-medium">{todayStr}</p>
          <h1 className="text-2xl font-bold">
            Welcome back, <span className="text-blue-400">{firstName}</span>
          </h1>
        </div>
        {(() => {
          const streak = calculateStreak(recentDailyLogs)
          if (streak === 0) return null
          return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-5 h-5 text-orange-400" />
              <div className="text-right">
                <p className="text-lg font-bold text-orange-400 leading-none">{streak}</p>
                <p className="text-[10px] text-[#777] mt-0.5">day streak</p>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Today's Routine (Phase 1.3) ── */}
      {todayRoutines.length > 0 && (
        <section className="card border-blue-500/20">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-1.5">
                Today&apos;s Plan · {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
              <div className="space-y-2">
                {todayRoutines.map(r => {
                  const exCount = (r as WorkoutRoutine & { routine_exercises?: { id: string }[] }).routine_exercises?.length ?? 0
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <Dumbbell className="w-4 h-4 text-blue-400 shrink-0" />
                      <p className="text-sm font-semibold flex-1 truncate">{r.name}</p>
                      <p className="text-[11px] text-[#666] shrink-0">{exCount} ex</p>
                    </div>
                  )
                })}
              </div>
            </div>
            <Link
              href="/workouts?tab=log"
              className="btn-primary text-xs flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Start Workout
            </Link>
          </div>
        </section>
      )}

      {/* ── Recent Badges (Phase 1.4) ── */}
      {recentBadges.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#666] mb-2">
            Recent Badges
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {recentBadges.map(b => {
              const def = BADGE_DEFINITIONS[b.badge_type as keyof typeof BADGE_DEFINITIONS]
              if (!def) return null
              return (
                <div
                  key={b.id}
                  title={def.description}
                  className="flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#222] rounded-xl shrink-0"
                >
                  <span className="text-base">{def.emoji}</span>
                  <div>
                    <p className="text-xs font-medium text-white whitespace-nowrap">{def.label}</p>
                    <p className="text-[10px] text-[#555]">
                      {new Date(b.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Smart Action Card (C1) — single context-aware CTA ── */}
      {(() => {
        const today = todayIsoLocal()
        const todayDaily = weekDailyLogs.find(d => d.date === today)
        const todayMealTypes = new Set(todayMeals.map(m => m.meal_type))
        const lastProg = recentProgress[0]
        const daysSinceWeighIn = lastProg
          ? Math.floor((Date.now() - new Date(lastProg.date + 'T12:00:00').getTime()) / 86400000)
          : Infinity
        const action: SmartAction | null = pickSmartAction({
          hasBreakfastToday:   todayMealTypes.has('Breakfast'),
          hasLunchToday:       todayMealTypes.has('Lunch'),
          hasDinnerToday:      todayMealTypes.has('Dinner'),
          hasPostWorkoutToday: todayMealTypes.has('Post-Workout'),
          hasWorkoutToday:     (todayDaily?.workout_done ?? false) || weekWorkouts.some(w => w.date === today),
          scheduledTodayCount: todayRoutines.length,
          daysSinceWeighIn,
        })
        if (!action) return null
        return (
          <section className="card border-blue-500/20 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{action.title}</p>
              <p className="text-[11px] text-[#777] mt-0.5">{action.body}</p>
            </div>
            <Link
              href={action.href}
              className="btn-primary text-xs shrink-0 flex items-center gap-1.5"
            >
              {action.ctaText} →
            </Link>
          </section>
        )
      })()}

      {/* ── Quick stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Calories in */}
        <div className="card flex items-center gap-4">
          <RingProgress percent={calPct} color="#3b82f6">
            <span className="text-[10px] font-bold text-white">{calPct}%</span>
          </RingProgress>
          <div>
            <p className="text-xs text-[#555] flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> Calories in</p>
            <p className="text-xl font-bold mt-0.5">{todayCalories}</p>
            <p className="text-[10px] text-[#555]">/ {calTarget} kcal</p>
          </div>
        </div>

        {/* Calories burnt (auto-fed by workout logs via daily_logs) */}
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-[#555] flex items-center gap-1"><Flame className="w-3 h-3 text-emerald-400" /> Burnt today</p>
            <p className="text-xl font-bold mt-0.5">{todayDailyLog?.kcal_burnt ?? 0}</p>
            <p className="text-[10px] text-[#555]">
              {todayDailyLog?.workout_done ? '✓ Workout logged' : 'kcal'}
            </p>
          </div>
        </div>

        {/* Protein */}
        <div className="card flex items-center gap-4">
          <RingProgress percent={protPct} color="#3b82f6">
            <span className="text-[10px] font-bold text-white">{protPct}%</span>
          </RingProgress>
          <div>
            <p className="text-xs text-[#555] flex items-center gap-1"><Target className="w-3 h-3 text-blue-400" /> Protein</p>
            <p className="text-xl font-bold mt-0.5">{todayProtein}g</p>
            <p className="text-[10px] text-[#555]">/ {protTarget}g</p>
          </div>
        </div>

        {/* Workouts */}
        <div className="card">
          <p className="text-xs text-[#555] flex items-center gap-1 mb-2"><Dumbbell className="w-3 h-3 text-blue-400" /> This Week</p>
          <p className="text-3xl font-bold">{weekWorkouts.length}</p>
          <p className="text-xs text-[#555] mt-1">
            {weekWorkouts.length === 0 ? 'No sessions yet' :
             weekWorkouts.length >= 5 ? 'Excellent week!' : 'Keep it going!'}
          </p>
        </div>

        {/* Body weight + 7-day average (A5) */}
        <div className="card">
          <p className="text-xs text-[#555] flex items-center gap-1 mb-2"><TrendingUp className="w-3 h-3 text-blue-400" /> Body Weight</p>
          <p className="text-3xl font-bold">
            {latestProgress?.weight_kg ? `${latestProgress.weight_kg}` : '—'}
          </p>
          {(() => {
            const last7 = recentProgress.filter(p => p.weight_kg != null).slice(0, 7)
            if (last7.length < 2) {
              return (
                <p className="text-[10px] text-[#555] mt-1">
                  {latestProgress?.weight_kg ? 'kg' : 'No data'}
                  {latestProgress?.date && ` · ${new Date(latestProgress.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </p>
              )
            }
            const avg = last7.reduce((s, p) => s + (p.weight_kg ?? 0), 0) / last7.length
            const avgRounded = Math.round(avg * 10) / 10
            return (
              <p className="text-[10px] text-[#555] mt-1">
                kg · 7-day avg <span className="text-blue-400 font-semibold">{avgRounded}</span>
              </p>
            )
          })()}
        </div>
      </div>

      {/* ── This Week Summary (with last-week delta arrows, A4) ── */}
      {(() => {
        const weekStart    = getWeekStartIso()
        const totalKcalIn  = weekMeals.reduce((s, m) => s + (m.calories ?? 0), 0)
        const totalKcalOut = weekDailyLogs.reduce((s, d) => s + (d.kcal_burnt ?? 0), 0)
        const activeDates  = new Set([
          ...weekDailyLogs.filter(d => d.workout_done || d.kcal_in > 0 || d.is_rest_day).map(d => d.date),
          ...weekMeals.map(m => m.date),
          ...weekWorkouts.map(w => w.date),
        ])
        const today = todayIsoLocal()
        const dayOfWeek = (() => {
          const d = new Date()
          return d.getDay() === 0 ? 7 : d.getDay()
        })()
        const avgDailyKcal = totalKcalIn > 0 ? Math.round(totalKcalIn / Math.max(1, activeDates.size)) : 0

        // Last week aggregates for delta arrows
        const lwKcalIn  = lastWeekMeals.reduce((s, m) => s + (m.calories ?? 0), 0)
        const lwKcalOut = lastWeekDailyLogs.reduce((s, d) => s + (d.kcal_burnt ?? 0), 0)
        const lwActive  = new Set([
          ...lastWeekDailyLogs.filter(d => d.workout_done || d.kcal_in > 0 || d.is_rest_day).map(d => d.date),
          ...lastWeekMeals.map(m => m.date),
          ...lastWeekWorkouts.map(w => w.date),
        ])

        // Delta = current - previous; render arrow + magnitude
        const deltaWorkouts = computeDelta(weekWorkouts.length, lastWeekWorkouts.length)
        const deltaBurnt    = computeDelta(totalKcalOut, lwKcalOut, 50)   // 50 kcal noise floor
        const deltaIn       = computeDelta(totalKcalIn,  lwKcalIn,  100)
        const deltaActive   = computeDelta(activeDates.size, lwActive.size)

        type DeltaCell = { current: number; trend: 'up' | 'down' | 'flat'; diff: number }
        const renderDelta = (d: DeltaCell, positiveIsGood: boolean, suffix = '') => {
          if (d.trend === 'flat') return <span className="text-[#555]">→ same as last week</span>
          const isGood = positiveIsGood ? d.trend === 'up' : d.trend === 'down'
          const color = isGood ? 'text-emerald-400' : 'text-red-400'
          const arrow = d.trend === 'up' ? '↑' : '↓'
          const abs = Math.abs(d.diff)
          return <span className={color}>{arrow} {abs}{suffix} vs last week</span>
        }

        return (
          <section className="card space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                This Week
              </h2>
              <p className="text-[11px] text-[#666]">
                {formatWeekRange(weekStart)} · Day {dayOfWeek} of 7
                {today && <span className="text-[#444]"> · today</span>}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0e0e0e] rounded-xl p-3 text-center">
                <p className="text-[10px] text-[#666] uppercase tracking-wider mb-1">Workouts</p>
                <p className="text-2xl font-bold">{weekWorkouts.length}</p>
                <p className="text-[10px]">{renderDelta(deltaWorkouts, true)}</p>
              </div>
              <div className="bg-[#0e0e0e] rounded-xl p-3 text-center">
                <p className="text-[10px] text-[#666] uppercase tracking-wider mb-1">Burnt</p>
                <p className="text-2xl font-bold text-emerald-400">{totalKcalOut}</p>
                <p className="text-[10px]">{renderDelta(deltaBurnt, true, ' kcal')}</p>
              </div>
              <div className="bg-[#0e0e0e] rounded-xl p-3 text-center">
                <p className="text-[10px] text-[#666] uppercase tracking-wider mb-1">Calories in</p>
                <p className="text-2xl font-bold text-orange-400">{totalKcalIn}</p>
                <p className="text-[10px] text-[#555]">{avgDailyKcal > 0 ? `avg ${avgDailyKcal}/day` : 'kcal'}</p>
                <p className="text-[10px] mt-0.5">{renderDelta(deltaIn, true, ' kcal')}</p>
              </div>
              <div className="bg-[#0e0e0e] rounded-xl p-3 text-center">
                <p className="text-[10px] text-[#666] uppercase tracking-wider mb-1">Active days</p>
                <p className="text-2xl font-bold text-blue-400">{activeDates.size}</p>
                <p className="text-[10px] text-[#555]">/ {dayOfWeek} so far</p>
                <p className="text-[10px] mt-0.5">{renderDelta(deltaActive, true)}</p>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ── Macro progress bars ── */}
      <div className="card">
        <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          Today&apos;s Macros
        </h2>
        <div className="space-y-4">
          {[
            { label: 'Calories', val: todayCalories, target: calTarget, pct: calPct, unit: 'kcal', color: '#3b82f6' },
            { label: 'Protein',  val: todayProtein,  target: protTarget, pct: protPct, unit: 'g', color: '#3b82f6' },
            { label: 'Carbs',    val: todayCarbs,    target: carbTarget, pct: carbPct, unit: 'g', color: '#f59e0b' },
            { label: 'Fat',      val: todayFat,      target: fatTarget,  pct: fatPct,  unit: 'g', color: '#a78bfa' },
          ].map(({ label, val, target, pct, unit, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#777]">{label}</span>
                <span className="text-[#aaa]">{val}{unit} <span className="text-[#444]">/ {target}{unit}</span></span>
              </div>
              <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent workouts + Quick actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent workouts */}
        <div>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Recent Workouts
          </h2>
          {weekWorkouts.length === 0 ? (
            <div className="card text-center py-8">
              <Dumbbell className="w-8 h-8 text-[#333] mx-auto mb-3" />
              <p className="text-[#555] text-sm mb-3">No workouts this week</p>
              <Link href="/workouts" className="btn-primary text-sm inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Log Workout
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {weekWorkouts.slice(0, 4).map((w) => (
                <div key={w.id} className="card py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm">{w.workout_name}</p>
                    <p className="text-xs text-[#555] mt-0.5">
                      {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {w.duration_minutes && ` · ${w.duration_minutes} min`}
                    </p>
                  </div>
                  <span className="text-xs text-[#555] shrink-0">
                    {w.exercise_logs?.length ?? 0} exercises
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            {[
              { href: '/workouts', icon: <Dumbbell className="w-5 h-5 text-blue-400" />, bg: 'bg-blue-500/10', title: 'Log Workout', sub: 'Record your training session' },
              { href: '/diet',     icon: <UtensilsCrossed className="w-5 h-5 text-amber-400" />, bg: 'bg-amber-500/10', title: 'Log Meal', sub: 'Track your nutrition' },
              { href: '/progress', icon: <TrendingUp className="w-5 h-5 text-purple-400" />,     bg: 'bg-purple-500/10', title: 'Track Progress', sub: 'Log weight & measurements' },
              { href: '/presets',  icon: <BookOpen className="w-5 h-5 text-blue-400" />,          bg: 'bg-blue-500/10', title: 'Browse Presets', sub: 'Evidence-based exercise library' },
            ].map(({ href, icon, bg, title, sub }) => (
              <Link key={href} href={href} className="card-hover flex items-center gap-4 py-3.5">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-[#555]">{sub}</p>
                </div>
                <Plus className="w-4 h-4 text-[#444] shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Workout Planner ── */}
      <div className="card border-blue-500/20">
        <button
          onClick={() => setShowPlanner(!showPlanner)}
          className="w-full flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-sm">AI Workout Planner</h2>
              <p className="text-xs text-[#555]">Generate a personalized weekly plan from the evidence-based library</p>
            </div>
          </div>
          {showPlanner
            ? <ChevronUp className="w-4 h-4 text-[#444] shrink-0" />
            : <ChevronDown className="w-4 h-4 text-[#444] shrink-0" />}
        </button>

        {showPlanner && (
          <div className="mt-6 space-y-6">
            {/* Questionnaire */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Goal */}
              <div>
                <label className="block text-xs text-[#666] mb-1.5 font-medium uppercase tracking-wide">Goal</label>
                <select
                  value={plannerForm.goal}
                  onChange={e => setPlannerForm(p => ({ ...p, goal: e.target.value as PlanGoal }))}
                  className="select text-sm"
                >
                  <option value="lean_muscle">Lean Muscle</option>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="strength">Strength</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              {/* Days/week */}
              <div>
                <label className="block text-xs text-[#666] mb-1.5 font-medium uppercase tracking-wide">Days / Week</label>
                <div className="flex gap-2">
                  {([3, 4, 5, 6, 7] as PlanDays[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setPlannerForm(p => ({ ...p, days: d }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        plannerForm.days === d
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#1a1a1a] text-[#555] hover:text-white border border-[#252525]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Session time */}
              <div>
                <label className="block text-xs text-[#666] mb-1.5 font-medium uppercase tracking-wide">Session Length</label>
                <div className="flex gap-2">
                  {([30, 45, 60, 90] as PlanTime[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setPlannerForm(p => ({ ...p, time: t }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        plannerForm.time === t
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#1a1a1a] text-[#555] hover:text-white border border-[#252525]'
                      }`}
                    >
                      {t}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-xs text-[#666] mb-1.5 font-medium uppercase tracking-wide">Equipment</label>
                <select
                  value={plannerForm.equipment}
                  onChange={e => setPlannerForm(p => ({ ...p, equipment: e.target.value as PlanEquipment }))}
                  className="select text-sm"
                >
                  <option value="full_gym">Full Gym</option>
                  <option value="dumbbells">Dumbbells Only</option>
                  <option value="bodyweight">Bodyweight Only</option>
                </select>
              </div>

              {/* Experience */}
              <div>
                <label className="block text-xs text-[#666] mb-1.5 font-medium uppercase tracking-wide">Experience</label>
                <select
                  value={plannerForm.level}
                  onChange={e => setPlannerForm(p => ({ ...p, level: e.target.value as PlanLevel }))}
                  className="select text-sm"
                >
                  <option value="beginner">Beginner (0–1 yr)</option>
                  <option value="intermediate">Intermediate (1–3 yr)</option>
                  <option value="advanced">Advanced (3+ yr)</option>
                </select>
              </div>

              {/* Generate button */}
              <div className="flex items-end">
                <button
                  onClick={handleGeneratePlan}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Plan
                </button>
              </div>
            </div>

            {/* Generated plan */}
            {weekPlan && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold">Your Weekly Plan</h3>
                  <span className="badge badge-blue ml-1">
                    {plannerForm.days === 7 ? '7 day split' : `${plannerForm.days} training days`}
                  </span>
                </div>
                <div className="space-y-2">
                  {weekPlan.map((day, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl border transition-all ${
                        day.isRest
                          ? 'bg-[#0d0d0d] border-[#1a1a1a]'
                          : 'bg-[#111] border-[#1e1e1e] hover:border-[#2a2a2a]'
                      }`}
                    >
                      <button
                        onClick={() => !day.isRest && setPlanExpanded(planExpanded === i ? null : i)}
                        className="w-full flex items-center gap-4 px-4 py-3 text-left"
                        disabled={day.isRest}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                          day.isRest ? 'bg-[#1a1a1a] text-[#444]' : 'bg-blue-500/15 text-blue-400'
                        }`}>
                          {day.dayName.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{day.dayName}</p>
                            <span className={`text-xs ${day.isRest ? 'text-[#444]' : 'text-[#666]'}`}>
                              {day.isRest ? '- Rest' : `- ${day.focus}`}
                            </span>
                          </div>
                          {!day.isRest && (
                            <p className="text-xs text-[#555]">
                              {day.exercises.length} exercises - {day.isRecovery ? 'optional recovery' : `${plannerForm.time} min`}
                            </p>
                          )}
                        </div>
                        {!day.isRest && (
                          planExpanded === i
                            ? <ChevronUp className="w-4 h-4 text-[#444] shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-[#444] shrink-0" />
                        )}
                      </button>

                      {planExpanded === i && !day.isRest && (
                        <div className="px-4 pb-4 pt-1 space-y-2">
                          {day.exercises.map((ex, j) => (
                            <div key={j} className="flex items-center gap-3 bg-[#0e0e0e] rounded-xl px-3 py-2.5">
                              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] flex items-center justify-center font-bold shrink-0">
                                {j + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{ex.name}</p>
                                <p className="text-xs text-[#555]">{ex.muscleGroup || ex.equipment}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-semibold text-white">{ex.sets} x {formatRoutineReps(ex.reps)}</p>
                                {(ex.restLabel || ex.restSeconds > 0) && (
                                  <div className="flex items-center gap-1 justify-end">
                                    <Clock className="w-2.5 h-2.5 text-[#444]" />
                                    <p className="text-[10px] text-[#444]">{ex.restLabel || `${ex.restSeconds}s rest`}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          <Link
                            href="/workouts"
                            className="block text-center text-xs text-blue-400 hover:text-blue-300 mt-3 py-2 bg-blue-500/5 rounded-xl border border-blue-500/10 transition-colors"
                          >
                            Log this workout →
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── Save full plan CTA ── */}
                <div className="mt-5 rounded-2xl border border-[#1e1e1e] bg-[#0e0e0e] px-5 py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Save Full Week Plan to My Workouts</p>
                      <p className="text-xs text-[#555] mt-0.5">
                        Creates {plannerForm.days === 7 ? weekPlan.length : weekPlan.filter(d => !d.isRest).length} routines in your workout library so you can log sessions directly.
                      </p>
                    </div>
                    <button
                      onClick={savePlanToWorkouts}
                      disabled={savingPlan || saveSuccess}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                        saveSuccess
                          ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                          : 'btn-primary'
                      } disabled:opacity-60`}
                    >
                      {savingPlan ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      ) : saveSuccess ? (
                        <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                      ) : (
                        <><BookmarkPlus className="w-4 h-4" /> Add to My Workouts</>
                      )}
                    </button>
                  </div>

                  {saveSuccess && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Plan saved! Go to{' '}
                        <Link href="/workouts" className="underline hover:text-green-300">
                          Workouts
                        </Link>{' '}
                        to start logging sessions.
                      </span>
                    </div>
                  )}

                  {saveError && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{saveError}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
