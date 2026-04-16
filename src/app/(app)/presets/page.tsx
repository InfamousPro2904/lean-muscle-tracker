'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MUSCLE_GROUPS, KEY_EVIDENCE, type MuscleGroup, type ExerciseEntry, type EquipmentType } from '@/lib/exercise-presets'
import MuscleDiagram from '@/components/MuscleDiagram'
import MotionCue from '@/components/MotionCue'
import {
  BookOpen, ChevronDown, ChevronUp, Info, Zap,
  Clock, RotateCcw, Dumbbell, Activity, Plus
} from 'lucide-react'

type Equipment = 'all' | 'machine' | 'free_weight' | 'bodyweight'

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'all', label: 'All Equipment' },
  { value: 'machine', label: 'Machine' },
  { value: 'free_weight', label: 'Free Weight' },
  { value: 'bodyweight', label: 'Bodyweight' },
]

const CATEGORY_COLORS: Record<string, string> = {
  chest: 'text-rose-400',
  back: 'text-teal-400',
  shoulders: 'text-purple-400',
  biceps: 'text-blue-400',
  triceps: 'text-indigo-400',
  quadriceps: 'text-amber-400',
  hamstrings: 'text-orange-400',
  glutes: 'text-pink-400',
  calves: 'text-cyan-400',
  core_abs: 'text-emerald-400',
}

