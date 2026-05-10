// Lightweight contextual helpers — derive defaults, deltas, and "what now"
// hints so the UI can feel smart without asking the user more questions.

import { getWeekStartIso, shiftWeek, daysAgoIsoLocal, todayIsoLocal } from './week'
import { MEAL_TYPES } from './types'

// ── Time-of-day-aware default meal type (A3) ────────────────────────────────

/**
 * Pick a sensible default meal type based on the user's local time and
 * (optionally) recent workout activity. Falls back to Breakfast.
 */
export function defaultMealTypeForNow(opts?: {
  /** Last workout date as YYYY-MM-DD; if today and within ~90 min, prefers Post-Workout */
  lastWorkoutAt?: Date | null
}): string {
  const now = new Date()
  const hour = now.getHours()

  // Post-workout window: a workout was logged within the last 90 minutes
  if (opts?.lastWorkoutAt) {
    const minsSince = (now.getTime() - opts.lastWorkoutAt.getTime()) / 60000
    if (minsSince >= 0 && minsSince <= 90) return 'Post-Workout'
  }

  if (hour >= 4  && hour < 11)  return 'Breakfast'
  if (hour >= 11 && hour < 14)  return 'Lunch'
  if (hour >= 14 && hour < 18)  return 'Snack'
  if (hour >= 18 && hour < 22)  return 'Dinner'
  // Late night / very early
  return MEAL_TYPES[0]  // Breakfast as safe fallback
}

// ── Last-week range helpers (A4) ─────────────────────────────────────────────

export interface WeekRange { start: string; end: string }

/** Mon-Sun range for the week containing the given date (defaults to today). */
export function thisWeekRange(from: Date | string = new Date()): WeekRange {
  const start = getWeekStartIso(from)
  return { start, end: shiftWeek(start, 0).slice(0, 10) === start ? addDaysIso(start, 6) : start }
}

/** Mon-Sun range for the week BEFORE the given date's week. */
export function lastWeekRange(from: Date | string = new Date()): WeekRange {
  const thisStart = getWeekStartIso(from)
  const start = shiftWeek(thisStart, -1)
  return { start, end: addDaysIso(start, 6) }
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Delta + trend helpers (A4) ───────────────────────────────────────────────

export type Trend = 'up' | 'down' | 'flat'

export interface Delta {
  current:  number
  previous: number
  diff:     number
  pctDiff:  number
  trend:    Trend
}

/** Tolerance is the absolute diff threshold for 'flat'. */
export function computeDelta(current: number, previous: number, tolerance = 0): Delta {
  const diff = current - previous
  const pctDiff = previous === 0 ? (current > 0 ? 100 : 0) : (diff / previous) * 100
  let trend: Trend = 'flat'
  if (Math.abs(diff) > tolerance) trend = diff > 0 ? 'up' : 'down'
  return { current, previous, diff, pctDiff, trend }
}

// ── Smart action card (C1) ───────────────────────────────────────────────────

export type SmartActionKind =
  | 'log_breakfast'
  | 'log_lunch'
  | 'log_dinner'
  | 'refuel_post_workout'
  | 'start_scheduled_workout'
  | 'log_weight'
  | 'caught_up'

export interface SmartAction {
  kind:    SmartActionKind
  title:   string
  body:    string
  /** Where the primary CTA should send the user. */
  href:    string
  ctaText: string
}

export interface SmartActionContext {
  hasBreakfastToday:   boolean
  hasLunchToday:       boolean
  hasDinnerToday:      boolean
  hasPostWorkoutToday: boolean
  hasWorkoutToday:     boolean
  /** Routine names scheduled for today */
  scheduledTodayCount: number
  /** Days since last weigh-in (Infinity if never) */
  daysSinceWeighIn:    number
}

/** Pick the single most relevant action for right now, or null if all done. */
export function pickSmartAction(ctx: SmartActionContext): SmartAction | null {
  const hour = new Date().getHours()

  // Refuel takes priority — the user just trained
  if (ctx.hasWorkoutToday && !ctx.hasPostWorkoutToday && hour >= 6 && hour <= 22) {
    return {
      kind:    'refuel_post_workout',
      title:   'Refuel time',
      body:    'You trained — log your post-workout meal for best recovery.',
      href:    '/diet?meal_type=Post-Workout&suggest_protein=1',
      ctaText: 'Log meal',
    }
  }

  // Scheduled workout day, late afternoon, not done yet
  if (ctx.scheduledTodayCount > 0 && !ctx.hasWorkoutToday && hour >= 16 && hour <= 22) {
    return {
      kind:    'start_scheduled_workout',
      title:   "Today's workout is waiting",
      body:    'Get it done — your scheduled routine is below.',
      href:    '/workouts?tab=log',
      ctaText: 'Start workout',
    }
  }

  // Breakfast window
  if (hour >= 6 && hour < 11 && !ctx.hasBreakfastToday) {
    return {
      kind:    'log_breakfast',
      title:   'Start your day',
      body:    "Log breakfast — you can use a saved template if it's the usual.",
      href:    '/diet',
      ctaText: 'Log breakfast',
    }
  }

  // Lunch window
  if (hour >= 12 && hour < 15 && !ctx.hasLunchToday) {
    return {
      kind:    'log_lunch',
      title:   'Lunch reminder',
      body:    "Don't let it slip — quick log keeps your weekly score honest.",
      href:    '/diet',
      ctaText: 'Log lunch',
    }
  }

  // Dinner window
  if (hour >= 19 && hour < 23 && !ctx.hasDinnerToday) {
    return {
      kind:    'log_dinner',
      title:   'Dinner time',
      body:    'Wrap up the day with a logged dinner.',
      href:    '/diet',
      ctaText: 'Log dinner',
    }
  }

  // Weekly weigh-in nudge (Sunday/Monday after 7+ days)
  if (ctx.daysSinceWeighIn >= 7 && hour >= 7 && hour <= 22) {
    return {
      kind:    'log_weight',
      title:   'Weekly weigh-in',
      body:    `Last logged ${ctx.daysSinceWeighIn} days ago. A fresh weight keeps your scoring accurate.`,
      href:    '/progress',
      ctaText: 'Log weight',
    }
  }

  return null
}

// ── Streak protection (A7) ───────────────────────────────────────────────────

const STREAK_NOTIF_KEY = 'streak_reminder_sent_'

/**
 * Returns true if the streak-protection notification SHOULD be sent now.
 * Uses localStorage to dedupe within a single day.
 */
export function shouldSendStreakReminder(args: {
  streakDays:        number
  hasLoggedToday:    boolean
  hourOfDay?:        number
}): boolean {
  const hour = args.hourOfDay ?? new Date().getHours()
  if (args.streakDays < 3) return false
  if (args.hasLoggedToday) return false
  if (hour < 20 || hour >= 23) return false  // 8 PM – 11 PM window

  if (typeof window === 'undefined') return false
  const key = STREAK_NOTIF_KEY + todayIsoLocal()
  if (window.localStorage.getItem(key)) return false
  return true
}

export function markStreakReminderSent(): void {
  if (typeof window === 'undefined') return
  const key = STREAK_NOTIF_KEY + todayIsoLocal()
  window.localStorage.setItem(key, '1')
}

// Re-export for convenience
export { daysAgoIsoLocal }
