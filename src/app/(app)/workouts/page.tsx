'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  WorkoutRoutine, RoutineExercise, WorkoutLog, ExerciseLog,
  MUSCLE_GROUPS, SPLIT_TYPES, DAYS_OF_WEEK
} from '@/lib/types'
import {
  Dumbbell, Plus, Trash2, ChevronDown, ChevronUp,
  Clock, Calendar, ClipboardList, History, Save, X, Loader2
} from 'lucide-react'

type Tab = 'routines' | 'log' | 'history'

interface ExerciseLogEntry {
  exercise_name: string
  muscle_group: string
  sets: { set_number: number; reps: number | null; weight_kg: number | null }[]
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
    exercise_name: '', muscle_group: MUSCLE_GROUPS[0] as string, sets: 3, reps: '10', rest_seconds: 90, notes: ''
  })

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

  // ─── Auth ───
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      setLoading(false)
    }
    getUser()
  }, [supabase.auth])

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
    if (userId) {
      fetchRoutines()
      fetchHistory()
    }
  }, [userId, fetchRoutines, fetchHistory])

  // ─── Routine CRUD ───
  const createRoutine = async () => {
    if (!userId || !newRoutine.name.trim()) return
    const { error } = await supabase.from('workout_routines').insert({
      user_id: userId,
      name: newRoutine.name,
      description: newRoutine.description || null,
      split_type: newRoutine.split_type,
      day_of_week: newRoutine.day_of_week,
      is_active: true,
    })
    if (!error) {
      setNewRoutine({ name: '', description: '', split_type: 'ppl', day_of_week: [] })
      setShowCreateRoutine(false)
      fetchRoutines()
    }
  }

  const deleteRoutine = async (routineId: string) => {
    await supabase.from('routine_exercises').delete().eq('routine_id', routineId)
    await supabase.from('workout_routines').delete().eq('id', routineId)
    fetchRoutines()
  }

  const addExercise = async (routineId: string) => {
    if (!newExercise.exercise_name.trim()) return
    const routine = routines.find(r => r.id === routineId)
    const sortOrder = (routine?.exercises?.length || 0) + 1

    const { error } = await supabase.from('routine_exercises').insert({
      routine_id: routineId,
      exercise_name: newExercise.exercise_name,
      muscle_group: newExercise.muscle_group,
      sets: newExercise.sets,
      reps: newExercise.reps,
      rest_seconds: newExercise.rest_seconds,
      notes: newExercise.notes || null,
      sort_order: sortOrder,
    })
    if (!error) {
      setNewExercise({ exercise_name: '', muscle_group: MUSCLE_GROUPS[0], sets: 3, reps: '10', rest_seconds: 90, notes: '' })
      setAddingExerciseTo(null)
      fetchRoutines()
    }
  }

  const deleteExercise = async (exerciseId: string) => {
    await supabase.from('routine_exercises').delete().eq('id', exerciseId)
    fetchRoutines()
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
      {
        exercise_name: '',
        muscle_group: MUSCLE_GROUPS[0],
        sets: [{ set_number: 1, reps: null, weight_kg: null }],
      },
    ])
  }

  const addSetToEntry = (entryIdx: number) => {
    setExerciseEntries(prev => prev.map((entry, i) => {
      if (i !== entryIdx) return entry
      return {
        ...entry,
        sets: [...entry.sets, { set_number: entry.sets.length + 1, reps: null, weight_kg: null }],
      }
    }))
  }

  const updateSetField = (entryIdx: number, setIdx: number, field: 'reps' | 'weight_kg', value: string) => {
    setExerciseEntries(prev => prev.map((entry, i) => {
      if (i !== entryIdx) return entry
      return {
        ...entry,
        sets: entry.sets.map((s, si) =>
          si === setIdx ? { ...s, [field]: value === '' ? null : Number(value) } : s
        ),
      }
    }))
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
    if (!userId) return
    const workoutName = selectedRoutineId
      ? routines.find(r => r.id === selectedRoutineId)?.name || 'Workout'
      : customWorkoutName || 'Custom Workout'

    if (exerciseEntries.length === 0) return

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

    if (logError || !logData) {
      setSavingLog(false)
      return
    }

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

    // Reset form
    setSelectedRoutineId('')
    setCustomWorkoutName('')
    setLogDate(new Date().toISOString().split('T')[0])
    setLogDuration('')
    setLogNotes('')
    setExerciseEntries([])
    setSavingLog(false)
    fetchHistory()
    setActiveTab('history')
  }

  const deleteWorkoutLog = async (logId: string) => {
    await supabase.from('exercise_logs').delete().eq('workout_log_id', logId)
    await supabase.from('workout_logs').delete().eq('id', logId)
    fetchHistory()
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
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Dumbbell className="w-7 h-7 text-green-500" />
            Workouts
          </h1>
          <p className="text-gray-500 mt-1">Plan, log, and track your training</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'routines' as Tab, label: 'My Routines', icon: ClipboardList },
          { key: 'log' as Tab, label: 'Log Workout', icon: Dumbbell },
          { key: 'history' as Tab, label: 'Workout History', icon: History },
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
                  <label className="block text-sm text-gray-400 mb-1">Routine Name</label>
                  <input
                    className="input"
                    placeholder="e.g., Push Day A"
                    value={newRoutine.name}
                    onChange={e => setNewRoutine(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Split Type</label>
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
                <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                <input
                  className="input"
                  placeholder="Quick description..."
                  value={newRoutine.description}
                  onChange={e => setNewRoutine(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Scheduled Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        newRoutine.day_of_week.includes(idx)
                          ? 'bg-green-500 text-black'
                          : 'bg-[#262626] text-gray-400 hover:bg-[#333]'
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

          {/* Routines List */}
          {routines.length === 0 && !showCreateRoutine && (
            <div className="card text-center py-12">
              <Dumbbell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No routines yet. Create one to get started!</p>
            </div>
          )}

          {routines.map(routine => (
            <div key={routine.id} className="card">
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{routine.name}</h3>
                    <span className="badge-green">
                      {SPLIT_TYPES.find(s => s.value === routine.split_type)?.label || routine.split_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)}
                    className="text-gray-500 hover:text-white p-1"
                  >
                    {expandedRoutine === routine.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => deleteRoutine(routine.id)}
                    className="text-gray-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Exercises */}
              {expandedRoutine === routine.id && (
                <div className="mt-4 pt-4 border-t border-[#262626] space-y-3">
                  {routine.exercises && routine.exercises.length > 0 ? (
                    routine.exercises.map((ex, idx) => (
                      <div key={ex.id} className="flex items-center justify-between bg-[#1a1a1a] rounded-lg px-4 py-3">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600 text-sm font-mono w-6">{idx + 1}.</span>
                          <div>
                            <p className="font-medium">{ex.exercise_name}</p>
                            <p className="text-sm text-gray-500">
                              {ex.muscle_group} &middot; {ex.sets} sets x {ex.reps} reps &middot; {ex.rest_seconds}s rest
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteExercise(ex.id)}
                          className="text-gray-600 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No exercises added yet.</p>
                  )}

                  {/* Add Exercise Form */}
                  {addingExerciseTo === routine.id ? (
                    <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-300">Add Exercise</h4>
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
                          <label className="block text-xs text-gray-500 mb-1">Sets</label>
                          <input
                            type="number"
                            className="input"
                            value={newExercise.sets}
                            onChange={e => setNewExercise(p => ({ ...p, sets: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Reps</label>
                          <input
                            className="input"
                            placeholder="e.g., 8-12"
                            value={newExercise.reps}
                            onChange={e => setNewExercise(p => ({ ...p, reps: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Rest (sec)</label>
                          <input
                            type="number"
                            className="input"
                            value={newExercise.rest_seconds}
                            onChange={e => setNewExercise(p => ({ ...p, rest_seconds: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => addExercise(routine.id)} className="btn-primary text-sm">
                          Add
                        </button>
                        <button onClick={() => setAddingExerciseTo(null)} className="btn-secondary text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingExerciseTo(routine.id)}
                      className="btn-secondary flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Exercise
                    </button>
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
                <label className="block text-sm text-gray-400 mb-1">Select Routine</label>
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
                  <label className="block text-sm text-gray-400 mb-1">Workout Name</label>
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
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  className="input"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g., 60"
                  value={logDuration}
                  onChange={e => setLogDuration(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
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
                        {MUSCLE_GROUPS.map(mg => (
                          <option key={mg} value={mg}>{mg}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">{entry.exercise_name}</p>
                      <p className="text-sm text-gray-500">{entry.muscle_group}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeExerciseEntry(entryIdx)}
                  className="text-gray-600 hover:text-red-400 p-1 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sets Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-[50px_1fr_1fr_40px] gap-2 text-xs text-gray-500 px-1">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight (kg)</span>
                  <span></span>
                </div>
                {entry.sets.map((set, setIdx) => (
                  <div key={setIdx} className="grid grid-cols-[50px_1fr_1fr_40px] gap-2 items-center">
                    <span className="text-sm text-gray-500 text-center">{set.set_number}</span>
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
                      onClick={() => {
                        setExerciseEntries(prev => prev.map((en, i) =>
                          i === entryIdx
                            ? { ...en, sets: en.sets.filter((_, si) => si !== setIdx).map((s, si) => ({ ...s, set_number: si + 1 })) }
                            : en
                        ))
                      }}
                      className="text-gray-600 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSetToEntry(entryIdx)}
                  className="text-sm text-green-500 hover:text-green-400 flex items-center gap-1"
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

      {/* ═══════════════════ TAB 3: WORKOUT HISTORY ═══════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {workoutLogs.length === 0 ? (
            <div className="card text-center py-12">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No workouts logged yet. Hit the gym and come back!</p>
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
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {log.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {log.duration_minutes} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5" />
                        {new Set(log.exercise_logs?.map(e => e.exercise_name)).size || 0} exercises
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-sm text-gray-500 mt-1">{log.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="text-gray-500 hover:text-white p-1"
                    >
                      {expandedLog === log.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => deleteWorkoutLog(log.id)}
                      className="text-gray-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Log Details */}
                {expandedLog === log.id && log.exercise_logs && (
                  <div className="mt-4 pt-4 border-t border-[#262626] space-y-3">
                    {(() => {
                      const grouped: Record<string, ExerciseLog[]> = {}
                      log.exercise_logs.forEach(el => {
                        if (!grouped[el.exercise_name]) grouped[el.exercise_name] = []
                        grouped[el.exercise_name].push(el)
                      })
                      return Object.entries(grouped).map(([name, sets]) => (
                        <div key={name} className="bg-[#1a1a1a] rounded-lg px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{name}</p>
                            <span className="badge-blue">{sets[0]?.muscle_group}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-1">
                            <span>Set</span>
                            <span>Reps</span>
                            <span>Weight</span>
                          </div>
                          {sets.map(s => (
                            <div key={s.id} className="grid grid-cols-3 gap-2 text-sm py-0.5">
                              <span className="text-gray-400">{s.set_number}</span>
                              <span>{s.reps ?? '-'}</span>
                              <span>{s.weight_kg != null ? `${s.weight_kg} kg` : '-'}</span>
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
    </div>
  )
}
