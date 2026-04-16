'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  WorkoutRoutine, RoutineExercise, WorkoutLog, ExerciseLog,
  MUSCLE_GROUPS, SPLIT_TYPES, DAYS_OF_WEEK
} from '@/lib/types'
import {
  Dumbbell, Plus, Trash2, ChevronDown, ChevronUp,
  Clock, Calendar, ClipboardList, History, Save, X, Loader2,
  BookOpen, Check, Undo2, AlertTriangle
} from 'lucide-react'
import PresetPicker, { type PresetSelection } from '@/components/workouts/PresetPicker'

type Tab = 'routines' | 'log' | 'history'

interface ExerciseLogEntry {
  exercise_name: string
  muscle_group: string
  sets: { set_number: number; reps: number | null; weight_kg: number | null }[]
}

// ── Undo state ────────────────────────────────────────────────────
interface UndoPending {
  label: string
  countdown: number
  restore: () => void
  doDelete: () => Promise<void>
}

// ── PresetQueryReader reads URL params and fills exercise form ───
// Must be isolated here so it can be Suspense-wrapped
function PresetQueryReader({
  onPreset,
}: {
  onPreset: (name: string, muscle: string, sets: string, reps: string) => void
}) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const name = searchParams.get('addExercise')
    const muscle = searchParams.get('muscle') ?? 'Chest'
    const sets = searchParams.get('sets') ?? '3'
    const reps = searchParams.get('reps') ?? '10'
    if (name) {
      onPreset(name, muscle, sets, reps)
      window.history.replaceState({}, '', '/workouts')
    }
  }, [searchParams, onPreset])
  return null
}

