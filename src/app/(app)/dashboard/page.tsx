'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Dumbbell, UtensilsCrossed, TrendingUp, Target, Flame, Plus,
  ChevronDown, ChevronUp, Sparkles, Calendar, Clock, Zap,
  Activity, BarChart2, BookOpen
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Profile, MealLog, WorkoutLog, ProgressLog } from '@/lib/types'
import { MUSCLE_GROUPS as PRESET_GROUPS } from '@/lib/exercise-presets'

// ── AI Workout Planner ─────────────────────────────────────────────

type PlanGoal = 'lean_muscle' | 'fat_loss' | 'strength' | 'maintenance'
type PlanDays = 3 | 4 | 5 | 6
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

interface DayPlan {
  dayName: string
  focus: string
  exercises: { name: string; sets: string; reps: string; equipment: string }[]
  isRest?: boolean
}

const SPLIT_CONFIGS: Record<string, (days: number) => string[]> = {
  3: () => ['Push', 'Pull', 'Legs'],
  4: () => ['Upper', 'Lower', 'Push', 'Pull'],
  5: () => ['Chest/Tri', 'Back/Bi', 'Legs', 'Shoulders', 'Arms/Core'],
  6: () => ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function generateWorkoutPlan(form: PlannerForm): DayPlan[] {
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
    'Chest/Tri':    ['chest', 'triceps'],
    'Back/Bi':      ['back', 'biceps'],
    Shoulders:      ['shoulders'],
    'Arms/Core':    ['biceps', 'triceps', 'core_abs'],
    'Full Body':    ['chest', 'back', 'quadriceps', 'shoulders', 'biceps'],
  }

  const plans: DayPlan[] = []

  for (let i = 0; i < 7; i++) {
    const splitIdx = i < form.days ? i : -1
    const isRest = splitIdx === -1

    if (isRest) {
      plans.push({ dayName: allDays[i], focus: 'Rest & Recovery', exercises: [], isRest: true })
      continue
    }

    const focus = splitLabels[splitIdx]
    const muscleIds = focusToMuscles[focus] ?? ['chest']

    // Collect exercises from preset groups matching the muscle IDs
    const candidates: { name: string; sets: string; reps: string; equipment: string }[] = []

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
          sets: setCount,
          reps,
          equipment: eqLabel,
        })

        if (candidates.length >= exercisesPerDay) break
      }
      if (candidates.length >= exercisesPerDay) break
    }

    plans.push({
      dayName: allDays[i],
      focus,
      exercises: candidates.slice(0, exercisesPerDay),
    })
  }

  return plans
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
  const [weekWorkouts, setWeekWorkouts] = useState<WorkoutLog[]>([])
  const [latestProgress, setLatestProgress] = useState<ProgressLog | null>(null)
  const [loading, setLoading] = useState(true)

  // Planner state
  const [showPlanner, setShowPlanner] = useState(false)
  const [plannerForm, setPlannerForm] = useState<PlannerForm>({
    goal: 'lean_muscle', days: 4, time: 60, equipment: 'full_gym', level: 'intermediate',
  })
  const [weekPlan, setWeekPlan] = useState<DayPlan[] | null>(null)
  const [planExpanded, setPlanExpanded] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const weekStart = startOfWeek.toISOString().split('T')[0]

    const [profileRes, mealsRes, workoutsRes, progressRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('workout_logs').select('*, exercise_logs(*)').eq('user_id', user.id)
        .gte('date', weekStart).order('date', { ascending: false }),
      supabase.from('progress_logs').select('*').eq('user_id', user.id)
        .order('date', { ascending: false }).limit(1).single(),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (mealsRes.data) setTodayMeals(mealsRes.data)
    if (workoutsRes.data) setWeekWorkouts(workoutsRes.data)
    if (progressRes.data) setLatestProgress(progressRes.data)
    setLoading(false)
  }, [])

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

      {/* ── Header ── */}
      <div>
        <p className="text-xs text-[#555] uppercase tracking-widest mb-1 font-medium">{todayStr}</p>
        <h1 className="text-2xl font-bold">
          Welcome back, <span className="text-blue-400">{firstName}</span>
        </h1>
      </div>

      {/* ── Quick stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calories */}
        <div className="card flex items-center gap-4">
          <RingProgress percent={calPct} color="#3b82f6">
            <span className="text-[10px] font-bold text-white">{calPct}%</span>
          </RingProgress>
          <div>
            <p className="text-xs text-[#555] flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> Calories</p>
            <p className="text-xl font-bold mt-0.5">{todayCalories}</p>
            <p className="text-[10px] text-[#555]">/ {calTarget} kcal</p>
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

        {/* Body weight */}
        <div className="card">
          <p className="text-xs text-[#555] flex items-center gap-1 mb-2"><TrendingUp className="w-3 h-3 text-blue-400" /> Body Weight</p>
          <p className="text-3xl font-bold">
            {latestProgress?.weight_kg ? `${latestProgress.weight_kg}` : '—'}
          </p>
          <p className="text-[10px] text-[#555] mt-1">
            {latestProgress?.weight_kg ? 'kg' : 'No data'}
            {latestProgress?.date && ` · ${new Date(latestProgress.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </p>
        </div>
      </div>

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
                    {(w as any).exercise_logs?.length ?? 0} exercises
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
                  {([3, 4, 5, 6] as PlanDays[]).map(d => (
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
                  <span className="badge badge-blue ml-1">{plannerForm.days} training days</span>
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
                              {day.isRest ? '— Rest' : `· ${day.focus}`}
                            </span>
                          </div>
                          {!day.isRest && (
                            <p className="text-xs text-[#555]">
                              {day.exercises.length} exercises · {plannerForm.time} min
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
                                <p className="text-xs text-[#555]">{ex.equipment}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-semibold text-white">{ex.sets} × {ex.reps}</p>
                                <div className="flex items-center gap-1 justify-end">
                                  <Clock className="w-2.5 h-2.5 text-[#444]" />
                                  <p className="text-[10px] text-[#444]">90s rest</p>
                                </div>
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
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