export default function PresetsPage() {
  const [activeMuscle, setActiveMuscle] = useState<string>(MUSCLE_GROUPS[0].id)
  const [equipment, setEquipment] = useState<Equipment>('all')
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [showEvidence, setShowEvidence] = useState(false)

  const group = MUSCLE_GROUPS.find(g => g.id === activeMuscle)!

  const toggleExercise = (key: string) => {
    setExpandedExercise(prev => (prev === key ? null : key))
  }

  // Determine which muscle regions to highlight for the diagram
  const diagramFront = group.front_regions
  const diagramBack = group.back_regions

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/12 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Exercise Presets</h1>
          </div>
          <p className="text-[#666] text-sm">
            Evidence-based exercise library — EMG-verified cues, optimal sets/reps, and equipment alternatives.
          </p>
        </div>
        <button
          onClick={() => setShowEvidence(!showEvidence)}
          className="btn-secondary flex items-center gap-2 text-sm shrink-0"
        >
          <Info className="w-4 h-4 text-amber-400" />
          Research
          {showEvidence ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Evidence panel */}
      {showEvidence && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-sm text-amber-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Key Evidence Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {KEY_EVIDENCE.map(ev => (
              <div key={ev.key} className="bg-[#161616] border border-[#252525] rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-white">{ev.title}</p>
                <p className="text-xs text-[#888] leading-relaxed">{ev.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Muscle group tabs */}
      <div className="flex flex-wrap gap-2">
        {MUSCLE_GROUPS.map(g => (
          <button
            key={g.id}
            onClick={() => { setActiveMuscle(g.id); setExpandedExercise(null) }}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
              activeMuscle === g.id
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-[#161616] text-[#666] hover:text-white hover:bg-[#1e1e1e] border border-[#252525]'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Left: exercises */}
        <div className="space-y-4">
          {/* Group header */}
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-lg font-bold mb-1 ${CATEGORY_COLORS[group.id] ?? 'text-white'}`}>
                  {group.label}
                </h2>
                <p className="text-xs text-[#777] leading-relaxed max-w-xl">{group.anatomy_note}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-[#555] mb-0.5">Weekly Volume</p>
                <p className="text-sm font-semibold text-white">{group.volume_optimal} sets</p>
                <p className="text-xs text-[#555]">min {group.volume_min}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#1e1e1e]">
              <p className="text-[11px] text-[#555]">
                <span className="text-[#666] font-medium">Source:</span> {group.emg_source}
              </p>
            </div>
          </div>

          {/* Equipment filter */}
          <div className="flex gap-2">
            {EQUIPMENT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setEquipment(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  equipment === opt.value
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'bg-[#161616] text-[#555] hover:text-white border border-[#222]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Exercise cards */}
          {group.exercises.map(entry => (
            <ExerciseCard
              key={entry.key}
              entry={entry}
              equipment={equipment}
              expanded={expandedExercise === entry.key}
              onToggle={() => toggleExercise(entry.key)}
              muscleId={group.id}
            />
          ))}
        </div>

        {/* Right: muscle diagram + volume info */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <div className="card">
            <p className="section-label">Targeted Muscles</p>
            <MuscleDiagram
              activeGroups={[...diagramFront, ...diagramBack]}
              className="py-2"
            />
          </div>

          <div className="card space-y-3">
            <p className="section-label">Volume Targets</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#666]">Minimum</span>
                <span className="text-sm font-medium">{group.volume_min} sets/wk</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#666]">Optimal</span>
                <span className="text-sm font-semibold text-blue-400">{group.volume_optimal} sets/wk</span>
              </div>
              <div className="h-px bg-[#1e1e1e] my-2" />
              <p className="text-xs text-[#666] leading-relaxed">{group.volume_note}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Exercise Card ──────────────────────────────────────────────────

function ExerciseCard({
  entry,
  equipment,
  expanded,
  onToggle,
  muscleId,
}: {
  entry: ExerciseEntry
  equipment: Equipment
  expanded: boolean
  onToggle: () => void
  muscleId: string
}) {
  const variants: { key: string; label: string; variant: NonNullable<ExerciseEntry['machine']> }[] = []

  if (equipment === 'all' || equipment === 'machine') {
    if (entry.machine) variants.push({ key: 'machine', label: 'Machine', variant: entry.machine })
  }
  if (equipment === 'all' || equipment === 'free_weight') {
    if (entry.free_weight) variants.push({ key: 'free_weight', label: 'Free Weight', variant: entry.free_weight })
  }
  if (equipment === 'all' || equipment === 'bodyweight') {
    if (entry.bodyweight) variants.push({ key: 'bodyweight', label: 'Bodyweight', variant: entry.bodyweight })
  }

  if (variants.length === 0) {
    return (
      <div className="card-hover border-dashed">
        <p className="text-sm text-[#555] text-center">{entry.label} — no {equipment} variant available</p>
      </div>
    )
  }

  const [activeVariant, setActiveVariant] = useState(variants[0].key)
  const current = variants.find(v => v.key === activeVariant)?.variant ?? variants[0].variant

  const router = useRouter()

  const handleAddToWorkout = () => {
    // Mapping from preset muscle group IDs to workout muscle group strings
    const MUSCLE_MAP: Record<string, string> = {
      chest: 'Chest', back: 'Back', shoulders: 'Shoulders',
      biceps: 'Biceps', triceps: 'Triceps', quadriceps: 'Quads',
      hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', core_abs: 'Abs',
    }
    const params = new URLSearchParams({
      addExercise: current.name,
      muscle: MUSCLE_MAP[muscleId] ?? 'Chest',
      sets: current.sets.includes('–') ? current.sets.split('–')[0] : current.sets,
      reps: current.reps.includes('–') ? current.reps.split('–')[1] : current.reps,
    })
    router.push(`/workouts?${params.toString()}`)
  }

  return (
    <div className="card-hover overflow-hidden">
      {/* Card header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm text-white truncate">{entry.label}</h3>
            {entry.emg_note && (
              <span className="badge badge-amber shrink-0">EMG verified</span>
            )}
          </div>
          <p className="text-xs text-[#666] truncate">{current.name}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#555] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#555] shrink-0" />}
      </button>

      {/* Quick stats always visible */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-[#1a1a1a]">
        <Stat icon={<Activity className="w-3 h-3" />} label="Sets" value={current.sets} />
        <Stat icon={<Dumbbell className="w-3 h-3" />} label="Reps" value={current.reps} />
        <Stat icon={<Clock className="w-3 h-3" />} label="Rest" value={`${current.rest_seconds}s`} />
        <Stat icon={<RotateCcw className="w-3 h-3" />} label="Tempo" value={current.tempo} />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Variant switcher */}
          {variants.length > 1 && (
            <div className="flex gap-2">
              {variants.map(v => (
                <button
                  key={v.key}
                  onClick={() => setActiveVariant(v.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeVariant === v.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-[#1a1a1a] text-[#666] hover:text-white border border-[#252525]'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          {/* Motion cue + exercise name */}
          <div className="flex items-center gap-4 bg-[#0e0e0e] rounded-xl p-4">
            <MotionCue motion={current.motion} name={current.name} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white leading-snug">{current.name}</p>
              {entry.emg_note && (
                <p className="text-xs text-amber-400/80 mt-1 leading-relaxed">{entry.emg_note}</p>
              )}
            </div>
          </div>

          {/* Coaching cues */}
          <div className="space-y-2">
            <p className="section-label">Coaching Cues</p>
            {current.cues.map((cue, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </span>
                <p className="text-sm text-[#aaa] leading-relaxed">{cue}</p>
              </div>
            ))}
          </div>

          {/* Add to workout */}
          <button
            onClick={handleAddToWorkout}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm mt-2"
          >
            <Plus className="w-4 h-4" />
            Add to Workout
          </button>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-[#555]">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}
