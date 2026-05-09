'use client'

import { useState } from 'react'
import { Edit3, Trash2, Save, Loader2, Coffee, Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { DailyLog } from '@/lib/types'
import { toIsoLocal, todayIsoLocal, daysAgoIsoLocal } from '@/lib/week'

interface Props {
  weekStart: string  // ISO date YYYY-MM-DD
  weekEnd:   string
  logs:      DailyLog[]
  onChanged: () => void
}

interface DayCell {
  date:         string
  log:          DailyLog | null
}

/** Build 7 day cells (Mon..Sun) for the given week, filling empty days. */
function buildWeekCells(weekStart: string, logs: DailyLog[]): DayCell[] {
  const start = new Date(weekStart + 'T12:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const iso = toIsoLocal(d)
    return {
      date: iso,
      log:  logs.find(l => l.date === iso) ?? null,
    }
  })
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const today = todayIsoLocal()
  const yest  = daysAgoIsoLocal(1)
  if (iso === today) return 'Today'
  if (iso === yest)  return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function MyDailyLogsPanel({ weekStart, weekEnd: _weekEnd, logs, onChanged }: Props) {
  const supabase = createClient()
  const cells = buildWeekCells(weekStart, logs)

  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    kcal_in:      0,
    kcal_burnt:   0,
    workout_done: false,
    is_rest_day:  false,
    notes:        '',
  })
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState('')

  const startEdit = (cell: DayCell) => {
    setEditingDate(cell.date)
    setEditForm({
      kcal_in:      cell.log?.kcal_in     ?? 0,
      kcal_burnt:   cell.log?.kcal_burnt  ?? 0,
      workout_done: cell.log?.workout_done ?? false,
      is_rest_day:  cell.log?.is_rest_day  ?? false,
      notes:        cell.log?.notes        ?? '',
    })
    setError('')
  }

  const saveEdit = async () => {
    if (!editingDate) return
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const cell = cells.find(c => c.date === editingDate)
      const payload = {
        user_id:      user.id,
        date:         editingDate,
        kcal_in:      Number(editForm.kcal_in)    || 0,
        kcal_burnt:   Number(editForm.kcal_burnt) || 0,
        workout_done: editForm.workout_done,
        is_rest_day:  editForm.is_rest_day,
        notes:        editForm.notes.trim() || null,
      }

      if (cell?.log) {
        const { error: err } = await supabase
          .from('daily_logs')
          .update(payload)
          .eq('id', cell.log.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('daily_logs')
          .insert(payload)
        if (err) throw err
      }
      setEditingDate(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const deleteDay = async (cell: DayCell) => {
    if (!cell.log) return
    if (!confirm(`Delete ${formatDayLabel(cell.date)}'s log?`)) return
    const { error: err } = await supabase
      .from('daily_logs')
      .delete()
      .eq('id', cell.log.id)
    if (err) {
      setError(err.message)
      return
    }
    onChanged()
  }

  return (
    <div className="mt-3 border-t border-blue-500/20 pt-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
        <Edit3 className="w-3 h-3" /> Edit my daily logs
      </p>

      <div className="space-y-1">
        {cells.map(cell => {
          const editing = editingDate === cell.date
          const has = !!cell.log

          if (editing) {
            return (
              <div key={cell.date} className="bg-[#0e0e0e] border border-blue-500/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-400">{formatDayLabel(cell.date)}</p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#666] block mb-1">Calories in</label>
                    <input
                      type="number" min={0} max={9999}
                      value={editForm.kcal_in || ''}
                      onChange={e => setEditForm({ ...editForm, kcal_in: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="input text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#666] block mb-1">Calories burnt</label>
                    <input
                      type="number" min={0} max={9999}
                      value={editForm.kcal_burnt || ''}
                      onChange={e => setEditForm({ ...editForm, kcal_burnt: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="input text-xs py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEditForm({ ...editForm, workout_done: !editForm.workout_done, is_rest_day: editForm.workout_done ? editForm.is_rest_day : false })}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      editForm.workout_done ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-[#161616] border-[#2a2a2a] text-[#555]'
                    }`}
                  >
                    <Dumbbell className="w-3 h-3" /> Worked out
                  </button>
                  <button
                    onClick={() => setEditForm({ ...editForm, is_rest_day: !editForm.is_rest_day, workout_done: editForm.is_rest_day ? editForm.workout_done : false })}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      editForm.is_rest_day ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-[#161616] border-[#2a2a2a] text-[#555]'
                    }`}
                  >
                    <Coffee className="w-3 h-3" /> Rest day
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  className="input text-xs py-1.5"
                />

                {error && <p className="text-[10px] text-red-400">{error}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingDate(null)}
                    className="btn-secondary flex-1 text-[11px] py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="btn-primary flex-1 text-[11px] py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div key={cell.date} className="flex items-center gap-2 bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg px-3 py-2">
              <p className="text-xs font-medium w-20 shrink-0">{formatDayLabel(cell.date)}</p>
              {has ? (
                <div className="flex-1 min-w-0 flex items-center gap-3 text-[10px] text-[#777]">
                  <span>↑ {cell.log!.kcal_in}</span>
                  <span>↓ {cell.log!.kcal_burnt}</span>
                  {cell.log!.workout_done && <span className="text-blue-400">💪</span>}
                  {cell.log!.is_rest_day && <span className="text-amber-400">☕</span>}
                  {cell.log!.notes && <span className="text-[#555] truncate">— {cell.log!.notes}</span>}
                </div>
              ) : (
                <p className="flex-1 text-[10px] text-[#444] italic">No log yet</p>
              )}
              <button
                onClick={() => startEdit(cell)}
                className="text-[#555] hover:text-blue-400 p-0.5"
                title={has ? 'Edit' : 'Add log'}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              {has && (
                <button
                  onClick={() => deleteDay(cell)}
                  className="text-[#555] hover:text-red-400 p-0.5"
                  title="Delete this day's log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

