'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Search,
  X,
  Loader2,
  Zap,
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

// ── Food search types & quick-foods database ─────────────────────────────────

interface FoodResult {
  name: string
  brand?: string
  per100g: { kcal: number; protein: number; carbs: number; fat: number }
  source: 'local' | 'api'
}

const QUICK_FOODS: FoodResult[] = [
  { name: 'Chicken Breast (cooked)',  per100g: { kcal: 165, protein: 31,   carbs: 0,    fat: 3.6 }, source: 'local' },
  { name: 'Brown Rice (cooked)',      per100g: { kcal: 216, protein: 5,    carbs: 45,   fat: 1.8 }, source: 'local' },
  { name: 'Egg (whole)',              per100g: { kcal: 155, protein: 13,   carbs: 1.1,  fat: 11  }, source: 'local' },
  { name: 'Oats (dry)',               per100g: { kcal: 389, protein: 17,   carbs: 66,   fat: 7   }, source: 'local' },
  { name: 'Whey Protein Powder',      per100g: { kcal: 380, protein: 75,   carbs: 10,   fat: 5   }, source: 'local' },
  { name: 'Salmon (cooked)',          per100g: { kcal: 208, protein: 20,   carbs: 0,    fat: 13  }, source: 'local' },
  { name: 'Tuna (canned, drained)',   per100g: { kcal: 116, protein: 26,   carbs: 0,    fat: 1   }, source: 'local' },
  { name: 'Greek Yogurt (plain)',     per100g: { kcal: 59,  protein: 10,   carbs: 3.6,  fat: 0.4 }, source: 'local' },
  { name: 'Cottage Cheese',           per100g: { kcal: 98,  protein: 11,   carbs: 3.4,  fat: 4.3 }, source: 'local' },
  { name: 'Sweet Potato (cooked)',    per100g: { kcal: 86,  protein: 1.6,  carbs: 20,   fat: 0.1 }, source: 'local' },
  { name: 'Banana',                   per100g: { kcal: 89,  protein: 1.1,  carbs: 23,   fat: 0.3 }, source: 'local' },
  { name: 'Broccoli (cooked)',        per100g: { kcal: 34,  protein: 2.8,  carbs: 7,    fat: 0.4 }, source: 'local' },
  { name: 'Almonds',                  per100g: { kcal: 579, protein: 21,   carbs: 22,   fat: 50  }, source: 'local' },
  { name: 'Peanut Butter',            per100g: { kcal: 588, protein: 25,   carbs: 20,   fat: 50  }, source: 'local' },
  { name: 'White Rice (cooked)',      per100g: { kcal: 130, protein: 2.7,  carbs: 28,   fat: 0.3 }, source: 'local' },
  { name: 'Whole Milk',               per100g: { kcal: 61,  protein: 3.2,  carbs: 4.8,  fat: 3.3 }, source: 'local' },
  { name: 'Bread (whole wheat)',      per100g: { kcal: 247, protein: 13,   carbs: 41,   fat: 4.2 }, source: 'local' },
  { name: 'Avocado',                  per100g: { kcal: 160, protein: 2,    carbs: 9,    fat: 15  }, source: 'local' },
  { name: 'Lentils (cooked)',         per100g: { kcal: 116, protein: 9,    carbs: 20,   fat: 0.4 }, source: 'local' },
  { name: 'Pasta (cooked)',           per100g: { kcal: 158, protein: 6,    carbs: 31,   fat: 1   }, source: 'local' },
]

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

  // ── Food search state ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoodResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [servingGrams, setServingGrams] = useState<number>(100)
  const [mealType, setMealType] = useState<string>(MEAL_TYPES[0])
  const [logNotes, setLogNotes] = useState('')
  const [showManual, setShowManual] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ── Food search (debounced) ─────────────────────────────────────────────

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) { setSearchResults([]); return }

    // Local filter first (instant)
    const local = QUICK_FOODS.filter(f =>
      f.name.toLowerCase().includes(q.toLowerCase())
    )
    setSearchResults(local)

    // Debounce API call for Open Food Facts
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=8&fields=product_name,brands,nutriments&action=process`
        const res = await fetch(url)
        const json = await res.json()
        const apiItems: FoodResult[] = (json.products ?? [])
          .filter((p: Record<string, unknown>) => {
            const n = p.nutriments as Record<string, number> | undefined
            return n && (n['energy-kcal_100g'] ?? 0) > 0
          })
          .slice(0, 6)
          .map((p: Record<string, unknown>) => {
            const n = p.nutriments as Record<string, number>
            return {
              name:    (p.product_name as string) || 'Unknown',
              brand:   (p.brands as string) || undefined,
              per100g: {
                kcal:    Math.round(n['energy-kcal_100g'] ?? 0),
                protein: Math.round((n.proteins_100g     ?? 0) * 10) / 10,
                carbs:   Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
                fat:     Math.round((n.fat_100g           ?? 0) * 10) / 10,
              },
              source: 'api' as const,
            }
          })
        // Merge: local results first, then API (excluding duplicates by name)
        const localNames = new Set(local.map(f => f.name.toLowerCase()))
        const merged = [...local, ...apiItems.filter(f => !localNames.has(f.name.toLowerCase()))]
        setSearchResults(merged)
      } catch {
        // API failed — local results are still shown
      } finally {
        setSearchLoading(false)
      }
    }, 400)
  }, [searchQuery])

  // ── Quick-log a food (from search or quick-foods grid) ──────────────────

  const handleQuickLog = async (food?: FoodResult, grams?: number) => {
    if (!userId) return
    const f = food ?? selectedFood
    const g = grams ?? servingGrams
    if (!f || !g) return
    setSaving(true)
    const scale = g / 100
    const { error: err } = await supabase.from('meal_logs').insert({
      user_id:   userId,
      date:      formatDate(selectedDate),
      meal_type: mealType,
      food_name: f.name,
      calories:  Math.round(f.per100g.kcal    * scale),
      protein_g: Math.round(f.per100g.protein * scale * 10) / 10,
      carbs_g:   Math.round(f.per100g.carbs   * scale * 10) / 10,
      fat_g:     Math.round(f.per100g.fat     * scale * 10) / 10,
      quantity:  `${g}g`,
      notes:     logNotes.trim() || null,
    })
    if (err) { setError(err.message) }
    else {
      setSelectedFood(null)
      setSearchQuery('')
      setServingGrams(100)
      setLogNotes('')
      await fetchMeals()
      await fetchWeekly()
    }
    setSaving(false)
  }

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
      meal_type: mealType,
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

      {/* ── Add Meal ──────────────────────────────────────────────────── */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-500" />
            Log Food
          </h2>
          <button
            onClick={() => setShowManual(m => !m)}
            className="text-xs text-[#555] hover:text-white transition-colors"
          >
            {showManual ? '← Smart search' : 'Enter manually →'}
          </button>
        </div>

        {/* Meal type selector — always visible */}
        <div className="flex gap-2 flex-wrap">
          {MEAL_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setMealType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                mealType === t
                  ? 'bg-green-500/15 border-green-500/30 text-green-400'
                  : 'bg-[#161616] border-[#2a2a2a] text-[#555] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {showManual ? (
          /* ── Manual entry form ── */
          <form onSubmit={handleAddMeal} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['calories','protein_g','carbs_g','fat_g'] as const).map((field, i) => (
                <div key={field}>
                  <label className="text-xs text-gray-400 mb-1 block">
                    {['Calories','Protein (g)','Carbs (g)','Fat (g)'][i]}
                  </label>
                  <input
                    type="number" min="0" step={i === 0 ? '1' : '0.1'} placeholder="0"
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="input" required
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
              <input type="text" placeholder="Any notes..." value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Meal
            </button>
          </form>
        ) : (
          /* ── Food search flow ── */
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type="text"
                placeholder="Search food (e.g. chicken, oats, banana)…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedFood(null) }}
                className="input pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedFood(null); setSearchResults([]) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Selected food card */}
            {selectedFood && (
              <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{selectedFood.name}</p>
                    {selectedFood.brand && <p className="text-[11px] text-[#555]">{selectedFood.brand}</p>}
                    <p className="text-[11px] text-[#444] mt-0.5">
                      Per 100g: {selectedFood.per100g.kcal} kcal · P {selectedFood.per100g.protein}g · C {selectedFood.per100g.carbs}g · F {selectedFood.per100g.fat}g
                    </p>
                  </div>
                  <button onClick={() => setSelectedFood(null)} className="text-[#444] hover:text-white shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Grams input with live macro preview */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-[#666] mb-1 block">Serving size (g)</label>
                    <input
                      type="number" min={1} max={2000} value={servingGrams}
                      onChange={e => setServingGrams(Number(e.target.value) || 100)}
                      className="input text-sm"
                    />
                  </div>
                  <div className="flex gap-3 text-xs text-center">
                    {[
                      { label: 'kcal',    val: Math.round(selectedFood.per100g.kcal    * servingGrams / 100), color: 'text-orange-400' },
                      { label: 'Protein', val: Math.round(selectedFood.per100g.protein * servingGrams / 10)  / 10, color: 'text-blue-400' },
                      { label: 'Carbs',   val: Math.round(selectedFood.per100g.carbs   * servingGrams / 10)  / 10, color: 'text-yellow-400' },
                      { label: 'Fat',     val: Math.round(selectedFood.per100g.fat     * servingGrams / 10)  / 10, color: 'text-red-400' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex flex-col gap-0.5">
                        <span className={`font-bold text-base ${color}`}>{val}{label !== 'kcal' ? 'g' : ''}</span>
                        <span className="text-[10px] text-[#444]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#666] mb-1 block">Notes (optional)</label>
                  <input type="text" placeholder="e.g. with seasoning" value={logNotes}
                    onChange={e => setLogNotes(e.target.value)} className="input text-sm" />
                </div>

                {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

                <button
                  onClick={() => handleQuickLog()}
                  disabled={saving || !servingGrams}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Log {servingGrams}g of {selectedFood.name.split(' ')[0]}
                </button>
              </div>
            )}

            {/* Search results */}
            {!selectedFood && searchQuery && (
              <div className="space-y-1">
                {searchLoading && (
                  <div className="flex items-center gap-2 text-xs text-[#444] px-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching food database…
                  </div>
                )}
                {searchResults.length > 0 ? (
                  searchResults.map((food, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedFood(food); setServingGrams(100) }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#161616] hover:bg-[#1e1e1e] border border-[#222] text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{food.name}</p>
                        {food.brand && <p className="text-[10px] text-[#444] truncate">{food.brand}</p>}
                      </div>
                      <div className="text-[11px] text-[#555] shrink-0 text-right">
                        <p className="text-orange-400 font-medium">{food.per100g.kcal} kcal</p>
                        <p>per 100g</p>
                      </div>
                    </button>
                  ))
                ) : !searchLoading && (
                  <p className="text-xs text-[#444] px-1">No results — try a different name or use manual entry.</p>
                )}
              </div>
            )}

            {/* Quick foods grid (when no search active) */}
            {!searchQuery && !selectedFood && (
              <div>
                <p className="text-xs text-[#444] mb-2 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-blue-400" /> Quick foods — tap to select
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUICK_FOODS.map((food, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedFood(food); setServingGrams(100) }}
                      className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#222] hover:border-[#333] hover:bg-[#1a1a1a] text-left transition-colors"
                    >
                      <p className="text-xs font-medium leading-tight truncate w-full">{food.name}</p>
                      <p className="text-[10px] text-orange-400">{food.per100g.kcal} kcal · P {food.per100g.protein}g</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
