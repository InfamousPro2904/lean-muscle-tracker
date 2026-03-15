'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { MealLog, Profile, MEAL_TYPES } from '@/lib/types'
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Edit3,
  Save,
  Flame,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function displayDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function pct(value: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(Math.round((value / target) * 100), 999)
}

function barColor(percent: number): string {
  if (percent <= 80) return 'bg-green-500'
  if (percent <= 100) return 'bg-yellow-500'
  return 'bg-red-500'
}

function textColor(percent: number): string {
  if (percent <= 80) return 'text-green-400'
  if (percent <= 100) return 'text-yellow-400'
  return 'text-red-400'
}

// ── Types ────────────────────────────────────────────────────────────────────

interface MealForm {
  meal_type: string
  food_name: string
  calories: string
  protein_g: string
  carbs_g: string
  fat_g: string
  quantity: string
  notes: string
}

const emptyForm: MealForm = {
  meal_type: 'Breakfast',
  food_name: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  quantity: '',
  notes: '',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DietPage() {
  const supabase = createClient()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [meals, setMeals] = useState<MealLog[]>([])
  const [weeklyData, setWeeklyData] = useState<{ day: string; calories: number }[]>([])
  const [form, setForm] = useState<MealForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<MealForm>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // ── Auth & Profile ──────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data as Profile)
    }
    init()
  }, [supabase])

  // ── Fetch meals for selected date ───────────────────────────────────────

  const fetchMeals = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const dateStr = formatDate(selectedDate)
    const { data, error: err } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .order('created_at', { ascending: true })
    if (err) {
      setError(err.message)
    } else {
      setMeals((data ?? []) as MealLog[])
    }
    setLoading(false)
  }, [userId, selectedDate, supabase])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  // ── Fetch weekly data for chart ─────────────────────────────────────────

  const fetchWeekly = useCallback(async () => {
    if (!userId) return
    const end = new Date(selectedDate)
    const start = new Date(selectedDate)
    start.setDate(start.getDate() - 6)

    const { data } = await supabase
      .from('meal_logs')
      .select('date, calories')
      .eq('user_id', userId)
      .gte('date', formatDate(start))
      .lte('date', formatDate(end))

    if (!data) return

    const map: Record<string, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      map[formatDate(d)] = 0
    }
    for (const row of data) {
      const key = row.date as string
      map[key] = (map[key] || 0) + (row.calories as number)
    }

    setWeeklyData(
      Object.entries(map).map(([date, calories]) => ({
        day: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        calories,
      }))
    )
  }, [userId, selectedDate, supabase])

  useEffect(() => {
    fetchWeekly()
  }, [fetchWeekly])

  // ── Daily totals ────────────────────────────────────────────────────────

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein_g,
      carbs: acc.carbs + m.carbs_g,
      fat: acc.fat + m.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const calPct = pct(totals.calories, profile?.calorie_target ?? 0)
  const protPct = pct(totals.protein, profile?.protein_target ?? 0)
  const carbPct = pct(totals.carbs, profile?.carb_target ?? 0)
  const fatPct = pct(totals.fat, profile?.fat_target ?? 0)

  // ── Date navigation ─────────────────────────────────────────────────────

  function shiftDate(days: number) {
    setSelectedDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + days)
      return d
    })
  }

  // ── Add meal ────────────────────────────────────────────────────────────

  async function handleAddMeal(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')
    setSaving(true)

    const { error: err } = await supabase.from('meal_logs').insert({
      user_id: userId,
      date: formatDate(selectedDate),
      meal_type: form.meal_type,
      food_name: form.food_name.trim(),
      calories: Number(form.calories) || 0,
      protein_g: Number(form.protein_g) || 0,
      carbs_g: Number(form.carbs_g) || 0,
      fat_g: Number(form.fat_g) || 0,
      quantity: form.quantity.trim() || null,
      notes: form.notes.trim() || null,
    })

    if (err) {
      setError(err.message)
    } else {
      setForm(emptyForm)
      await fetchMeals()
      await fetchWeekly()
    }
    setSaving(false)
  }

  // ── Delete meal ─────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const { error: err } = await supabase.from('meal_logs').delete().eq('id', id)
    if (err) {
      setError(err.message)
    } else {
      await fetchMeals()
      await fetchWeekly()
    }
  }

  // ── Edit meal ───────────────────────────────────────────────────────────

  function startEdit(meal: MealLog) {
    setEditingId(meal.id)
    setEditForm({
      food_name: meal.food_name,
      calories: String(meal.calories),
      protein_g: String(meal.protein_g),
      carbs_g: String(meal.carbs_g),
      fat_g: String(meal.fat_g),
      quantity: meal.quantity ?? '',
      notes: meal.notes ?? '',
    })
  }

  async function handleSaveEdit(id: string) {
    const { error: err } = await supabase
      .from('meal_logs')
      .update({
        food_name: editForm.food_name?.trim(),
        calories: Number(editForm.calories) || 0,
        protein_g: Number(editForm.protein_g) || 0,
        carbs_g: Number(editForm.carbs_g) || 0,
        fat_g: Number(editForm.fat_g) || 0,
        quantity: editForm.quantity?.trim() || null,
        notes: editForm.notes?.trim() || null,
      })
      .eq('id', id)

    if (err) {
      setError(err.message)
    } else {
      setEditingId(null)
      setEditForm({})
      await fetchMeals()
      await fetchWeekly()
    }
  }

  // ── Group meals by type ─────────────────────────────────────────────────

  const grouped = MEAL_TYPES.reduce(
    (acc, type) => {
      const items = meals.filter((m) => m.meal_type === type)
      if (items.length > 0) acc[type] = items
      return acc
    },
    {} as Record<string, MealLog[]>
  )

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="bg-green-500/10 p-2.5 rounded-xl">
          <UtensilsCrossed className="w-6 h-6 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Diet Tracker</h1>
          <p className="text-gray-500 text-sm">Track meals & hit your macros</p>
        </div>
      </div>

      {/* ── Daily Summary ─────────────────────────────────────────────── */}
      <section className="card space-y-6">
        {/* Date Picker */}
        <div className="flex items-center justify-between">
          <button onClick={() => shiftDate(-1)} className="btn-secondary p-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <input
              type="date"
              value={formatDate(selectedDate)}
              onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
              className="input text-center max-w-[200px] mx-auto"
            />
            <p className="text-gray-500 text-xs mt-1">{displayDate(selectedDate)}</p>
          </div>
          <button onClick={() => shiftDate(1)} className="btn-secondary p-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Macro Big Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Calories */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Calories</span>
            </div>
            <p className={`text-3xl font-bold ${textColor(calPct)}`}>{totals.calories}</p>
            <p className="text-xs text-gray-500">/ {profile?.calorie_target ?? '—'}</p>
            <div className="progress-bar">
              <div
                className={`progress-fill ${barColor(calPct)}`}
                style={{ width: `${Math.min(calPct, 100)}%` }}
              />
            </div>
            <p className={`text-xs font-medium ${textColor(calPct)}`}>{calPct}%</p>
          </div>

          {/* Protein */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 text-center space-y-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Protein</span>
            <p className={`text-3xl font-bold ${textColor(protPct)}`}>{totals.protein}g</p>
            <p className="text-xs text-gray-500">/ {profile?.protein_target ?? '—'}g</p>
            <div className="progress-bar">
              <div
                className={`progress-fill ${barColor(protPct)}`}
                style={{ width: `${Math.min(protPct, 100)}%` }}
              />
            </div>
            <p className={`text-xs font-medium ${textColor(protPct)}`}>{protPct}%</p>
          </div>

          {/* Carbs */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 text-center space-y-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Carbs</span>
            <p className={`text-3xl font-bold ${textColor(carbPct)}`}>{totals.carbs}g</p>
            <p className="text-xs text-gray-500">/ {profile?.carb_target ?? '—'}g</p>
            <div className="progress-bar">
              <div
                className={`progress-fill ${barColor(carbPct)}`}
                style={{ width: `${Math.min(carbPct, 100)}%` }}
              />
            </div>
            <p className={`text-xs font-medium ${textColor(carbPct)}`}>{carbPct}%</p>
          </div>

          {/* Fat */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 text-center space-y-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Fat</span>
            <p className={`text-3xl font-bold ${textColor(fatPct)}`}>{totals.fat}g</p>
            <p className="text-xs text-gray-500">/ {profile?.fat_target ?? '—'}g</p>
            <div className="progress-bar">
              <div
                className={`progress-fill ${barColor(fatPct)}`}
                style={{ width: `${Math.min(fatPct, 100)}%` }}
              />
            </div>
            <p className={`text-xs font-medium ${textColor(fatPct)}`}>{fatPct}%</p>
          </div>
        </div>
      </section>

      {/* ── Add Meal Form ─────────────────────────────────────────────── */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-green-500" />
          Add Meal
        </h2>
        <form onSubmit={handleAddMeal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Meal Type */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Meal Type</label>
              <select
                value={form.meal_type}
                onChange={(e) => setForm({ ...form, meal_type: e.target.value })}
                className="select"
              >
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Food Name */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Food Name</label>
              <input
                type="text"
                placeholder="e.g. Chicken Breast"
                value={form.food_name}
                onChange={(e) => setForm({ ...form, food_name: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Calories</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.calories}
                onChange={(e) => setForm({ ...form, calories: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Protein (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={form.protein_g}
                onChange={(e) => setForm({ ...form, protein_g: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Carbs (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={form.carbs_g}
                onChange={(e) => setForm({ ...form, carbs_g: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Fat (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={form.fat_g}
                onChange={(e) => setForm({ ...form, fat_g: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Quantity</label>
              <input
                type="text"
                placeholder='e.g. "2 scoops", "1 cup"'
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
              <input
                type="text"
                placeholder="Any notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add Meal
          </button>
        </form>
      </section>

      {/* ── Today's Meals ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-green-500" />
          {formatDate(selectedDate) === formatDate(new Date()) ? "Today's" : displayDate(selectedDate)} Meals
        </h2>

        {loading ? (
          <div className="card text-center py-12 text-gray-500">Loading meals...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            No meals logged for this day. Add your first meal above.
          </div>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="card space-y-3">
              <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide">
                {type}
              </h3>
              <div className="space-y-2">
                {items.map((meal) => (
                  <div
                    key={meal.id}
                    className="bg-[#1a1a1a] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    {editingId === meal.id ? (
                      /* ── Inline Edit Mode ─── */
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={editForm.food_name ?? ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, food_name: e.target.value })
                            }
                            className="input text-sm"
                            placeholder="Food name"
                          />
                          <input
                            type="text"
                            value={editForm.quantity ?? ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, quantity: e.target.value })
                            }
                            className="input text-sm"
                            placeholder="Quantity"
                          />
                          <input
                            type="text"
                            value={editForm.notes ?? ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, notes: e.target.value })
                            }
                            className="input text-sm"
                            placeholder="Notes"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <input
                            type="number"
                            value={editForm.calories ?? ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, calories: e.target.value })
                            }
                            className="input text-sm"
                            placeholder="Cal"
                          />
                          <input
                            type="number"
                            value={editForm.protein_g ?? ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, protein_g: e.target.value })
                            }
                            className="input text-sm"
                            placeholder="P"
                          />
                          <input
                            type="number"
                            value={editForm.carbs_g ?? ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, carbs_g: e.target.value })
                            }
                            className="input text-sm"
                            placeholder="C"
                          />
                          <input
                            type="number"
                            value={editForm.fat_g ?? ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, fat_g: e.target.value })
                            }
                            className="input text-sm"
                            placeholder="F"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(meal.id)}
                            className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5"
                          >
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null)
                              setEditForm({})
                            }}
                            className="btn-secondary text-xs px-3 py-1.5"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Display Mode ─── */
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{meal.food_name}</p>
                            {meal.quantity && (
                              <span className="badge-blue text-[10px] shrink-0">
                                {meal.quantity}
                              </span>
                            )}
                          </div>
                          {meal.notes && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{meal.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                          <span className="text-orange-400 font-semibold">
                            {meal.calories} cal
                          </span>
                          <span>P {meal.protein_g}g</span>
                          <span>C {meal.carbs_g}g</span>
                          <span>F {meal.fat_g}g</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(meal)}
                            className="p-1.5 rounded-lg hover:bg-[#262626] text-gray-400 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(meal.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* ── Weekly Calorie Overview ───────────────────────────────────── */}
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          Weekly Calorie Overview
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="day" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#141414',
                  border: '1px solid #262626',
                  borderRadius: '8px',
                  color: '#fafafa',
                  fontSize: '12px',
                }}
                cursor={{ fill: 'rgba(34,197,94,0.08)' }}
              />
              <Bar dataKey="calories" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              {profile?.calorie_target && (
                <ReferenceLine
                  y={profile.calorie_target}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  label={{
                    value: `Target: ${profile.calorie_target}`,
                    fill: '#f59e0b',
                    fontSize: 11,
                    position: 'insideTopRight',
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
