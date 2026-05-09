// Week utilities — ISO week (Monday → Sunday) for the entire app.
// Use these helpers everywhere instead of Date.getDay()/setDate math
// so week boundaries stay consistent with Leaderboard scoring.
//
// IMPORTANT: All date strings produced by these helpers are LOCAL dates
// (YYYY-MM-DD in the user's timezone), NOT UTC dates. Using toISOString()
// for date strings causes off-by-one bugs for users east of UTC (the
// classic "logged Tuesday but stored as Wednesday" issue).

/**
 * Format a Date as YYYY-MM-DD using LOCAL timezone.
 * Use this everywhere instead of `d.toISOString().split('T')[0]` for date storage.
 */
export function toIsoLocal(d: Date): string {
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${day}`
}

/** Today as YYYY-MM-DD in the user's local timezone. */
export function todayIsoLocal(): string {
  return toIsoLocal(new Date())
}

/** N days ago (or in the future, if negative) as YYYY-MM-DD local. */
export function daysAgoIsoLocal(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toIsoLocal(d)
}

/** Return the Monday (ISO week start) of the week containing `from` as YYYY-MM-DD (local). */
export function getWeekStartIso(from: Date | string = new Date()): string {
  const d = typeof from === 'string' ? new Date(from + 'T12:00:00') : new Date(from)
  const day = d.getDay()                  // 0=Sun … 6=Sat (LOCAL)
  const diff = day === 0 ? -6 : 1 - day   // shift to Monday
  d.setDate(d.getDate() + diff)            // LOCAL day arithmetic
  return toIsoLocal(d)                     // LOCAL date format (no UTC drift)
}

/** Return the Sunday (ISO week end) of the week containing `from` as YYYY-MM-DD (local). */
export function getWeekEndIso(from: Date | string = new Date()): string {
  const start = new Date(getWeekStartIso(from) + 'T12:00:00')
  start.setDate(start.getDate() + 6)
  return toIsoLocal(start)
}

/** Return the [Monday, Sunday] ISO range (inclusive) for the week containing `from`. */
export function getWeekRange(from: Date | string = new Date()): [string, string] {
  const start = getWeekStartIso(from)
  return [start, getWeekEndIso(start)]
}

/** Step `weekStart` forward/backward N weeks; returns local Monday ISO string. */
export function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return toIsoLocal(d)
}

/** ISO 8601 week number (1–53) for the date. Week 1 contains the first Thursday of the year. */
export function getIsoWeekNumber(from: Date | string = new Date()): number {
  const d = typeof from === 'string' ? new Date(from + 'T12:00:00') : new Date(from)
  // Thursday of this ISO week determines the week number
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (target.getUTCDay() + 6) % 7  // 0=Mon … 6=Sun
  target.setUTCDate(target.getUTCDate() - dayNum + 3)  // shift to Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNum   = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const diff = target.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / 604800000)  // 7 * 24 * 3600 * 1000
}

/** ISO week year (4-digit year of the ISO week — may differ at year boundaries). */
export function getIsoWeekYear(from: Date | string = new Date()): number {
  const d = typeof from === 'string' ? new Date(from + 'T12:00:00') : new Date(from)
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  return target.getUTCFullYear()
}

/** Format like "2026-W19" (ISO 8601). */
export function formatYearWeek(from: Date | string = new Date()): string {
  const yr = getIsoWeekYear(from)
  const wk = getIsoWeekNumber(from)
  return `${yr}-W${String(wk).padStart(2, '0')}`
}

/** Format the week range as "Apr 14 – Apr 20" (or with year if not current year). */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00')
  const end   = new Date(start)
  end.setDate(start.getDate() + 6)
  const sameYear = start.getFullYear() === end.getFullYear()
  const yr       = start.getFullYear() !== new Date().getFullYear() ? `, ${start.getFullYear()}` : ''
  const startLbl = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLbl   = end.toLocaleDateString('en-US',   sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLbl} – ${endLbl}${yr}`
}

