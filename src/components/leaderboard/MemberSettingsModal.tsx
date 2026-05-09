'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, AlertCircle, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { LeaderboardMember, GoalType, ActivityLevel } from '@/lib/types'
import { GOAL_LABELS, ACTIVITY_LABELS } from '@/lib/scoring'

interface Props {
  member:    LeaderboardMember
  onClose:   () => void
  onUpdated: () => void
}

export default function MemberSettingsModal({ member, onClose, onUpdated }: Props) {
  const supabase = createClient()
  const router   = useRouter()

  const [goalType,      setGoalType]      = useState<GoalType>(member.goal_type)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(member.activity_level)
  const [currentWeight, setCurrentWeight] = useState(member.current_weight_kg?.toString() ?? '')
  const [targetWeight,  setTargetWeight]  = useState(member.target_weight_kg?.toString() ?? '')
  const [startWeight,   setStartWeight]   = useState(member.start_weight_kg?.toString() ?? '')
  const [showAdvanced,  setShowAdvanced]  = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [confirmLeave,  setConfirmLeave]  = useState(false)
  const [leaving,       setLeaving]       = useState(false)

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('leaderboard_members')
        .update({
          goal_type:         goalType,
          activity_level:    activityLevel,
          current_weight_kg: parseFloat(currentWeight) || null,
          target_weight_kg:  parseFloat(targetWeight)  || null,
          start_weight_kg:   parseFloat(startWeight)   || null,
        })
        .eq('id', member.id)
      if (err) throw err
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const leaveLeaderboard = async () => {
    setLeaving(true)
    try {
      await supabase.from('leaderboard_members').delete().eq('id', member.id)
      router.push('/leaderboard')
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">My Settings</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Goal */}
        <div>
          <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">My Goal</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(GOAL_LABELS) as [GoalType, typeof GOAL_LABELS[GoalType]][]).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setGoalType(key)}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  goalType === key
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                    : 'bg-[#161616] border-[#2a2a2a] text-[#555] hover:text-white'
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#444] mt-1.5">{GOAL_LABELS[goalType].description}</p>
        </div>

        {/* Activity level */}
        <div>
          <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Activity Level</label>
          <select
            value={activityLevel}
            onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
            className="select text-sm"
          >
            {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, typeof ACTIVITY_LABELS[ActivityLevel]][]).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label} — {meta.description}</option>
            ))}
          </select>
        </div>

        {/* Weights */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Current weight (kg)</label>
            <input
              type="number" min={30} max={300} step={0.1}
              value={currentWeight}
              onChange={e => setCurrentWeight(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Target weight (kg)</label>
            <input
              type="number" min={30} max={300} step={0.1}
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
              className="input text-sm"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Advanced */}
        <button
          onClick={() => setShowAdvanced(s => !s)}
          className="text-xs text-[#555] hover:text-white"
        >
          {showAdvanced ? '− Hide advanced' : '+ Show advanced (start weight)'}
        </button>

        {showAdvanced && (
          <div>
            <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Start weight (kg)</label>
            <input
              type="number" min={30} max={300} step={0.1}
              value={startWeight}
              onChange={e => setStartWeight(e.target.value)}
              className="input text-sm"
            />
            <p className="text-[10px] text-amber-400/70 mt-1">Changing this resets your progress baseline.</p>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save
          </button>
        </div>

        {/* Leave leaderboard — danger zone */}
        <div className="pt-4 border-t border-[#1a1a1a]">
          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              className="flex items-center gap-2 text-xs text-[#666] hover:text-red-400"
            >
              <LogOut className="w-3.5 h-3.5" /> Leave leaderboard
            </button>
          ) : (
            <div className="space-y-2 bg-red-500/8 border border-red-500/20 rounded-xl p-3">
              <p className="text-xs text-red-400">Are you sure? This removes your scores and cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="text-[11px] btn-secondary py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  onClick={leaveLeaderboard}
                  disabled={leaving}
                  className="text-[11px] py-1.5 px-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {leaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                  Yes, leave
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
