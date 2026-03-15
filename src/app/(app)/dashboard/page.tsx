'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Dumbbell, UtensilsCrossed, TrendingUp, Target, Flame, Plus
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase'
import type { Profile, MealLog, WorkoutLog, ProgressLog } from '@/lib/types'

export default function DashboardPage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [todayMeals, setTodayMeals] = useState<MealLog[]>([])
  const [weekWorkouts, setWeekWorkouts] = useState<WorkoutLog[]>([])
  const [latestProgress, setLatestProgress] = useState<ProgressLog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const weekStart = startOfWeek.toISOString().split('T')[0]

      const [profileRes, mealsRes, workoutsRes, progressRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('meal_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today),
        supabase
          .from('workout_logs')
          .select('*, exercise_logs(*)')
          .eq('user_id', user.id)
          .gte('date', weekStart)
          .order('date', { ascending: false }),
        supabase
          .from('progress_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .single(),
      ])

      if (profileRes.data) setProfile(profileRes.data)
      if (mealsRes.data) setTodayMeals(mealsRes.data)
      if (workoutsRes.data) setWeekWorkouts(workoutsRes.data)
      if (progressRes.data) setLatestProgress(progressRes.data)

      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  const todayCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0)
  const todayProtein = todayMeals.reduce((sum, m) => sum + m.protein_g, 0)
  const todayCarbs = todayMeals.reduce((sum, m) => sum + m.carbs_g, 0)
  const todayFat = todayMeals.reduce((sum, m) => sum + m.fat_g, 0)

  const calorieTarget = profile?.calorie_target ?? 2500
  const proteinTarget = profile?.protein_target ?? 150
  const carbTarget = profile?.carb_target ?? 250
  const fatTarget = profile?.fat_target ?? 80

  const caloriePercent = Math.min(Math.round((todayCalories / calorieTarget) * 100), 100)
  const proteinPercent = Math.min(Math.round((todayProtein / proteinTarget) * 100), 100)
  const carbPercent = Math.min(Math.round((todayCarbs / carbTarget) * 100), 100)
  const fatPercent = Math.min(Math.round((todayFat / fatTarget) * 100), 100)

  const recentWorkouts = weekWorkouts.slice(0, 3)

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <main className="md:ml-64 pt-16 md:pt-0 p-6 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <Dumbbell className="w-10 h-10 text-green-500 animate-pulse" />
            <p className="text-gray-400">Loading your dashboard...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <main className="md:ml-64 pt-16 md:pt-0 p-6">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome back, <span className="text-green-400">{firstName}</span>
          </h1>
          <p className="text-gray-400 mt-1">{todayFormatted}</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Today's Calories */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Flame className="w-4 h-4 text-orange-400" />
                Today&apos;s Calories
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="#262626"
                    strokeWidth="6"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${caloriePercent * 1.76} 176`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {caloriePercent}%
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold">{todayCalories}</p>
                <p className="text-xs text-gray-500">/ {calorieTarget} kcal</p>
              </div>
            </div>
          </div>

          {/* Today's Protein */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Target className="w-4 h-4 text-green-400" />
                Today&apos;s Protein
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="#262626"
                    strokeWidth="6"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${proteinPercent * 1.76} 176`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {proteinPercent}%
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold">{todayProtein}g</p>
                <p className="text-xs text-gray-500">/ {proteinTarget}g target</p>
              </div>
            </div>
          </div>

          {/* Workouts This Week */}
          <div className="card">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
              <Dumbbell className="w-4 h-4 text-blue-400" />
              Workouts This Week
            </div>
            <p className="text-3xl font-bold">{weekWorkouts.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {weekWorkouts.length === 0
                ? 'No workouts yet — get moving!'
                : weekWorkouts.length >= 5
                  ? 'Crushing it this week!'
                  : 'Keep the momentum going!'}
            </p>
          </div>

          {/* Current Body Weight */}
          <div className="card">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Body Weight
            </div>
            <p className="text-3xl font-bold">
              {latestProgress?.weight_kg
                ? `${latestProgress.weight_kg} kg`
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {latestProgress?.date
                ? `Last logged ${new Date(latestProgress.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'No progress logged yet'}
            </p>
          </div>
        </div>

        {/* Today's Macros Breakdown */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4">Today&apos;s Macros</h2>
          <div className="space-y-4">
            {/* Protein */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Protein</span>
                <span className="text-gray-300">
                  {todayProtein}g / {proteinTarget}g
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#262626] rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${proteinPercent}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Carbs</span>
                <span className="text-gray-300">
                  {todayCarbs}g / {carbTarget}g
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#262626] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${carbPercent}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Fat</span>
                <span className="text-gray-300">
                  {todayFat}g / {fatTarget}g
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#262626] rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${fatPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Workouts */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Workouts</h2>
            {recentWorkouts.length === 0 ? (
              <div className="card text-center py-8">
                <Dumbbell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No workouts logged this week</p>
                <Link
                  href="/workouts"
                  className="text-green-400 text-sm hover:underline mt-2 inline-block"
                >
                  Log your first workout
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorkouts.map((workout) => (
                  <div key={workout.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{workout.workout_name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(workout.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {workout.duration_minutes && (
                            <span> &middot; {workout.duration_minutes} min</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Dumbbell className="w-4 h-4" />
                        {workout.exercise_logs?.length ?? 0} exercises
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/workouts"
                className="card flex items-center gap-4 hover:border-green-500/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <Dumbbell className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium group-hover:text-green-400 transition-colors">
                    Log Workout
                  </h3>
                  <p className="text-sm text-gray-500">Record your training session</p>
                </div>
                <Plus className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition-colors" />
              </Link>

              <Link
                href="/diet"
                className="card flex items-center gap-4 hover:border-blue-500/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <UtensilsCrossed className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium group-hover:text-blue-400 transition-colors">
                    Log Meal
                  </h3>
                  <p className="text-sm text-gray-500">Track your nutrition intake</p>
                </div>
                <Plus className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
              </Link>

              <Link
                href="/progress"
                className="card flex items-center gap-4 hover:border-purple-500/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium group-hover:text-purple-400 transition-colors">
                    Track Progress
                  </h3>
                  <p className="text-sm text-gray-500">Log weight and measurements</p>
                </div>
                <Plus className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