export default function WorkoutsPage() {
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<Tab>('routines')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // ─── Routines State ───
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([])
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null)
  const [showCreateRoutine, setShowCreateRoutine] = useState(false)
  const [newRoutine, setNewRoutine] = useState({
    name: '', description: '', split_type: 'ppl', day_of_week: [] as number[]
  })
  const [addingExerciseTo, setAddingExerciseTo] = useState<string | null>(null)
  const [newExercise, setNewExercise] = useState({
    exercise_name: '', muscle_group: MUSCLE_GROUPS[0] as string,
    sets: 3, reps: '10', rest_seconds: 90, notes: ''
  })
  const [showPresetPicker, setShowPresetPicker] = useState(false)

  // ─── Log Workout State ───
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('')
  const [customWorkoutName, setCustomWorkoutName] = useState('')
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [logDuration, setLogDuration] = useState<number | ''>('')
  const [logNotes, setLogNotes] = useState('')
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseLogEntry[]>([])
  const [savingLog, setSavingLog] = useState(false)

  // ─── History State ───
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // ─── Delete confirmation + undo ───
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [undoPending, setUndoPending] = useState<UndoPending | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const undoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Auth ───
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
      setLoading(false)
    })
  }, [supabase.auth])

  // ─── Handle preset selection from URL params ───
  const handlePresetQuery = useCallback((name: string, muscle: string, sets: string, reps: string) => {
    setActiveTab('log')
    setNewExercise(prev => ({
      ...prev,
      exercise_name: name,
      muscle_group: muscle,
      sets: parseInt(sets) || 3,
      reps,
    }))
  }, [])

  // ─── Fetch Routines ───
  const fetchRoutines = useCallback(async () => {
    if (!userId) return
    const { data: routinesData } = await supabase
      .from('workout_routines')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (routinesData) {
      const routinesWithExercises = await Promise.all(
        routinesData.map(async (r) => {
          const { data: exercises } = await supabase
            .from('routine_exercises')
            .select('*')
            .eq('routine_id', r.id)
            .order('sort_order', { ascending: true })
          return { ...r, exercises: exercises || [] }
        })
      )
      setRoutines(routinesWithExercises)
    }
  }, [userId, supabase])

  // ─── Fetch History ───
  const fetchHistory = useCallback(async () => {
    if (!userId) return
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (logs) {
      const logsWithExercises = await Promise.all(
        logs.map(async (log) => {
          const { data: eLogs } = await supabase
            .from('exercise_logs')
            .select('*')
            .eq('workout_log_id', log.id)
            .order('set_number', { ascending: true })
          return { ...log, exercise_logs: eLogs || [] }
        })
      )
      setWorkoutLogs(logsWithExercises)
    }
  }, [userId, supabase])

  useEffect(() => {
    if (userId) { fetchRoutines(); fetchHistory() }
  }, [userId, fetchRoutines, fetchHistory])

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current)
  }, [])

  // ─── Undo helpers ───
  const clearUndoTimers = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current)
  }

  const scheduleDelete = (label: string, restore: () => void, doDelete: () => Promise<void>) => {
    clearUndoTimers()
    // flush any existing pending delete immediately
    if (undoPending) { undoPending.doDelete() }

    let cd = 5
    const pending: UndoPending = { label, countdown: cd, restore, doDelete }
    setUndoPending(pending)

    undoIntervalRef.current = setInterval(() => {
      cd -= 1
      setUndoPending(p => p ? { ...p, countdown: cd } : null)
      if (cd <= 0) clearInterval(undoIntervalRef.current!)
    }, 1000)

    undoTimerRef.current = setTimeout(async () => {
      clearInterval(undoIntervalRef.current!)
      await doDelete()
      setUndoPending(null)
    }, 5000)
  }

  const handleUndo = () => {
    if (!undoPending) return
    clearUndoTimers()
    undoPending.restore()
    setUndoPending(null)
  }

  // ─── Routine CRUD ───
  const createRoutine = async () => {
    if (!userId || !newRoutine.name.trim()) return
    await supabase.from('workout_routines').insert({
      user_id: userId,
      name: newRoutine.name,
      description: newRoutine.description || null,
      split_type: newRoutine.split_type,
      day_of_week: newRoutine.day_of_week,
      is_active: true,
    })
    setNewRoutine({ name: '', description: '', split_type: 'ppl', day_of_week: [] })
    setShowCreateRoutine(false)
    fetchRoutines()
  }

  /** Step 1: show inline confirm */
  const requestDelete = (id: string) => {
    setConfirmDeleteId(id)
  }

  /** Step 2a: user cancelled confirm */
  const cancelDelete = () => setConfirmDeleteId(null)

  /** Step 2b: user confirmed — optimistic remove + undo window */
  const confirmDeleteRoutine = (routine: WorkoutRoutine) => {
    setConfirmDeleteId(null)
    setRoutines(prev => prev.filter(r => r.id !== routine.id))
    if (expandedRoutine === routine.id) setExpandedRoutine(null)

    scheduleDelete(
      `"${routine.name}"`,
      () => setRoutines(prev => {
        const updated = [routine, ...prev.filter(r => r.id !== routine.id)]
        return updated.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }),
      async () => {
        await supabase.from('routine_exercises').delete().eq('routine_id', routine.id)
        await supabase.from('workout_routines').delete().eq('id', routine.id)
      }
    )
  }

  const addExercise = async (routineId: string) => {
    if (!newExercise.exercise_name.trim()) return
    const routine = routines.find(r => r.id === routineId)
    const sortOrder = (routine?.exercises?.length || 0) + 1

    await supabase.from('routine_exercises').insert({
      routine_id: routineId,
      exercise_name: newExercise.exercise_name,
      muscle_group: newExercise.muscle_group,
      sets: newExercise.sets,
      reps: newExercise.reps,
      rest_seconds: newExercise.rest_seconds,
      notes: newExercise.notes || null,
      sort_order: sortOrder,
    })
    setNewExercise({ exercise_name: '', muscle_group: MUSCLE_GROUPS[0], sets: 3, reps: '10', rest_seconds: 90, notes: '' })
    setAddingExerciseTo(null)
    fetchRoutines()
  }

  const confirmDeleteExercise = (exercise: RoutineExercise) => {
    setConfirmDeleteId(null)
    setRoutines(prev => prev.map(r =>
      r.id === exercise.routine_id
        ? { ...r, exercises: (r.exercises ?? []).filter(e => e.id !== exercise.id) }
        : r
    ))

    scheduleDelete(
      `"${exercise.exercise_name}"`,
      () => setRoutines(prev => prev.map(r =>
        r.id === exercise.routine_id
          ? { ...r, exercises: [...(r.exercises ?? []).filter(e => e.id !== exercise.id), exercise]
              .sort((a, b) => a.sort_order - b.sort_order) }
          : r
      )),
      async () => {
        await supabase.from('routine_exercises').delete().eq('id', exercise.id)
      }
    )
  }

  // ─── Log Workout Helpers ───
  const handleSelectRoutine = (routineId: string) => {
    setSelectedRoutineId(routineId)
    if (routineId) {
      const routine = routines.find(r => r.id === routineId)
      if (routine?.exercises) {
        setExerciseEntries(
          routine.exercises.map(ex => ({
            exercise_name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            sets: Array.from({ length: ex.sets }, (_, i) => ({
              set_number: i + 1,
              reps: parseInt(ex.reps) || null,
              weight_kg: null,
            })),
          }))
        )
        setCustomWorkoutName('')
      }
    } else {
      setExerciseEntries([])
    }
  }

  const addCustomExerciseEntry = () => {
    setExerciseEntries(prev => [
      ...prev,
      { exercise_name: '', muscle_group: MUSCLE_GROUPS[0], sets: [{ set_number: 1, reps: null, weight_kg: null }] },
    ])
  }

  const addSetToEntry = (entryIdx: number) => {
    setExerciseEntries(prev => prev.map((entry, i) =>
      i !== entryIdx ? entry : {
        ...entry,
        sets: [...entry.sets, { set_number: entry.sets.length + 1, reps: null, weight_kg: null }],
      }
    ))
  }

  const updateSetField = (entryIdx: number, setIdx: number, field: 'reps' | 'weight_kg', value: string) => {
    setExerciseEntries(prev => prev.map((entry, i) =>
      i !== entryIdx ? entry : {
        ...entry,
        sets: entry.sets.map((s, si) =>
          si === setIdx ? { ...s, [field]: value === '' ? null : Number(value) } : s
        ),
      }
    ))
  }

  const updateEntryField = (entryIdx: number, field: 'exercise_name' | 'muscle_group', value: string) => {
    setExerciseEntries(prev => prev.map((entry, i) =>
      i === entryIdx ? { ...entry, [field]: value } : entry
    ))
  }

  const removeExerciseEntry = (entryIdx: number) => {
    setExerciseEntries(prev => prev.filter((_, i) => i !== entryIdx))
  }

  const saveWorkoutLog = async () => {
    if (!userId || exerciseEntries.length === 0) return
    const workoutName = selectedRoutineId
      ? routines.find(r => r.id === selectedRoutineId)?.name || 'Workout'
      : customWorkoutName || 'Custom Workout'

    setSavingLog(true)
    const { data: logData, error: logError } = await supabase
      .from('workout_logs')
      .insert({
        user_id: userId,
        routine_id: selectedRoutineId || null,
        workout_name: workoutName,
        date: logDate,
        duration_minutes: logDuration || null,
        notes: logNotes || null,
      })
      .select()
      .single()

    if (logError || !logData) { setSavingLog(false); return }

    const exerciseLogsToInsert: Omit<ExerciseLog, 'id'>[] = []
    exerciseEntries.forEach(entry => {
      entry.sets.forEach(set => {
        exerciseLogsToInsert.push({
          workout_log_id: logData.id,
          exercise_name: entry.exercise_name,
          muscle_group: entry.muscle_group,
          set_number: set.set_number,
          reps: set.reps,
          weight_kg: set.weight_kg,
          notes: null,
        })
      })
    })

    await supabase.from('exercise_logs').insert(exerciseLogsToInsert)
    setSelectedRoutineId(''); setCustomWorkoutName('')
    setLogDate(new Date().toISOString().split('T')[0]); setLogDuration('')
    setLogNotes(''); setExerciseEntries([])
    setSavingLog(false); fetchHistory(); setActiveTab('history')
  }

  const confirmDeleteLog = (log: WorkoutLog) => {
    setConfirmDeleteId(null)
    setWorkoutLogs(prev => prev.filter(l => l.id !== log.id))
    if (expandedLog === log.id) setExpandedLog(null)

    scheduleDelete(
      `"${log.workout_name}"`,
      () => setWorkoutLogs(prev => {
        const updated = [log, ...prev.filter(l => l.id !== log.id)]
        return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }),
      async () => {
        await supabase.from('exercise_logs').delete().eq('workout_log_id', log.id)
        await supabase.from('workout_logs').delete().eq('id', log.id)
      }
    )
  }

  // ─── Preset picker callback ───
  const handlePresetSelect = (sel: PresetSelection, routineId: string) => {
    setShowPresetPicker(false)
    setNewExercise({
      exercise_name: sel.exercise_name,
      muscle_group: sel.muscle_group,
      sets: sel.sets,
      reps: sel.reps,
      rest_seconds: sel.rest_seconds,
      notes: sel.notes,
    })
    setAddingExerciseTo(routineId)
  }

  // ─── Day Toggle ───
  const toggleDay = (dayIdx: number) => {
    setNewRoutine(prev => ({
      ...prev,
      day_of_week: prev.day_of_week.includes(dayIdx)
        ? prev.day_of_week.filter(d => d !== dayIdx)
        : [...prev.day_of_week, dayIdx].sort(),
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* URL param reader — must be in Suspense per Next.js 16 */}
      <Suspense fallback={null}>
        <PresetQueryReader onPreset={handlePresetQuery} />
      </Suspense>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-blue-500/12 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Workouts</h1>
        </div>
        <p className="text-[#666] text-sm">Plan, log, and track your training</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'routines' as Tab, label: 'My Routines', icon: ClipboardList },
          { key: 'log' as Tab,      label: 'Log Workout',  icon: Dumbbell },
          { key: 'history' as Tab,  label: 'History',      icon: History },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={activeTab === key ? 'tab-active' : 'tab-inactive'}
          >
            <span className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ═══════════════════ TAB 1: MY ROUTINES ═══════════════════ */}
      {activeTab === 'routines' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateRoutine(!showCreateRoutine)}
              className="btn-primary flex items-center gap-2"
            >
              {showCreateRoutine ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateRoutine ? 'Cancel' : 'Create Routine'}
            </button>
          </div>

          {/* Create Routine Form */}
          {showCreateRoutine && (
            <div className="card space-y-4">
              <h3 className="text-lg font-semibold">New Routine</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#666] mb-1">Routine Name</label>
                  <input
                    className="input"
                    placeholder="e.g., Push Day A"
                    value={newRoutine.name}
                    onChange={e => setNewRoutine(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#666] mb-1">Split Type</label>
                  <select
                    className="select"
                    value={newRoutine.split_type}
                    onChange={e => setNewRoutine(p => ({ ...p, split_type: e.target.value }))}
                  >
                    {SPLIT_TYPES.map(st => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1">Description (optional)</label>
                <input
                  className="input"
                  placeholder="Quick description..."
                  value={newRoutine.description}
                  onChange={e => setNewRoutine(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-2">Scheduled Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                        newRoutine.day_of_week.includes(idx)
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#1a1a1a] text-[#666] hover:bg-[#222] border border-[#252525]'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={createRoutine} className="btn-primary">
                Save Routine
              </button>
            </div>
          )}

          {/* Empty state */}
          {routines.length === 0 && !showCreateRoutine && (
            <div className="card text-center py-12">
              <Dumbbell className="w-12 h-12 text-[#333] mx-auto mb-3" />
              <p className="text-[#555]">No routines yet. Create one to get started!</p>
            </div>
          )}

          {/* Routines List */}
          {routines.map(routine => (
            <div key={routine.id} className="card">
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{routine.name}</h3>
                    <span className="badge badge-blue">
                      {SPLIT_TYPES.find(s => s.value === routine.split_type)?.label || routine.split_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[#666]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {routine.day_of_week.map(d => DAYS_OF_WEEK[d]).join(', ') || 'No days set'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Dumbbell className="w-3.5 h-3.5" />
                      {routine.exercises?.length || 0} exercises
                    </span>
                  </div>
                </div>

                {/* Expand + Delete controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)}
                    className="text-[#555] hover:text-white p-1.5 rounded-lg hover:bg-[#1e1e1e] transition-all"
                  >
                    {expandedRoutine === routine.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {confirmDeleteId === routine.id ? (
                    <InlineConfirm
                      label="Delete routine?"
                      onConfirm={() => confirmDeleteRoutine(routine)}
                      onCancel={cancelDelete}
                    />
                  ) : (
                    <button
                      onClick={() => requestDelete(routine.id)}
                      className="text-[#555] hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/8 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Exercises */}
              {expandedRoutine === routine.id && (
                <div className="mt-4 pt-4 border-t border-[#1e1e1e] space-y-3">
                  {routine.exercises && routine.exercises.length > 0 ? (
                    routine.exercises.map((ex, idx) => (
                      <div key={ex.id} className="flex items-center justify-between bg-[#161616] border border-[#1e1e1e] rounded-xl px-4 py-3">
                        <div className="flex items-center gap-4">
                          <span className="text-[#444] text-sm font-mono w-6">{idx + 1}.</span>
                          <div>
                            <p className="font-medium text-sm">{ex.exercise_name}</p>
                            <p className="text-xs text-[#555] mt-0.5">
                              {ex.muscle_group} · {ex.sets} sets × {ex.reps} reps · {ex.rest_seconds}s rest
                            </p>
                          </div>
                        </div>
                        {confirmDeleteId === ex.id ? (
                          <InlineConfirm
                            label="Remove?"
                            onConfirm={() => confirmDeleteExercise(ex)}
                            onCancel={cancelDelete}
                          />
                        ) : (
                          <button
                            onClick={() => requestDelete(ex.id)}
                            className="text-[#444] hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/8 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[#555] text-sm">No exercises added yet.</p>
                  )}

                  {/* Add Exercise Form */}
                  {addingExerciseTo === routine.id ? (
                    <div className="bg-[#161616] border border-[#222] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[#ccc]">Add Exercise</h4>
                        <button
                          onClick={() => { setShowPresetPicker(true) }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-all border border-blue-500/20"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Browse Presets
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          className="input"
                          placeholder="Exercise name"
                          value={newExercise.exercise_name}
                          onChange={e => setNewExercise(p => ({ ...p, exercise_name: e.target.value }))}
                        />
                        <select
                          className="select"
                          value={newExercise.muscle_group}
                          onChange={e => setNewExercise(p => ({ ...p, muscle_group: e.target.value }))}
                        >
                          {MUSCLE_GROUPS.map(mg => (
                            <option key={mg} value={mg}>{mg}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-[#555] mb-1">Sets</label>
                          <input
                            type="number"
                            className="input"
                            value={newExercise.sets}
                            onChange={e => setNewExercise(p => ({ ...p, sets: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#555] mb-1">Reps</label>
                          <input
                            className="input"
                            placeholder="e.g., 8–12"
                            value={newExercise.reps}
                            onChange={e => setNewExercise(p => ({ ...p, reps: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#555] mb-1">Rest (sec)</label>
                          <input
                            type="number"
                            className="input"
                            value={newExercise.rest_seconds}
                            onChange={e => setNewExercise(p => ({ ...p, rest_seconds: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                      {newExercise.notes && (
                        <input
                          className="input text-xs text-[#888]"
                          placeholder="Notes (from preset)"
                          value={newExercise.notes}
                          onChange={e => setNewExercise(p => ({ ...p, notes: e.target.value }))}
                        />
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => addExercise(routine.id)} className="btn-primary text-sm">
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingExerciseTo(null); setNewExercise({ exercise_name: '', muscle_group: MUSCLE_GROUPS[0], sets: 3, reps: '10', rest_seconds: 90, notes: '' }) }}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAddingExerciseTo(routine.id)}
                        className="btn-secondary flex items-center gap-2 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>
                      <button
                        onClick={() => { setAddingExerciseTo(routine.id); setShowPresetPicker(true) }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/8 text-blue-400 hover:bg-blue-500/15 text-sm font-medium transition-all border border-blue-500/15"
                      >
                        <BookOpen className="w-4 h-4" />
                        From Presets
                      </button>
                    </div>
                  )}

                  {/* Preset picker modal */}
                  {showPresetPicker && addingExerciseTo === routine.id && (
                    <PresetPicker
                      onSelect={sel => handlePresetSelect(sel, routine.id)}
                      onClose={() => setShowPresetPicker(false)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════ TAB 2: LOG WORKOUT ═══════════════════ */}
      {activeTab === 'log' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold">Log a Workout</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#666] mb-1">Select Routine</label>
                <select
                  className="select"
                  value={selectedRoutineId}
                  onChange={e => handleSelectRoutine(e.target.value)}
                >
                  <option value="">-- Custom Workout --</option>
                  {routines.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              {!selectedRoutineId && (
                <div>
                  <label className="block text-sm text-[#666] mb-1">Workout Name</label>
                  <input
                    className="input"
                    placeholder="e.g., Morning Push Session"
                    value={customWorkoutName}
                    onChange={e => setCustomWorkoutName(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#666] mb-1">Date</label>
                <input type="date" className="input" value={logDate} onChange={e => setLogDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g., 60"
                  value={logDuration}
                  onChange={e => setLogDuration(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1">Notes (optional)</label>
                <input
                  className="input"
                  placeholder="How did it go?"
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Exercise Entries */}
          {exerciseEntries.map((entry, entryIdx) => (
            <div key={entryIdx} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {!selectedRoutineId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                      <input
                        className="input"
                        placeholder="Exercise name"
                        value={entry.exercise_name}
                        onChange={e => updateEntryField(entryIdx, 'exercise_name', e.target.value)}
                      />
                      <select
                        className="select"
                        value={entry.muscle_group}
                        onChange={e => updateEntryField(entryIdx, 'muscle_group', e.target.value)}
                      >
                        {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">{entry.exercise_name}</p>
                      <p className="text-sm text-[#555]">{entry.muscle_group}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeExerciseEntry(entryIdx)}
                  className="text-[#444] hover:text-red-400 p-1.5 ml-2 rounded-lg hover:bg-red-500/8 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sets Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-[50px_1fr_1fr_40px] gap-2 text-xs text-[#555] px-1">
                  <span>Set</span><span>Reps</span><span>Weight (kg)</span><span />
                </div>
                {entry.sets.map((set, setIdx) => (
                  <div key={setIdx} className="grid grid-cols-[50px_1fr_1fr_40px] gap-2 items-center">
                    <span className="text-sm text-[#555] text-center">{set.set_number}</span>
                    <input
                      type="number"
                      className="input text-sm"
                      placeholder="Reps"
                      value={set.reps ?? ''}
                      onChange={e => updateSetField(entryIdx, setIdx, 'reps', e.target.value)}
                    />
                    <input
                      type="number"
                      className="input text-sm"
                      placeholder="kg"
                      value={set.weight_kg ?? ''}
                      onChange={e => updateSetField(entryIdx, setIdx, 'weight_kg', e.target.value)}
                    />
                    <button
                      onClick={() => setExerciseEntries(prev => prev.map((en, i) =>
                        i !== entryIdx ? en : {
                          ...en,
                          sets: en.sets.filter((_, si) => si !== setIdx)
                            .map((s, si) => ({ ...s, set_number: si + 1 }))
                        }
                      ))}
                      className="text-[#444] hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSetToEntry(entryIdx)}
                  className="text-sm text-blue-500 hover:text-blue-400 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Set
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={addCustomExerciseEntry} className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Exercise
            </button>
            <button
              onClick={saveWorkoutLog}
              disabled={savingLog || exerciseEntries.length === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Workout
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ TAB 3: HISTORY ═══════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {workoutLogs.length === 0 ? (
            <div className="card text-center py-12">
              <History className="w-12 h-12 text-[#333] mx-auto mb-3" />
              <p className="text-[#555]">No workouts logged yet. Hit the gym and come back!</p>
            </div>
          ) : (
            workoutLogs.map(log => (
              <div key={log.id} className="card">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{log.workout_name}</h3>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-[#666]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(log.date).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </span>
                      {log.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />{log.duration_minutes} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5" />
                        {new Set(log.exercise_logs?.map(e => e.exercise_name)).size || 0} exercises
                      </span>
                    </div>
                    {log.notes && <p className="text-sm text-[#555] mt-1">{log.notes}</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="text-[#555] hover:text-white p-1.5 rounded-lg hover:bg-[#1e1e1e] transition-all"
                    >
                      {expandedLog === log.id
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {confirmDeleteId === log.id ? (
                      <InlineConfirm
                        label="Delete log?"
                        onConfirm={() => confirmDeleteLog(log)}
                        onCancel={cancelDelete}
                      />
                    ) : (
                      <button
                        onClick={() => requestDelete(log.id)}
                        className="text-[#555] hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/8 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {expandedLog === log.id && log.exercise_logs && (
                  <div className="mt-4 pt-4 border-t border-[#1e1e1e] space-y-3">
                    {(() => {
                      const grouped: Record<string, ExerciseLog[]> = {}
                      log.exercise_logs.forEach(el => {
                        if (!grouped[el.exercise_name]) grouped[el.exercise_name] = []
                        grouped[el.exercise_name].push(el)
                      })
                      return Object.entries(grouped).map(([name, sets]) => (
                        <div key={name} className="bg-[#161616] border border-[#1e1e1e] rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{name}</p>
                            <span className="badge badge-blue">{sets[0]?.muscle_group}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-[#555] mb-1">
                            <span>Set</span><span>Reps</span><span>Weight</span>
                          </div>
                          {sets.map(s => (
                            <div key={s.id} className="grid grid-cols-3 gap-2 text-sm py-0.5">
                              <span className="text-[#666]">{s.set_number}</span>
                              <span>{s.reps ?? '–'}</span>
                              <span>{s.weight_kg != null ? `${s.weight_kg} kg` : '–'}</span>
                            </div>
                          ))}
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════ UNDO TOAST ═══════════════════ */}
      {undoPending && (
        <UndoToast
          label={undoPending.label}
          countdown={undoPending.countdown}
          onUndo={handleUndo}
        />
      )}
    </div>
  )
}

// ── Inline confirm UI ─────────────────────────────────────────────
function InlineConfirm({
  label,
  onConfirm,
  onCancel,
}: {
  label: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-1.5 pl-1">
      <span className="text-xs text-red-400 flex items-center gap-1 whitespace-nowrap">
        <AlertTriangle className="w-3 h-3" />
        {label}
      </span>
      <button
        onClick={onConfirm}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-semibold transition-all"
      >
        <Check className="w-3 h-3" />
        Yes
      </button>
      <button
        onClick={onCancel}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1e1e1e] text-[#777] hover:text-white text-xs transition-all"
      >
        <X className="w-3 h-3" />
        No
      </button>
    </div>
  )
}

// ── Undo toast ────────────────────────────────────────────────────
function UndoToast({
  label,
  countdown,
  onUndo,
}: {
  label: string
  countdown: number
  onUndo: () => void
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:left-auto md:translate-x-0 md:right-6">
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden min-w-[300px] max-w-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Trash2 className="w-4 h-4 text-[#555] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">Deleted {label}</p>
            <p className="text-xs text-[#555]">Undoing in {countdown}s…</p>
          </div>
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 text-sm font-semibold transition-all border border-blue-500/20 shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
        {/* Countdown progress bar */}
        <div className="h-0.5 bg-[#252525]">
          <div
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
