import type { DailyLog, LeaderboardMember, ActivityLevel, GoalType, WeeklyScore, WeeklyArchive, BadgeType } from './types'
import { toIsoLocal } from './week'

// ── TDEE engine ────────────────────────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
}

/**
 * Gender-neutral TDEE using midpoint of Mifflin-St Jeor
 * (avg of male +5 / female -161 → offset -78)
 */
export function estimateTDEE(
  weight_kg: number,
  height_cm: number,
  age:        number,
  activity_level: ActivityLevel
): number {
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 78
  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] ?? 1.55
  return Math.max(1200, Math.round(bmr * multiplier))
}

function goalTargetKcal(tdee: number, goalType: GoalType): number {
  switch (goalType) {
    case 'cut':      return Math.round(tdee * 0.80)   // 20% deficit
    case 'bulk':     return Math.round(tdee * 1.15)   // 15% surplus
    case 'athletic': return tdee
  }
}

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.min(hi, Math.max(lo, v))
}

// ── Weekly scoring ─────────────────────────────────────────────────

/**
 * Compute composite weekly score (0–100) for a single member.
 *
 * Formula:  adherence×0.4 + burnt×0.3 + consistency×0.2 + progress×0.1
 *
 * weightAtStart / weightAtEnd: from leaderboard_members.start_weight_kg /
 * current_weight_kg.  Pass null for both to get a neutral 0.5 progress score.
 */
export function calculateWeeklyScore(
  member:        LeaderboardMember,
  logs:          DailyLog[],
  profile:       { weight_kg: number | null; height_cm: number | null; age: number | null }
): WeeklyScore {
  const weight   = member.current_weight_kg ?? member.start_weight_kg ?? profile.weight_kg ?? 75
  const height   = profile.height_cm ?? 170
  const age      = profile.age ?? 28
  const tdee     = estimateTDEE(weight, height, age, member.activity_level)
  const target   = goalTargetKcal(tdee, member.goal_type)

  // 1. Goal adherence (40%) — how close avg kcal_in is to target.
  // If no food was logged at all this week, give a neutral 0.5 instead of
  // zero — purely workout-driven days shouldn't crater the score.
  const foodLogs   = logs.filter(l => l.kcal_in > 0)
  const avgKcalIn  = foodLogs.length > 0
    ? foodLogs.reduce((s, l) => s + l.kcal_in, 0) / foodLogs.length
    : 0
  const adherence  = foodLogs.length === 0
    ? 0.5
    : clamp(1 - Math.abs(avgKcalIn - target) / target)

  // 2. Kcal burnt (30%) — weekly exercise output vs 2 500 kcal target
  const TARGET_BURNT = 2500
  const totalBurnt   = logs.reduce((s, l) => s + l.kcal_burnt, 0)
  const burnt        = clamp(totalBurnt / TARGET_BURNT)

  // 3. Consistency (20%) — days with any logged activity out of 7
  const activeDays  = logs.filter(l =>
    l.workout_done || l.is_rest_day || l.kcal_in > 0 || l.kcal_burnt > 0
  ).length
  const consistency = clamp(activeDays / 7)

  // 4. Goal progress (10%) — weight moving in the right direction
  // Fall back to profile.weight_kg so new members aren't stuck at neutral 0.5.
  const startW = member.start_weight_kg ?? profile.weight_kg
  const currW  = member.current_weight_kg ?? profile.weight_kg
  let progress = 0.5  // neutral when no weight data
  if (startW !== null && currW !== null && startW !== 0) {
    const delta = currW - startW
    if (member.goal_type === 'cut') {
      // Lost weight = good. Gaining = bad.
      progress = clamp(0.5 - delta * 0.25)
    } else if (member.goal_type === 'bulk') {
      // Gained weight = good. Extreme gain (>2 kg) is diminishing.
      progress = clamp(0.5 + Math.min(delta, 2) * 0.25)
    } else {
      // Athletic: minimal change = best. ±1 kg = perfect; >2 = penalty.
      progress = clamp(1 - Math.abs(delta) * 0.3)
    }
  }

  const total = adherence * 0.4 + burnt * 0.3 + consistency * 0.2 + progress * 0.1

  const round1 = (n: number) => Math.round(n * 1000) / 10  // → one decimal, ×100

  return {
    total:       round1(total),
    adherence:   round1(adherence),
    burnt:       round1(burnt),
    consistency: round1(consistency),
    progress:    round1(progress),
  }
}

// ── Streak ─────────────────────────────────────────────────────────

