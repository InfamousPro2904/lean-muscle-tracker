'use client'

import { useState } from 'react'
import { X, Save, Loader2, Edit3, Trash2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { MealTemplate, TemplateItem } from '@/lib/types'
import { MEAL_TYPES } from '@/lib/types'
import FoodItemEditor, { type EditableFood } from './FoodItemEditor'

interface Props {
  template: MealTemplate
  onClose:   () => void
  onSaved:   () => void
}

function fmt(n: number): string {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? r.toString() : r.toFixed(1)
}

export default function TemplateEditorModal({ template, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [name,        setName]        = useState(template.name)
  const [mealType,    setMealType]    = useState(template.default_meal_type ?? '')
  const [items,       setItems]       = useState<TemplateItem[]>(template.items)
  const [editingIdx,  setEditingIdx]  = useState<number | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const totals = items.reduce((t, it) => {
    const s = it.grams / 100
    return {
      kcal:    t.kcal    + it.per_100g.kcal    * s,
      protein: t.protein + it.per_100g.protein * s,
      carbs:   t.carbs   + it.per_100g.carbs   * s,
      fat:     t.fat     + it.per_100g.fat     * s,
    }
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  const updateItem = (idx: number, food: EditableFood) => {
    setItems(prev => prev.map((it, i) =>
      i === idx
        ? { food_name: food.name, grams: food.grams, per_100g: food.per100g }
        : it
    ))
    setEditingIdx(null)
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('meal_templates')
        .update({
          name:              name.trim(),
          default_meal_type: mealType || null,
          items,
        })
        .eq('id', template.id)
      if (err) throw err
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Edit Template</h2>
            <button onClick={onClose} className="text-[#555] hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">Template name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">Default meal type</label>
            <select
              value={mealType}
              onChange={e => setMealType(e.target.value)}
              className="select text-sm"
            >
              <option value="">— None —</option>
              {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">
              Items ({items.length})
            </label>
            {items.length === 0 ? (
              <p className="text-xs text-[#555] py-2">No items left in template.</p>
            ) : (
              <div className="space-y-1.5">
                {items.map((it, idx) => {
                  const s = it.grams / 100
                  return (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#161616] border border-[#222]">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{it.food_name}</p>
                        <p className="text-[10px] text-[#555]">
                          {it.grams}g · {Math.round(it.per_100g.kcal * s)} kcal · P {fmt(it.per_100g.protein * s)}g · C {fmt(it.per_100g.carbs * s)}g · F {fmt(it.per_100g.fat * s)}g
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingIdx(idx)}
                        className="text-[#555] hover:text-blue-400 p-1"
                        title="Edit item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-[#555] hover:text-red-400 p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="flex gap-3 text-xs text-center pt-3 border-t border-[#1a1a1a]">
            <div className="flex-1">
              <p className="font-bold text-base text-orange-400">{Math.round(totals.kcal)}</p>
              <p className="text-[10px] text-[#444]">kcal</p>
            </div>
            <div className="flex-1">
              <p className="font-bold text-base text-blue-400">{fmt(totals.protein)}g</p>
              <p className="text-[10px] text-[#444]">Protein</p>
            </div>
            <div className="flex-1">
              <p className="font-bold text-base text-yellow-400">{fmt(totals.carbs)}g</p>
              <p className="text-[10px] text-[#444]">Carbs</p>
            </div>
            <div className="flex-1">
              <p className="font-bold text-base text-red-400">{fmt(totals.fat)}g</p>
              <p className="text-[10px] text-[#444]">Fat</p>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Template
            </button>
          </div>
        </div>
      </div>

      {editingIdx !== null && (
        <FoodItemEditor
          initial={{
            name:    items[editingIdx].food_name,
            per100g: items[editingIdx].per_100g,
            grams:   items[editingIdx].grams,
          }}
          showGrams
          onClose={() => setEditingIdx(null)}
          onSave={(food) => updateItem(editingIdx, food)}
        />
      )}
    </>
  )
}
