// Numeric clamps + range guards for user-entered fields.
// Apply at every input boundary so garbage data never reaches the DB.

export interface NumberRange {
  min:     number
  max:     number
  default: number
}

/** Common ranges used across the app. */
export const RANGES = {
  bodyWeightKg:     { min: 30,   max: 300,  default: 70   } as NumberRange,
  bodyFatPct:       { min: 3,    max: 60,   default: 15   } as NumberRange,
  measurementCm:    { min: 10,   max: 250,  default: 0    } as NumberRange,
  age:              { min: 13,   max: 100,  default: 25   } as NumberRange,
  heightCm:         { min: 100,  max: 250,  default: 170  } as NumberRange,
  kcalIn:           { min: 0,    max: 9999, default: 0    } as NumberRange,
  kcalBurnt:        { min: 0,    max: 5000, default: 0    } as NumberRange,
  mealKcal:         { min: 0,    max: 5000, default: 0    } as NumberRange,
  macroGrams:       { min: 0,    max: 500,  default: 0    } as NumberRange,
  per100gKcal:      { min: 0,    max: 1500, default: 0    } as NumberRange,
  per100gMacros:    { min: 0,    max: 200,  default: 0    } as NumberRange,
  servingGrams:     { min: 1,    max: 2000, default: 100  } as NumberRange,
  setReps:          { min: 0,    max: 200,  default: 0    } as NumberRange,
  setWeightKg:      { min: 0,    max: 500,  default: 0    } as NumberRange,
  durationMinutes:  { min: 0,    max: 600,  default: 60   } as NumberRange,
  waterMl:          { min: 0,    max: 10000, default: 0   } as NumberRange,
  scoreTarget:      { min: 0,    max: 100,  default: 75   } as NumberRange,
} as const

/** Clamp a number into [min, max]. NaN/null/undefined → default. */
export function clampNumber(
  raw:    unknown,
  range:  NumberRange,
  decimals = 1,
): number {
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw)
  if (!isFinite(n)) return range.default
  const bounded = Math.max(range.min, Math.min(range.max, n))
  const factor  = Math.pow(10, decimals)
  return Math.round(bounded * factor) / factor
}

/** Validate; return { ok, value, error }. Useful for surfacing UI errors. */
export interface Validated {
  ok:    boolean
  value: number
  error?: string
}

export function validateNumber(
  raw:   unknown,
  range: NumberRange,
  label = 'Value',
): Validated {
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw)
  if (!isFinite(n))           return { ok: false, value: range.default, error: `${label} is required` }
  if (n < range.min)          return { ok: false, value: n,             error: `${label} must be at least ${range.min}` }
  if (n > range.max)          return { ok: false, value: n,             error: `${label} must be at most ${range.max}` }
  return { ok: true, value: n }
}

/** Convenience: parse a numeric input to nullable (empty → null). */
export function parseOptionalNumber(raw: unknown, range: NumberRange): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const v = clampNumber(raw, range)
  return v
}

/** Trim + length-cap a string field. Returns null if empty. */
export function trimToNullable(raw: unknown, maxLen = 200): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().slice(0, maxLen)
  return t.length === 0 ? null : t
}
