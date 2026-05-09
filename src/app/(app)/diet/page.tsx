'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { MealLog, Profile, MEAL_TYPES, MealTemplate, BasketItem, Macros100g } from '@/lib/types'
import { QUICK_FOODS, searchFoods, type FoodItem } from '@/lib/foods'
import { getWeekStartIso, getWeekEndIso } from '@/lib/week'
import FoodItemEditor, { type EditableFood } from '@/components/diet/FoodItemEditor'
import TemplateEditorModal from '@/components/diet/TemplateEditorModal'
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
  ShoppingBasket,
  Star,
  BookmarkPlus,
  Layers,
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

/** Format a number to at most 1 decimal place; trailing .0 stripped */
function fmt(n: number): string {
  if (!isFinite(n)) return '0'
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? r.toString() : r.toFixed(1)
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

/** "247 left" / "+150 over" / "Hit goal" — clearer than percent */
function remainingLabel(consumed: number, target: number, unit: string): { text: string; color: string } {
  if (target <= 0) return { text: '—', color: 'text-[#666]' }
  const diff = target - consumed
  if (diff > 0)  return { text: `${Math.round(diff)}${unit} left`,  color: 'text-green-400' }
  if (diff === 0) return { text: 'Hit goal',                          color: 'text-yellow-400' }
  return { text: `+${Math.round(-diff)}${unit} over`,                 color: 'text-red-400' }
}

// ── Search result type (unifies local + Open Food Facts) ───────────────────

interface FoodResult {
  name:    string
  brand?:  string
  per100g: Macros100g
  source:  'local' | 'api'
}

function foodItemToResult(item: FoodItem): FoodResult {
  return { name: item.name, per100g: item.per100g, source: 'local' }
}

// Basket totals helper
function basketTotals(items: BasketItem[]): { kcal: number; protein: number; carbs: number; fat: number } {
  return items.reduce((t, item) => {
    const s = item.grams / 100
    return {
      kcal:    t.kcal    + item.per100g.kcal    * s,
      protein: t.protein + item.per100g.protein * s,
      carbs:   t.carbs   + item.per100g.carbs   * s,
      fat:     t.fat     + item.per100g.fat     * s,
    }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
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

  // ── Food search & basket state ──────────────────────────────────────────
  type LogMode = 'search' | 'templates' | 'manual'
  const [logMode,       setLogMode]       = useState<LogMode>('search')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<FoodResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [mealType,      setMealType]      = useState<string>(MEAL_TYPES[0])
  const [logNotes,      setLogNotes]      = useState('')
  const [basket,        setBasket]        = useState<BasketItem[]>([])
  const [editingGramsId, setEditingGramsId] = useState<string | null>(null)
  const [templates,      setTemplates]      = useState<MealTemplate[]>([])
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName,   setTemplateName]   = useState('')
  const [templatePromptOpen, setTemplatePromptOpen] = useState(false)

  // Recent foods (last 30 days, distinct food names sorted by frequency)
  const [recentFoods, setRecentFoods]   = useState<FoodResult[]>([])
  const [showRecent,  setShowRecent]    = useState(false)

  // Inline edit of a basket item / template
  const [editingBasketId,  setEditingBasketId]  = useState<string | null>(null)
  const [editingTemplate,  setEditingTemplate]  = useState<MealTemplate | null>(null)

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
    // Mon-Sun week containing selectedDate (ISO 8601, app-wide)
    const startIso = getWeekStartIso(selectedDate)
    const endIso   = getWeekEndIso(startIso)

    const { data } = await supabase
      .from('meal_logs')
      .select('date, calories')
      .eq('user_id', userId)
      .gte('date', startIso)
      .lte('date', endIso)

    if (!data) return

    const map: Record<string, number> = {}
    const start = new Date(startIso + 'T12:00:00')
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

  // ── Food search (debounced, with relevance filtering) ───────────────────

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) { setSearchResults([]); return }

    // Local search first (instant) — uses curated foods.ts database
    const local: FoodResult[] = searchFoods(q, 12).map(foodItemToResult)
    setSearchResults(local)

    // Skip API call if local already has 5+ matches — local is more relevant
    if (local.length >= 5) {
      setSearchLoading(false)
      return
    }

    // Debounce API call for Open Food Facts (fallback)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=12&fields=product_name,brands,nutriments&action=process`
        const res = await fetch(url)
        const json = await res.json()
        const queryLower = q.toLowerCase()
        const apiItems: FoodResult[] = (json.products ?? [])
          .filter((p: Record<string, unknown>) => {
            const n = p.nutriments as Record<string, number> | undefined
            const name = (p.product_name as string) || ''
            // Reject empty / no kcal
            if (!n || (n['energy-kcal_100g'] ?? 0) <= 0) return false
            // Reject if name doesn't contain query (relevance)
            if (!name.toLowerCase().includes(queryLower)) return false
            // Reject implausible kcal range (likely bad data)
            const kcal = n['energy-kcal_100g'] ?? 0
            if (kcal < 5 || kcal > 900) return false
            // Reject very long names (usually packaged junk with multi-word brands)
            if (name.length > 60) return false
            return true
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
        // Dedupe by name (local takes precedence)
        const localNames = new Set(local.map(f => f.name.toLowerCase()))
        const merged = [...local, ...apiItems.filter(f => !localNames.has(f.name.toLowerCase()))]
        setSearchResults(merged)
      } catch {
        // API failed — local results stay
      } finally {
        setSearchLoading(false)
      }
    }, 400)
  }, [searchQuery])

  // ── Basket management ───────────────────────────────────────────────────

  const addToBasket = (food: FoodResult, grams = 100) => {
    setBasket(prev => [...prev, {
      id:      genId(),
      name:    food.name,
      brand:   food.brand,
      per100g: food.per100g,
      grams,
    }])
    setSearchQuery('')
    setSearchResults([])
  }

  const removeFromBasket = (id: string) =>
    setBasket(prev => prev.filter(b => b.id !== id))

  const updateBasketGrams = (id: string, grams: number) =>
    setBasket(prev => prev.map(b => b.id === id ? { ...b, grams } : b))

  /** Replace a basket item's full data (name + per100g + grams) from inline editor */
  const updateBasketItem = (id: string, food: EditableFood) =>
    setBasket(prev => prev.map(b => b.id === id
      ? { ...b, name: food.name, per100g: food.per100g, grams: food.grams }
      : b
    ))

  // ── Templates ───────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('meal_templates')
      .select('*')
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
    setTemplates((data ?? []) as MealTemplate[])
  }, [userId, supabase])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  // ── Recent foods (distinct food names, last 30 days, by frequency) ─────

  const loadRecentFoods = useCallback(async () => {
    if (!userId) return
    const thirtyAgo = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0]
    const { data } = await supabase
      .from('meal_logs')
      .select('food_name, calories, protein_g, carbs_g, fat_g, quantity')
      .eq('user_id', userId)
      .gte('date', thirtyAgo)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!data) return

    // Group by food name; pick a representative entry; rank by count
    const counts = new Map<string, number>()
    const samples = new Map<string, FoodResult>()
    for (const row of data as { food_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; quantity: string | null }[]) {
      const name = row.food_name
      counts.set(name, (counts.get(name) ?? 0) + 1)
      if (!samples.has(name)) {
        // Convert "100g" or unknown → derive per-100g macros
        const grams = row.quantity?.match(/(\d+)\s*g/i)?.[1]
        const g = grams ? Number(grams) : 100
        const scale = g > 0 ? 100 / g : 1
        samples.set(name, {
          name,
          per100g: {
            kcal:    Math.round(row.calories  * scale),
            protein: Math.round(row.protein_g * scale * 10) / 10,
            carbs:   Math.round(row.carbs_g   * scale * 10) / 10,
            fat:     Math.round(row.fat_g     * scale * 10) / 10,
          },
          source: 'local',
        })
      }
    }
    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name]) => samples.get(name)!)
      .filter(Boolean)
    setRecentFoods(ranked)
  }, [userId, supabase])

  useEffect(() => { loadRecentFoods() }, [loadRecentFoods])

  // ── Copy yesterday's meal of the same meal_type into basket ─────────────

  const copyYesterdaysMeal = async () => {
    if (!userId) return
    const yesterday = new Date(selectedDate)
    yesterday.setDate(yesterday.getDate() - 1)
    const { data } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', formatDate(yesterday))
      .eq('meal_type', mealType)
      .order('created_at', { ascending: true })

    if (!data || data.length === 0) {
      setError(`No ${mealType.toLowerCase()} logged yesterday`)
      setTimeout(() => setError(''), 2500)
      return
    }

    // Convert each meal_log row to a basket item (derive per-100g from quantity if available)
    const items: BasketItem[] = (data as MealLog[]).map(row => {
      const grams = row.quantity?.match(/(\d+)\s*g/i)?.[1]
      const g = grams ? Number(grams) : 100
      const scale = g > 0 ? 100 / g : 1
      return {
        id:    genId(),
        name:  row.food_name,
        per100g: {
          kcal:    Math.round(row.calories  * scale),
          protein: Math.round(row.protein_g * scale * 10) / 10,
          carbs:   Math.round(row.carbs_g   * scale * 10) / 10,
          fat:     Math.round(row.fat_g     * scale * 10) / 10,
        },
        grams: g,
      }
    })
    setBasket(items)
    setLogMode('search')
    setSearchQuery('')
  }

  const loadTemplateIntoBasket = (tpl: MealTemplate) => {
    const items: BasketItem[] = tpl.items.map(it => ({
      id:      genId(),
      name:    it.food_name,
      per100g: it.per_100g,
      grams:   it.grams,
    }))
    setBasket(items)
    if (tpl.default_meal_type) setMealType(tpl.default_meal_type)
    setLogMode('search')  // jump to search view so user sees the basket
  }

  const saveBasketAsTemplate = async () => {
    if (!userId || basket.length === 0 || !templateName.trim()) return
    setSavingTemplate(true)
    try {
      const items = basket.map(b => ({
        food_name: b.name,
        grams:     b.grams,
        per_100g:  b.per100g,
      }))
      await supabase.from('meal_templates').insert({
        user_id:           userId,
        name:              templateName.trim(),
        default_meal_type: mealType,
        items,
        last_used_at:      new Date().toISOString(),
        use_count:         0,
      })
      setTemplateName('')
      setTemplatePromptOpen(false)
      await loadTemplates()
    } finally {
      setSavingTemplate(false)
    }
  }

  const toggleTemplateFavorite = async (tpl: MealTemplate) => {
    await supabase.from('meal_templates')
      .update({ is_favorite: !tpl.is_favorite })
      .eq('id', tpl.id)
    await loadTemplates()
  }

  const deleteTemplate = async (tpl: MealTemplate) => {
    await supabase.from('meal_templates').delete().eq('id', tpl.id)
    await loadTemplates()
  }

  // ── Log basket as N rows with shared meal_session_id ────────────────────

  const logBasket = async () => {
    if (!userId || basket.length === 0) return
    setSaving(true)
    setError('')
    const sessionId = genId()
    const rowsToInsert = basket.map(b => {
      const scale = b.grams / 100
      return {
        user_id:         userId,
        date:            formatDate(selectedDate),
        meal_type:       mealType,
        food_name:       b.name,
        calories:        Math.round(b.per100g.kcal    * scale),
        protein_g:       Math.round(b.per100g.protein * scale * 10) / 10,
        carbs_g:         Math.round(b.per100g.carbs   * scale * 10) / 10,
        fat_g:           Math.round(b.per100g.fat     * scale * 10) / 10,
        quantity:        `${b.grams}g`,
        notes:           logNotes.trim() || null,
        meal_session_id: sessionId,
      }
    })
    const { error: err } = await supabase.from('meal_logs').insert(rowsToInsert)
    if (err) { setError(err.message) }
    else {
      setBasket([])
      setLogNotes('')
      setSearchQuery('')
      setEditingGramsId(null)
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

  // ── Group meals by type, then by meal_session_id ─────────────────────────
  // A multi-item logged meal (same meal_session_id) shows together; singles render alone.

  type MealGroup =
    | { kind: 'single';  meal: MealLog }
    | { kind: 'session'; sessionId: string; meals: MealLog[] }

  const grouped = MEAL_TYPES.reduce(
    (acc, type) => {
      const items = meals.filter((m) => m.meal_type === type)
      if (items.length === 0) return acc

      const groups: MealGroup[] = []
      for (const m of items) {
        if (m.meal_session_id) {
          const existing = groups.find(g => g.kind === 'session' && g.sessionId === m.meal_session_id)
          if (existing && existing.kind === 'session') {
            existing.meals.push(m)
          } else {
            groups.push({ kind: 'session', sessionId: m.meal_session_id, meals: [m] })
          }
        } else {
          groups.push({ kind: 'single', meal: m })
        }
      }

      // Demote single-meal "sessions" to singletons
      acc[type] = groups.map(g =>
        g.kind === 'session' && g.meals.length === 1
          ? { kind: 'single' as const, meal: g.meals[0] }
          : g
      )
      return acc
    },
    {} as Record<string, MealGroup[]>
  )

  // Helper for session totals
  const sessionTotals = (rows: MealLog[]) => rows.reduce(
    (t, m) => ({
      kcal:    t.kcal    + m.calories,
      protein: t.protein + m.protein_g,
      carbs:   t.carbs   + m.carbs_g,
      fat:     t.fat     + m.fat_g,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // ── Delete an entire session (multi-item meal) ──────────────────────────
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete all items in this meal?')) return
    const { error: err } = await supabase.from('meal_logs').delete().eq('meal_session_id', sessionId)
    if (err) { setError(err.message) }
    else {
      await fetchMeals()
      await fetchWeekly()
    }
  }

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
            <p className={`text-[11px] font-medium ${remainingLabel(totals.calories, profile?.calorie_target ?? 0, '').color}`}>
              {remainingLabel(totals.calories, profile?.calorie_target ?? 0, '').text}
            </p>
          </div>

          {/* Protein */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 text-center space-y-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Protein</span>
            <p className={`text-3xl font-bold ${textColor(protPct)}`}>{fmt(totals.protein)}g</p>
            <p className="text-xs text-gray-500">/ {profile?.protein_target ?? '—'}g</p>
            <div className="progress-bar">
              <div
                className={`progress-fill ${barColor(protPct)}`}
                style={{ width: `${Math.min(protPct, 100)}%` }}
              />
            </div>
            <p className={`text-[11px] font-medium ${remainingLabel(totals.protein, profile?.protein_target ?? 0, 'g').color}`}>
              {remainingLabel(totals.protein, profile?.protein_target ?? 0, 'g').text}
            </p>
          </div>

          {/* Carbs */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 text-center space-y-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Carbs</span>
            <p className={`text-3xl font-bold ${textColor(carbPct)}`}>{fmt(totals.carbs)}g</p>
            <p className="text-xs text-gray-500">/ {profile?.carb_target ?? '—'}g</p>
            <div className="progress-bar">
              <div
                className={`progress-fill ${barColor(carbPct)}`}
                style={{ width: `${Math.min(carbPct, 100)}%` }}
              />
            </div>
            <p className={`text-[11px] font-medium ${remainingLabel(totals.carbs, profile?.carb_target ?? 0, 'g').color}`}>
              {remainingLabel(totals.carbs, profile?.carb_target ?? 0, 'g').text}
            </p>
          </div>

          {/* Fat */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 text-center space-y-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Fat</span>
            <p className={`text-3xl font-bold ${textColor(fatPct)}`}>{fmt(totals.fat)}g</p>
            <p className="text-xs text-gray-500">/ {profile?.fat_target ?? '—'}g</p>
            <div className="progress-bar">
              <div
                className={`progress-fill ${barColor(fatPct)}`}
                style={{ width: `${Math.min(fatPct, 100)}%` }}
              />
            </div>
            <p className={`text-[11px] font-medium ${remainingLabel(totals.fat, profile?.fat_target ?? 0, 'g').color}`}>
              {remainingLabel(totals.fat, profile?.fat_target ?? 0, 'g').text}
            </p>
          </div>
        </div>
      </section>

      {/* ── Add Meal ──────────────────────────────────────────────────── */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-500" />
            Log Food
          </h2>
          {/* Mode tabs */}
          <div className="flex gap-1 bg-[#0e0e0e] border border-[#222] rounded-xl p-1 text-xs">
            {([
              { key: 'search',    label: 'Search',    icon: Search },
              { key: 'templates', label: 'Templates', icon: Layers },
              { key: 'manual',    label: 'Manual',    icon: Edit3 },
            ] as { key: LogMode; label: string; icon: typeof Search }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setLogMode(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  logMode === key ? 'bg-green-500/15 text-green-400' : 'text-[#666] hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" /> {label}
                {key === 'templates' && templates.length > 0 && (
                  <span className="ml-0.5 text-[9px] bg-blue-500/20 text-blue-400 rounded-full px-1.5">{templates.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Meal type selector — always visible, with Copy Yesterday */}
        <div className="flex gap-2 flex-wrap items-center">
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
          <button
            onClick={copyYesterdaysMeal}
            title={`Copy yesterday's ${mealType}`}
            className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-medium border bg-blue-500/8 border-blue-500/20 text-blue-400 hover:bg-blue-500/15 flex items-center gap-1.5"
          >
            <ChevronLeft className="w-3 h-3" /> Copy yesterday
          </button>
        </div>

        {logMode === 'manual' && (
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
        )}

        {logMode === 'templates' && (
          /* ── Templates view ── */
          <div className="space-y-3">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-[#555] text-sm space-y-2">
                <Layers className="w-8 h-8 mx-auto text-[#333]" />
                <p>No templates yet.</p>
                <p className="text-xs text-[#444]">Build a meal in Search mode and save it as a template for one-tap logging.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map(tpl => {
                  const totals = tpl.items.reduce((t, it) => {
                    const s = it.grams / 100
                    return {
                      kcal: t.kcal + (it.per_100g.kcal ?? 0) * s,
                      protein: t.protein + (it.per_100g.protein ?? 0) * s,
                    }
                  }, { kcal: 0, protein: 0 })
                  return (
                    <div key={tpl.id} className="bg-[#161616] border border-[#222] rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium truncate">{tpl.name}</p>
                            {tpl.is_favorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-[#555] mt-0.5">
                            {tpl.items.length} item{tpl.items.length !== 1 ? 's' : ''} · {Math.round(totals.kcal)} kcal · P {fmt(totals.protein)}g
                            {tpl.default_meal_type && ` · ${tpl.default_meal_type}`}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => toggleTemplateFavorite(tpl)}
                            className="text-[#444] hover:text-amber-400 p-1"
                            title="Toggle favorite"
                          >
                            <Star className={`w-3.5 h-3.5 ${tpl.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                          <button
                            onClick={() => setEditingTemplate(tpl)}
                            className="text-[#444] hover:text-blue-400 p-1"
                            title="Edit template"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTemplate(tpl)}
                            className="text-[#444] hover:text-red-400 p-1"
                            title="Delete template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => loadTemplateIntoBasket(tpl)}
                        className="btn-primary py-1.5 text-xs flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBasket className="w-3 h-3" /> Load into basket
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {logMode === 'search' && (
          /* ── Food search flow with multi-item basket ── */
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type="text"
                placeholder="Search food (e.g. dal, chapati, oats, paneer)…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="space-y-1">
                {searchLoading && (
                  <div className="flex items-center gap-2 text-xs text-[#444] px-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching online database…
                  </div>
                )}
                {searchResults.length > 0 ? (
                  searchResults.map((food, i) => (
                    <button
                      key={i}
                      onClick={() => addToBasket(food, 100)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#161616] hover:bg-[#1e1e1e] border border-[#222] text-left transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{food.name}</p>
                          <span className={`text-[9px] uppercase tracking-wider px-1 rounded ${
                            food.source === 'local' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'
                          }`}>
                            {food.source === 'local' ? 'Local' : 'Online'}
                          </span>
                        </div>
                        {food.brand && <p className="text-[10px] text-[#444] truncate">{food.brand}</p>}
                      </div>
                      <div className="text-[11px] text-[#555] shrink-0 text-right">
                        <p className="text-orange-400 font-medium">{food.per100g.kcal} kcal</p>
                        <p>per 100g</p>
                      </div>
                      <Plus className="w-4 h-4 text-blue-400 shrink-0" />
                    </button>
                  ))
                ) : !searchLoading && (
                  <p className="text-xs text-[#444] px-1">No results — try a different name or use Manual mode.</p>
                )}
              </div>
            )}

            {/* Basket — multi-item composer */}
            {basket.length > 0 && (() => {
              const totals = basketTotals(basket)
              return (
                <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBasket className="w-4 h-4 text-green-400" />
                    <p className="text-sm font-semibold text-green-400">Building {mealType}</p>
                    <p className="ml-auto text-[11px] text-[#555]">{basket.length} item{basket.length !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {basket.map(item => {
                      const s = item.grams / 100
                      const editing = editingGramsId === item.id
                      return (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0e0e0e] border border-[#1a1a1a]">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.name}</p>
                            <p className="text-[10px] text-[#555]">
                              {Math.round(item.per100g.kcal * s)} kcal · P {fmt(item.per100g.protein * s)}g · C {fmt(item.per100g.carbs * s)}g · F {fmt(item.per100g.fat * s)}g
                            </p>
                          </div>
                          {editing ? (
                            <input
                              type="number"
                              min={1}
                              max={2000}
                              value={item.grams}
                              autoFocus
                              onBlur={() => setEditingGramsId(null)}
                              onChange={e => updateBasketGrams(item.id, Number(e.target.value) || 100)}
                              onKeyDown={e => { if (e.key === 'Enter') setEditingGramsId(null) }}
                              className="input text-xs w-20 py-1 text-right"
                            />
                          ) : (
                            <button
                              onClick={() => setEditingGramsId(item.id)}
                              className="text-xs text-blue-400 hover:text-blue-300 font-mono px-2"
                            >
                              {item.grams}g
                            </button>
                          )}
                          <button
                            onClick={() => setEditingBasketId(item.id)}
                            className="text-[#555] hover:text-blue-400 p-0.5"
                            title="Edit name & macros"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromBasket(item.id)}
                            className="text-[#555] hover:text-red-400 p-0.5"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Totals */}
                  <div className="flex gap-3 text-xs text-center pt-2 border-t border-green-500/15">
                    {[
                      { label: 'kcal',    val: Math.round(totals.kcal).toString(),       color: 'text-orange-400' },
                      { label: 'Protein', val: fmt(totals.protein),                       color: 'text-blue-400' },
                      { label: 'Carbs',   val: fmt(totals.carbs),                         color: 'text-yellow-400' },
                      { label: 'Fat',     val: fmt(totals.fat),                           color: 'text-red-400' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex-1">
                        <p className={`font-bold text-base ${color}`}>{val}{label !== 'kcal' ? 'g' : ''}</p>
                        <p className="text-[10px] text-[#444]">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={logNotes}
                    onChange={e => setLogNotes(e.target.value)}
                    className="input text-xs"
                  />

                  {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

                  {/* Save as template prompt */}
                  {templatePromptOpen ? (
                    <div className="flex items-center gap-2 bg-blue-500/8 border border-blue-500/20 rounded-lg p-2">
                      <input
                        type="text"
                        placeholder="Template name (e.g. Daily Breakfast)"
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        className="input text-xs flex-1"
                        autoFocus
                      />
                      <button
                        onClick={saveBasketAsTemplate}
                        disabled={savingTemplate || !templateName.trim()}
                        className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                      >
                        {savingTemplate ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                      </button>
                      <button
                        onClick={() => { setTemplatePromptOpen(false); setTemplateName('') }}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setTemplatePromptOpen(true)}
                      className="text-[11px] text-[#666] hover:text-blue-400 flex items-center gap-1"
                    >
                      <BookmarkPlus className="w-3 h-3" /> Save this meal as a template
                    </button>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setBasket([]); setLogNotes('') }}
                      className="btn-secondary flex-1 text-sm"
                    >
                      Clear
                    </button>
                    <button
                      onClick={logBasket}
                      disabled={saving}
                      className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Log {mealType}
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Quick foods + Recent foods (when no search active and basket empty) */}
            {!searchQuery && basket.length === 0 && (
              <div className="space-y-4">
                {/* Tab toggle: Quick / Recent */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRecent(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      !showRecent ? 'bg-blue-500/15 text-blue-400' : 'text-[#666] hover:text-white'
                    }`}
                  >
                    <Zap className="w-3 h-3" /> Quick foods
                  </button>
                  {recentFoods.length > 0 && (
                    <button
                      onClick={() => setShowRecent(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                        showRecent ? 'bg-amber-500/15 text-amber-400' : 'text-[#666] hover:text-white'
                      }`}
                    >
                      <Star className="w-3 h-3" /> Recent ({recentFoods.length})
                    </button>
                  )}
                </div>

                {showRecent && recentFoods.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {recentFoods.map((food, i) => (
                      <button
                        key={i}
                        onClick={() => addToBasket(food, 100)}
                        className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#222] hover:border-amber-500/30 hover:bg-amber-500/5 text-left transition-colors"
                      >
                        <p className="text-xs font-medium leading-tight truncate w-full">{food.name}</p>
                        <p className="text-[10px] text-orange-400">{food.per100g.kcal} kcal · P {fmt(food.per100g.protein)}g</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {QUICK_FOODS.map((food, i) => (
                      <button
                        key={i}
                        onClick={() => addToBasket(foodItemToResult(food), food.portions?.[0]?.grams ?? 100)}
                        className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#222] hover:border-[#333] hover:bg-[#1a1a1a] text-left transition-colors"
                      >
                        <p className="text-xs font-medium leading-tight truncate w-full">{food.name}</p>
                        <p className="text-[10px] text-orange-400">{food.per100g.kcal} kcal · P {fmt(food.per100g.protein)}g</p>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-[#444] text-center">
                  Tap multiple foods to build a meal · search for 200+ more (incl. Indian dishes)
                </p>
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
          Object.entries(grouped).map(([type, groups]) => {
            // Render a single meal row (display + inline edit)
            const renderMealRow = (meal: MealLog, indent = false) => (
              <div
                key={meal.id}
                className={`bg-[#1a1a1a] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  indent ? 'ml-3 border-l-2 border-green-500/20 pl-3' : ''
                }`}
              >
                {editingId === meal.id ? (
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <input type="text" value={editForm.food_name ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, food_name: e.target.value })}
                        className="input text-sm" placeholder="Food name" />
                      <input type="text" value={editForm.quantity ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                        className="input text-sm" placeholder="Quantity" />
                      <input type="text" value={editForm.notes ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="input text-sm" placeholder="Notes" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <input type="number" value={editForm.calories ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, calories: e.target.value })}
                        className="input text-sm" placeholder="Cal" />
                      <input type="number" value={editForm.protein_g ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, protein_g: e.target.value })}
                        className="input text-sm" placeholder="P" />
                      <input type="number" value={editForm.carbs_g ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, carbs_g: e.target.value })}
                        className="input text-sm" placeholder="C" />
                      <input type="number" value={editForm.fat_g ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, fat_g: e.target.value })}
                        className="input text-sm" placeholder="F" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(meal.id)} className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5">
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => { setEditingId(null); setEditForm({}) }} className="btn-secondary text-xs px-3 py-1.5">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{meal.food_name}</p>
                        {meal.quantity && <span className="badge-blue text-[10px] shrink-0">{meal.quantity}</span>}
                      </div>
                      {meal.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{meal.notes}</p>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                      <span className="text-orange-400 font-semibold">{meal.calories} cal</span>
                      <span>P {fmt(meal.protein_g)}g</span>
                      <span>C {fmt(meal.carbs_g)}g</span>
                      <span>F {fmt(meal.fat_g)}g</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(meal)} className="p-1.5 rounded-lg hover:bg-[#262626] text-gray-400 hover:text-white transition-colors" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(meal.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )

            return (
              <div key={type} className="card space-y-3">
                <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide">{type}</h3>
                <div className="space-y-2">
                  {groups.map((g, idx) => {
                    if (g.kind === 'single') return renderMealRow(g.meal)
                    // Session: header + indented items
                    const t = sessionTotals(g.meals)
                    return (
                      <div key={g.sessionId} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-green-500/8 border border-green-500/15 rounded-lg">
                          <div className="flex items-center gap-2 text-[11px]">
                            <ShoppingBasket className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 font-medium">Multi-item meal</span>
                            <span className="text-[#666]">· {g.meals.length} items</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-orange-400 font-semibold">{Math.round(t.kcal)} cal</span>
                            <span className="text-[#666]">P {fmt(t.protein)}g · C {fmt(t.carbs)}g · F {fmt(t.fat)}g</span>
                            <button
                              onClick={() => handleDeleteSession(g.sessionId)}
                              className="p-1 rounded hover:bg-red-500/20 text-[#666] hover:text-red-400 transition-colors"
                              title="Delete entire meal"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {g.meals.map(m => renderMealRow(m, true))}
                        </div>
                        {idx < groups.length - 1 && <div className="h-px" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
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

      {/* ── Editor modals ── */}
      {editingBasketId && (() => {
        const item = basket.find(b => b.id === editingBasketId)
        if (!item) return null
        return (
          <FoodItemEditor
            initial={{ name: item.name, brand: item.brand, per100g: item.per100g, grams: item.grams }}
            showGrams
            onClose={() => setEditingBasketId(null)}
            onSave={(food) => { updateBasketItem(item.id, food); setEditingBasketId(null) }}
          />
        )
      })()}

      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={loadTemplates}
        />
      )}
    </div>
  )
}