/** Count consecutive days ending today where the user has a daily_log entry. */
export function calculateStreak(logs: DailyLog[]): number {
  if (logs.length === 0) return 0

  const loggedSet = new Set(logs.map(l => l.date))
  const today     = new Date()
  today.setHours(0, 0, 0, 0)

  let streak  = 0
  const cursor = new Date(today)

  while (true) {
    const dateStr = toIsoLocal(cursor)
    if (!loggedSet.has(dateStr)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

// ── Static metadata ────────────────────────────────────────────────

export const BADGE_DEFINITIONS: Record<BadgeType, { label: string; emoji: string; description: string }> = {
  first_log:   { label: 'First Step',    emoji: '👟', description: 'Logged your first daily entry' },
  streak_7:    { label: 'Week Warrior',  emoji: '🔥', description: '7-day logging streak' },
  streak_30:   { label: 'Iron Will',     emoji: '⚡', description: '30-day logging streak' },
  week_winner: { label: 'Week Champion', emoji: '👑', description: 'Won a weekly leaderboard' },
  top_scorer:  { label: 'Top Scorer',    emoji: '🏆', description: 'Scored 80+ points in a week' },
  consistent:  { label: 'Consistent',    emoji: '💎', description: '5+ active days in a single week' },
  century:     { label: 'Century',       emoji: '💯', description: 'Achieved a perfect 100 score' },
}

export const GOAL_LABELS: Record<GoalType, { label: string; colorClass: string; description: string }> = {
  cut:      { label: 'Cut',      colorClass: 'text-red-400',   description: '20% caloric deficit below TDEE' },
  bulk:     { label: 'Bulk',     colorClass: 'text-green-400', description: '15% caloric surplus above TDEE' },
  athletic: { label: 'Athletic', colorClass: 'text-blue-400',  description: 'Maintenance calories' },
}

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; description: string }> = {
  sedentary:   { label: 'Sedentary',   description: 'Little or no exercise' },
  light:       { label: 'Light',       description: 'Exercise 1–3 days/week' },
  moderate:    { label: 'Moderate',    description: 'Exercise 3–5 days/week' },
  active:      { label: 'Active',      description: 'Exercise 6–7 days/week' },
  very_active: { label: 'Very Active', description: 'Hard exercise twice daily' },
}

// ── Helpers ────────────────────────────────────────────────────────

/** Get the local-date string for the most-recent Monday. */
export function getWeekStart(from: Date = new Date()): string {
  const d = new Date(from)
  const day = d.getDay()               // 0=Sun … 6=Sat (LOCAL)
  const diff = day === 0 ? -6 : 1 - day  // shift to Monday
  d.setDate(d.getDate() + diff)        // LOCAL day arithmetic
  return toIsoLocal(d)                 // LOCAL date format
}

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return toIsoLocal(d)
}

export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Generate a random 6-char alphanumeric invite code (no ambiguous chars). */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/** Score → colour class for display */
export function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

export const REACTION_EMOJIS = ['🔥', '💪', '👑', '🎉', '⚡', '😤', '🙌', '🫡']

// ── Goal progress (LB-6) ───────────────────────────────────────────────────

/**
 * Returns 0–100 percent of distance traveled from start weight to target weight.
 * Returns null if any of start/target/current are missing.
 */
export function goalProgressPct(member: LeaderboardMember): number | null {
  const start  = member.start_weight_kg
  const target = member.target_weight_kg
  const curr   = member.current_weight_kg
  if (start == null || target == null || curr == null) return null
  if (start === target) return 100
  const total = Math.abs(target - start)
  // For "cut" goals (target < start), positive progress when current < start.
  // For "bulk" goals (target > start), positive progress when current > start.
  const goingDown = target < start
  const moved = goingDown ? Math.max(0, start - curr) : Math.max(0, curr - start)
  return Math.min(100, Math.round((moved / total) * 100))
}

// ── Score trend (LB-7) ─────────────────────────────────────────────────────

export type ScoreTrend = 'up' | 'down' | 'flat'

/** Compare current week score to most recent archived week's score for same user. */
export function scoreTrend(
  userId:        string,
  currentScore:  number,
  archives:      WeeklyArchive[]
): ScoreTrend | null {
  if (archives.length === 0) return null
  // Archives sorted desc by week_start in caller — pick first.
  const last = archives[0]
  const prev = last?.scores[userId]?.total
  if (prev == null) return null
  if (currentScore > prev + 2) return 'up'
  if (currentScore < prev - 2) return 'down'
  return 'flat'
}

const MEMBER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#a78bfa',
  '#f97316', '#ec4899', '#06b6d4', '#84cc16',
]
export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}
