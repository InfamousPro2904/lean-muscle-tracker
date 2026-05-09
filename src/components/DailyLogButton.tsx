'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Flame, Dumbbell, Coffee, FileText, CheckCircle2, Loader2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { DailyLog } from '@/lib/types'

type FormState = {
  kcal_in:      number
  kcal_burnt:   number
  workout_done: boolean
  is_rest_day:  boolean
  notes:        string
}

const EMPTY: FormState = {
  kcal_in:      0,
  kcal_burnt:   0,
  workout_done: false,
  is_rest_day:  false,
  notes:        '',
}

export default function DailyLogButton() {
  const supabase = createClient()
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [form,    setForm]    = useState<FormState>(EMPTY)
  const [existing, setExisting] = useState<DailyLog | null>(null)
  const [suggest,  setSuggest]  = useState<{ kcal_in: number; kcal_burnt: number; workout_done: boolean } | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const loadToday = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load existing daily_log for today (if any)
    const { data: log } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    if (log) {
      setExisting(log as DailyLog)
      setForm({
        kcal_in:      log.kcal_in,
        kcal_burnt:   log.kcal_burnt,
        workout_done: log.workout_done,
        is_rest_day:  log.is_rest_day,
        notes:        log.notes ?? '',
      })
    } else {
      setExisting(null)
      setForm(EMPTY)
    }

    // Build suggestion from meal_logs + workout_logs
    const [mealsRes, workoutsRes] = await Promise.all([
      supabase.from('meal_logs').select('calories').eq('user_id', user.id).eq('date', today),
      supabase.from('workout_logs').select('id').eq('user_id', user.id).eq('date', today),
    ])

    const totalKcalIn  = (mealsRes.data ?? []).reduce((s: number, m: { calories: number }) => s + m.calories, 0)
    const workedOut    = (workoutsRes.data ?? []).length > 0

    if (totalKcalIn > 0 || workedOut) {
      setSuggest({ kcal_in: totalKcalIn, kcal_burnt: 0, workout_done: workedOut })
    }
  }, [supabase, today])

  useEffect(() => {
    if (open) loadToday()
  }, [open, loadToday])

  const applysuggestion = () => {
    if (!suggest) return
    setForm(prev => ({
      ...prev,
      kcal_in:      suggest.kcal_in || prev.kcal_in,
      workout_done: suggest.workout_done || prev.workout_done,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        user_id:      user.id,
        date:         today,
        kcal_in:      form.kcal_in,
        kcal_burnt:   form.kcal_burnt,
        workout_done: form.workout_done,
        is_rest_day:  form.is_rest_day,
        notes:        form.notes || null,
      }

      if (existing) {
        await supabase.from('daily_logs').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('daily_logs').insert(payload)
      }

      setSaved(true)
      setTimeout(() => {
        setOpen(false)
        setSaved(false)
      }, 900)
    } finally {
      setSaving(false)
    }
  }

  const patch = (key: keyof FormState, value: FormState[keyof FormState]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  return (
    <>
      {/* ── Floating action button ── */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
        aria-label="Log today's activity"
        title="Log today"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-3xl p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">Daily Log</h2>
                <p className="text-xs text-[#555] mt-0.5">{todayLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                {existing && (
                  <span className="badge badge-blue text-[10px]">Editing</span>
                )}
                <button onClick={() => setOpen(false)} className="text-[#555] hover:text-white p-1 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Suggestion banner */}
            {suggest && !existing && (suggest.kcal_in > 0 || suggest.workout_done) && (
              <button
                onClick={applysuggestion}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left hover:bg-blue-500/15 transition-colors"
              >
                <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-400">Use today&apos;s tracked data</p>
                  <p className="text-[10px] text-[#555] mt-0.5 truncate">
                    {suggest.kcal_in > 0 && `${suggest.kcal_in} kcal from meal logs`}
                    {suggest.workout_done && ' · workout logged'}
                  </p>
                </div>
                <span className="text-[10px] text-blue-400 shrink-0">Apply →</span>
              </button>
            )}

            {/* Kcal in */}
            <div>
              <label className="flex items-center gap-2 text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Calories consumed
              </label>
              <input
                type="number"
                min={0}
                max={9999}
                value={form.kcal_in || ''}
                onChange={e => patch('kcal_in', parseInt(e.target.value) || 0)}
                placeholder="0 kcal"
                className="input"
              />
            </div>

            {/* Kcal burnt */}
            <div>
              <label className="flex items-center gap-2 text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">
                <Dumbbell className="w-3.5 h-3.5 text-blue-400" /> Calories burned (exercise)
              </label>
              <input
                type="number"
                min={0}
                max={9999}
                value={form.kcal_burnt || ''}
                onChange={e => patch('kcal_burnt', parseInt(e.target.value) || 0)}
                placeholder="0 kcal"
                className="input"
              />
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  patch('workout_done', !form.workout_done)
                  if (!form.workout_done) patch('is_rest_day', false)
                }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  form.workout_done
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                    : 'bg-[#161616] border-[#2a2a2a] text-[#555] hover:text-white'
                }`}
              >
                <Dumbbell className="w-4 h-4 shrink-0" />
                Worked out
              </button>

              <button
                onClick={() => {
                  patch('is_rest_day', !form.is_rest_day)
                  if (!form.is_rest_day) patch('workout_done', false)
                }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  form.is_rest_day
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-[#161616] border-[#2a2a2a] text-[#555] hover:text-white'
                }`}
              >
                <Coffee className="w-4 h-4 shrink-0" />
                Rest day
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className="flex items-center gap-2 text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">
                <FileText className="w-3.5 h-3.5" /> Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={e => patch('notes', e.target.value)}
                placeholder="How did today feel?"
                rows={2}
                className="input resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saved ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                ) : saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  'Save Log'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
