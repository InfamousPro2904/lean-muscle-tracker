'use client'

import { useState } from 'react'
import { X, Save } from 'lucide-react'
import type { Macros100g } from '@/lib/types'

export interface EditableFood {
  name:    string
  brand?:  string
  per100g: Macros100g
  grams:   number
}

interface Props {
  initial:  EditableFood
  /** When true, hide the grams field (used for templates where item grams are baseline) */
  showGrams?: boolean
  onClose:  () => void
  onSave:   (food: EditableFood) => void
}

/** Compact inline editor for a single food's name + per-100g macros + serving grams. */
export default function FoodItemEditor({ initial, showGrams = true, onClose, onSave }: Props) {
  const [name,    setName]    = useState(initial.name)
  const [kcal,    setKcal]    = useState(initial.per100g.kcal.toString())
  const [protein, setProtein] = useState(initial.per100g.protein.toString())
  const [carbs,   setCarbs]   = useState(initial.per100g.carbs.toString())
  const [fat,     setFat]     = useState(initial.per100g.fat.toString())
  const [grams,   setGrams]   = useState(initial.grams.toString())

  const save = () => {
    if (!name.trim()) return
    onSave({
      name:  name.trim(),
      brand: initial.brand,
      per100g: {
        kcal:    Number(kcal)    || 0,
        protein: Number(protein) || 0,
        carbs:   Number(carbs)   || 0,
        fat:     Number(fat)     || 0,
      },
      grams: Number(grams) || 100,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Edit food</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs text-[#666] mb-1.5 font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input text-sm"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">Calories / 100g</label>
            <input type="number" min={0} max={2000} value={kcal} onChange={e => setKcal(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">Protein / 100g (g)</label>
            <input type="number" min={0} max={200} step={0.1} value={protein} onChange={e => setProtein(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">Carbs / 100g (g)</label>
            <input type="number" min={0} max={200} step={0.1} value={carbs} onChange={e => setCarbs(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">Fat / 100g (g)</label>
            <input type="number" min={0} max={200} step={0.1} value={fat} onChange={e => setFat(e.target.value)} className="input text-sm" />
          </div>
        </div>

        {showGrams && (
          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">Serving size (g)</label>
            <input type="number" min={1} max={2000} value={grams} onChange={e => setGrams(e.target.value)} className="input text-sm" />
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={save}
            disabled={!name.trim()}
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
