'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { ProgressLog } from '@/lib/types'
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type TimeRange = '30' | '90' | '180' | 'all'

export default function ProgressPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<ProgressLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRange>('90')

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [weightKg, setWeightKg] = useState('')
  const [bodyFatPct, setBodyFatPct] = useState('')
  const [chestCm, setChestCm] = useState('')
  const [waistCm, setWaistCm] = useState('')
  const [armsCm, setArmsCm] = useState('')
  const [thighsCm, setThighsCm] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchLogs() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('progress_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress logs')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!weightKg) {
      setError('Body weight is required')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('progress_logs').insert({
        user_id: user.id,
        date,
        weight_kg: parseFloat(weightKg),
        body_fat_pct: bodyFatPct ? parseFloat(bodyFatPct) : null,
        chest_cm: chestCm ? parseFloat(chestCm) : null,
        waist_cm: waistCm ? parseFloat(waistCm) : null,
        arms_cm: armsCm ? parseFloat(armsCm) : null,
        thighs_cm: thighsCm ? parseFloat(thighsCm) : null,
        notes: notes || null,
      })

      if (error) throw error

      setSuccess('Progress saved!')
      setWeightKg('')
      setBodyFatPct('')
      setChestCm('')
      setWaistCm('')
      setArmsCm('')
      setThighsCm('')
      setNotes('')
      setDate(new Date().toISOString().split('T')[0])
      await fetchLogs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this progress entry?')) return

    try {
      const { error } = await supabase
        .from('progress_logs')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchLogs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }

  // Filter logs by time range
  const filteredLogs = useMemo(() => {
    if (timeRange === 'all') return logs

    const days = parseInt(timeRange)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    return logs.filter((log) => log.date >= cutoffStr)
  }, [logs, timeRange])

  // Chart data
  const weightChartData = useMemo(
    () =>
      filteredLogs
        .filter((l) => l.weight_kg !== null)
        .map((l) => ({
          date: new Date(l.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          weight: l.weight_kg,
        })),
    [filteredLogs]
  )

  const measurementChartData = useMemo(
    () =>
      filteredLogs
        .filter(
          (l) =>
            l.chest_cm !== null ||
            l.waist_cm !== null ||
            l.arms_cm !== null ||
            l.thighs_cm !== null
        )
        .map((l) => ({
          date: new Date(l.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          chest: l.chest_cm,
          waist: l.waist_cm,
          arms: l.arms_cm,
          thighs: l.thighs_cm,
        })),
    [filteredLogs]
  )

  const bodyFatChartData = useMemo(
    () =>
      filteredLogs
        .filter((l) => l.body_fat_pct !== null)
        .map((l) => ({
          date: new Date(l.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          bodyFat: l.body_fat_pct,
        })),
    [filteredLogs]
  )

  // Stats calculations
  const stats = useMemo(() => {
    const withWeight = logs.filter((l) => l.weight_kg !== null)
    if (withWeight.length === 0) return null

    const weights = withWeight.map((l) => l.weight_kg!)
    const currentWeight = weights[weights.length - 1]
    const startingWeight = weights[0]
    const weightChange = currentWeight - startingWeight
    const lowestWeight = Math.min(...weights)
    const highestWeight = Math.max(...weights)

    // Average weekly change
    let avgWeeklyChange = 0
    if (withWeight.length >= 2) {
      const first = new Date(withWeight[0].date)
      const last = new Date(withWeight[withWeight.length - 1].date)
      const weeks = Math.max(
        1,
        (last.getTime() - first.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
      avgWeeklyChange = weightChange / weeks
    }

    // Latest measurements
    const latestWithMeasurements = [...logs]
      .reverse()
      .find(
        (l) =>
          l.chest_cm !== null ||
          l.waist_cm !== null ||
          l.arms_cm !== null ||
          l.thighs_cm !== null
      )

    return {
      currentWeight,
      startingWeight,
      weightChange,
      lowestWeight,
      highestWeight,
      avgWeeklyChange,
      latestMeasurements: latestWithMeasurements,
    }
  }, [logs])

  // Descending order for history table
  const logsDescending = useMemo(() => [...logs].reverse(), [logs])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 animate-pulse">
          <Scale className="w-8 h-8 text-green-500" />
          <span className="text-xl font-bold">Loading progress...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Scale className="w-8 h-8 text-green-500" />
          Progress Tracker
        </h1>
        <p className="text-gray-500 mt-1">
          Track your body weight, measurements, and composition over time.
        </p>
      </div>

      {/* Section 1: Log Measurements */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-green-500" />
          Log Measurements
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Body Weight */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Body Weight (kg) *
              </label>
              <div className="relative">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  step="0.1"
                  placeholder="75.0"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Body Fat % */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Body Fat % (optional)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="15.0"
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(e.target.value)}
                className="input"
              />
            </div>

            {/* Chest */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Chest (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="100.0"
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
                className="input"
              />
            </div>

            {/* Waist */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Waist (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="80.0"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                className="input"
              />
            </div>

            {/* Arms */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Arms (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="35.0"
                value={armsCm}
                onChange={(e) => setArmsCm(e.target.value)}
                className="input"
              />
            </div>

            {/* Thighs */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Thighs (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="55.0"
                value={thighsCm}
                onChange={(e) => setThighsCm(e.target.value)}
                className="input"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-sm text-gray-400 mb-1 block">Notes</label>
              <input
                type="text"
                placeholder="Feeling lean..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-400 text-sm bg-green-500/10 px-3 py-2 rounded-lg">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Save Progress
              </>
            )}
          </button>
        </form>
      </div>

      {/* Section 2: Progress Charts */}
      {logs.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Progress Charts
            </h2>
            <div className="flex gap-2">
              {(
                [
                  { value: '30', label: '30 Days' },
                  { value: '90', label: '90 Days' },
                  { value: '180', label: '6 Months' },
                  { value: 'all', label: 'All' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeRange(opt.value)}
                  className={
                    timeRange === opt.value ? 'btn-primary text-sm' : 'btn-secondary text-sm'
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weight Chart */}
          {weightChartData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-medium mb-4 text-gray-300">
                Body Weight (kg)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Measurements Chart */}
          {measurementChartData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-medium mb-4 text-gray-300">
                Body Measurements (cm)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measurementChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="chest"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 3 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="waist"
                      stroke="#eab308"
                      strokeWidth={2}
                      dot={{ fill: '#eab308', r: 3 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="arms"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="thighs"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ fill: '#a855f7', r: 3 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Body Fat Chart */}
          {bodyFatChartData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-medium mb-4 text-gray-300">
                Body Fat %
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bodyFatChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bodyFat"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Stats Summary */}
      {stats && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Stats Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Weight Change */}
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Weight Change</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {stats.currentWeight.toFixed(1)} kg
                </span>
                <span
                  className={`flex items-center text-sm font-medium ${
                    stats.weightChange > 0
                      ? 'text-green-400'
                      : stats.weightChange < 0
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  {stats.weightChange > 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : stats.weightChange < 0 ? (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  ) : null}
                  {stats.weightChange > 0 ? '+' : ''}
                  {stats.weightChange.toFixed(1)} kg
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                from {stats.startingWeight.toFixed(1)} kg
              </p>
            </div>

            {/* Lowest Weight */}
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Lowest Weight</p>
              <p className="text-2xl font-bold">
                {stats.lowestWeight.toFixed(1)} kg
              </p>
            </div>

            {/* Highest Weight */}
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Highest Weight</p>
              <p className="text-2xl font-bold">
                {stats.highestWeight.toFixed(1)} kg
              </p>
            </div>

            {/* Avg Weekly Change */}
            <div className="card">
              <p className="text-sm text-gray-400 mb-1">Avg Weekly Change</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {stats.avgWeeklyChange > 0 ? '+' : ''}
                  {stats.avgWeeklyChange.toFixed(2)} kg
                </span>
                {stats.avgWeeklyChange > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : stats.avgWeeklyChange < 0 ? (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                ) : null}
              </div>
            </div>

            {/* Latest Measurements */}
            {stats.latestMeasurements && (
              <div className="card sm:col-span-2 lg:col-span-4">
                <p className="text-sm text-gray-400 mb-2">
                  Latest Measurements ({stats.latestMeasurements.date})
                </p>
                <div className="flex flex-wrap gap-6 text-sm">
                  {stats.latestMeasurements.chest_cm && (
                    <div>
                      <span className="text-gray-500">Chest:</span>{' '}
                      <span className="font-semibold">
                        {stats.latestMeasurements.chest_cm} cm
                      </span>
                    </div>
                  )}
                  {stats.latestMeasurements.waist_cm && (
                    <div>
                      <span className="text-gray-500">Waist:</span>{' '}
                      <span className="font-semibold">
                        {stats.latestMeasurements.waist_cm} cm
                      </span>
                    </div>
                  )}
                  {stats.latestMeasurements.arms_cm && (
                    <div>
                      <span className="text-gray-500">Arms:</span>{' '}
                      <span className="font-semibold">
                        {stats.latestMeasurements.arms_cm} cm
                      </span>
                    </div>
                  )}
                  {stats.latestMeasurements.thighs_cm && (
                    <div>
                      <span className="text-gray-500">Thighs:</span>{' '}
                      <span className="font-semibold">
                        {stats.latestMeasurements.thighs_cm} cm
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 4: History Table */}
      {logs.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            History
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="text-left py-3 pr-4 font-medium">Date</th>
                  <th className="text-left py-3 pr-4 font-medium">Weight</th>
                  <th className="text-left py-3 pr-4 font-medium">Body Fat%</th>
                  <th className="text-left py-3 pr-4 font-medium">Chest</th>
                  <th className="text-left py-3 pr-4 font-medium">Waist</th>
                  <th className="text-left py-3 pr-4 font-medium">Arms</th>
                  <th className="text-left py-3 pr-4 font-medium">Thighs</th>
                  <th className="text-left py-3 pr-4 font-medium">Notes</th>
                  <th className="text-left py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {logsDescending.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">{log.date}</td>
                    <td className="py-3 pr-4">
                      {log.weight_kg !== null ? `${log.weight_kg} kg` : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {log.body_fat_pct !== null ? `${log.body_fat_pct}%` : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {log.chest_cm !== null ? `${log.chest_cm}` : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {log.waist_cm !== null ? `${log.waist_cm}` : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {log.arms_cm !== null ? `${log.arms_cm}` : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {log.thighs_cm !== null ? `${log.thighs_cm}` : '-'}
                    </td>
                    <td className="py-3 pr-4 max-w-[200px] truncate text-gray-400">
                      {log.notes || '-'}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="btn-danger p-2"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {logs.length === 0 && !loading && (
        <div className="card text-center py-12">
          <Scale className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            No progress logged yet
          </h3>
          <p className="text-gray-600">
            Start tracking your body weight and measurements above.
          </p>
        </div>
      )}
    </div>
  )
}
