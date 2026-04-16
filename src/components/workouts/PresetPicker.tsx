'use client'

import { useState } from 'react'
import { MUSCLE_GROUPS as PRESET_GROUPS } from '@/lib/exercise-presets'
import type { ExerciseEntry, ExerciseVariant } from '@/lib/exercise-presets'
import { X, ChevronRight, Dumbbell } from 'lucide-react'

// Maps preset group IDs to the MUSCLE_GROUPS strings used in workout routines
const PRESET_TO_WORKOUT_MUSCLE: Record<string, string> = {
  chest:       'Chest',
  back:        'Back',
  shoulders:   'Shoulders',
  biceps:      'Biceps',
  triceps:     'Triceps',
  quadriceps:  'Quads',
  hamstrings:  'Hamstrings',
  glutes:      'Glutes',
  calves:      'Calves',
  core_abs:    'Abs',
}

export interface PresetSelection {
  exercise_name: string
  muscle_group: string
  sets: number
  reps: string
  rest_seconds: number
  notes: string
}

interface Props {
  onSelect: (selection: PresetSelection) => void
  onClose: () => void
}

type EquipmentKey = 'machine' | 'free_weight' | 'bodyweight'

const EQUIPMENT_LABELS: Record<EquipmentKey, string> = {
  machine: 'Machine',
  free_weight: 'Free Weight',
  bodyweight: 'Bodyweight',
}

export default function PresetPicker({ onSelect, onClose }: Props) {
  const [activeGroup, setActiveGroup] = useState(PRESET_GROUPS[0].id)
  const [activeExercise, setActiveExercise] = useState<string | null>(null)

  const group = PRESET_GROUPS.find(g => g.id === activeGroup)!

  const handleVariantSelect = (entry: ExerciseEntry, variantKey: EquipmentKey, variant: ExerciseVariant) => {
    const parseSets = (s: string) => {
      const m = s.match(/\d+/)
      return m ? parseInt(m[0]) : 3
    }
    const parseRest = (s: string) => {
      const m = s.match(/\d+/)
      return m ? parseInt(m[0]) : 90
    }

    onSelect({
      exercise_name: variant.name,
      muscle_group: PRESET_TO_WORKOUT_MUSCLE[activeGroup] ?? 'Full Body',
      sets: parseSets(variant.sets),
      reps: variant.reps,
      rest_seconds: parseRest(variant.rest_seconds),
      notes: `Tempo: ${variant.tempo} | ${entry.emg_note ?? ''}`.replace(' | ', entry.emg_note ? ' | ' : '').trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#262626] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/12 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-semibold text-sm">Browse Exercise Presets</h2>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Muscle group tabs */}
        <div className="px-4 py-3 border-b border-[#1a1a1a] shrink-0 overflow-x-auto">
          <div className="flex gap-1.5 w-max">
            {PRESET_GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => { setActiveGroup(g.id); setActiveExercise(null) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  activeGroup === g.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-[#1a1a1a] text-[#666] hover:text-white border border-[#252525]'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {group.exercises.map(entry => {
            const isOpen = activeExercise === entry.key
            const variants = (
              ['machine', 'free_weight', 'bodyweight'] as EquipmentKey[]
            ).filter(k => entry[k as keyof ExerciseEntry] != null)

            return (
              <div key={entry.key} className="bg-[#161616] border border-[#222] rounded-xl overflow-hidden">
                {/* Exercise row */}
                <button
                  onClick={() => setActiveExercise(isOpen ? null : entry.key)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1c1c1c] transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{entry.label}</p>
                    {entry.emg_note && (
                      <p className="text-xs text-amber-400/70 mt-0.5 truncate max-w-xs">{entry.emg_note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-1">
                      {variants.map(k => (
                        <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">
                          {EQUIPMENT_LABELS[k].split(' ')[0]}
                        </span>
                      ))}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-[#444] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Variants */}
                {isOpen && (
                  <div className="border-t border-[#1e1e1e] divide-y divide-[#1a1a1a]">
                    {variants.map(k => {
                      const v = entry[k as keyof ExerciseEntry] as ExerciseVariant
                      return (
                        <button
                          key={k}
                          onClick={() => handleVariantSelect(entry, k, v)}
                          className="w-full flex items-start justify-between px-4 py-3 hover:bg-blue-500/8 transition-colors group text-left"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/12 text-blue-400 font-medium">
                                {EQUIPMENT_LABELS[k]}
                              </span>
                            </div>
                            <p className="text-sm text-[#ccc] leading-snug">{v.name}</p>
                          </div>
                          <div className="flex gap-3 text-right shrink-0">
                            <div>
                              <p className="text-[10px] text-[#555]">Sets</p>
                              <p className="text-xs font-semibold text-white">{v.sets}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[#555]">Reps</p>
                              <p className="text-xs font-semibold text-white">{v.reps}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[#555]">Rest</p>
                              <p className="text-xs font-semibold text-white">{v.rest_seconds}s</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-5 py-3 border-t border-[#1a1a1a] shrink-0">
          <p className="text-xs text-[#555]">
            Click any variant to add it to the routine — values are pre-filled but editable.
          </p>
        </div>
      </div>
    </div>
  )
}
