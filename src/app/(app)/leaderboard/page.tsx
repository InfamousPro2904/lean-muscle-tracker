'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Trophy, Plus, Users, Hash, Loader2, X, ChevronRight,
  ArrowRight, CheckCircle2, AlertCircle, Flame
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Leaderboard, LeaderboardMember, GoalType, ActivityLevel } from '@/lib/types'
import {
  generateInviteCode, calculateStreak,
  GOAL_LABELS, ACTIVITY_LABELS,
} from '@/lib/scoring'
import { todayIsoLocal, daysAgoIsoLocal } from '@/lib/week'

// ── Types ──────────────────────────────────────────────────────────

interface MyLeaderboard {
  leaderboard: Leaderboard
  membership:  LeaderboardMember
  memberCount: number
  myStreak:    number
}

// ── Questionnaire shared between create and join ───────────────────

interface QForm {
  goal_type:         GoalType
  activity_level:    ActivityLevel
  start_weight_kg:   string
  target_weight_kg:  string
}

const EMPTY_Q: QForm = {
  goal_type:        'athletic',
  activity_level:   'moderate',
  start_weight_kg:  '',
  target_weight_kg: '',
}

function Questionnaire({
  form,
  onChange,
}: {
  form: QForm
  onChange: (k: keyof QForm, v: string) => void
}) {
  return (
    <div className="space-y-4">
      {/* Goal */}
      <div>
        <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Your Goal</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(GOAL_LABELS) as [GoalType, typeof GOAL_LABELS[GoalType]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => onChange('goal_type', key)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                form.goal_type === key
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                  : 'bg-[#161616] border-[#2a2a2a] text-[#555] hover:text-white'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#444] mt-1.5">{GOAL_LABELS[form.goal_type].description}</p>
      </div>

      {/* Activity level */}
      <div>
        <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Activity Level</label>
        <select
          value={form.activity_level}
          onChange={e => onChange('activity_level', e.target.value)}
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
            type="number"
            min={30}
            max={300}
            value={form.start_weight_kg}
            onChange={e => onChange('start_weight_kg', e.target.value)}
            placeholder="75"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Target weight (kg)</label>
          <input
            type="number"
            min={30}
            max={300}
            value={form.target_weight_kg}
            onChange={e => onChange('target_weight_kg', e.target.value)}
            placeholder="optional"
            className="input text-sm"
          />
        </div>
      </div>
    </div>
  )
}

// ── Create modal ───────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const supabase = createClient()
  const [step,   setStep]   = useState<'info' | 'quest'>('info')
  const [name,   setName]   = useState('')
  const [desc,   setDesc]   = useState('')
  const [qform,  setQform]  = useState<QForm>(EMPTY_Q)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const patchQ = (k: keyof QForm, v: string) => setQform(prev => ({ ...prev, [k]: v }))

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Try up to 3 codes in case of collision
      let lbData = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = generateInviteCode()
        const { data, error: lbErr } = await supabase
          .from('leaderboards')
          .insert({ created_by: user.id, name: name.trim(), description: desc.trim() || null, invite_code: code })
          .select()
          .single()
        if (!lbErr) { lbData = data; break }
        if (!lbErr?.message?.includes('duplicate') && !lbErr?.message?.includes('unique')) throw lbErr
      }
      if (!lbData) throw new Error('Failed to generate unique invite code')

      const startW = parseFloat(qform.start_weight_kg) || null
      const { error: memberError } = await supabase.from('leaderboard_members').insert({
        leaderboard_id:    lbData.id,
        user_id:           user.id,
        goal_type:         qform.goal_type,
        activity_level:    qform.activity_level,
        start_weight_kg:   startW,
        current_weight_kg: startW,
        target_weight_kg:  parseFloat(qform.target_weight_kg) || null,
      })
      if (memberError) throw new Error(`Could not add you as a member: ${memberError.message}`)

      onCreated(lbData.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Create Leaderboard" onClose={onClose}>
      {step === 'info' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Squad goals 💪"
              maxLength={40}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Description (optional)</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Monthly fitness challenge with friends"
              rows={2}
              className="input resize-none"
            />
          </div>
          <button
            onClick={() => setStep('quest')}
            disabled={!name.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Next: Your Goals <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <Questionnaire form={qform} onChange={patchQ} />
          {error && (
            <p className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep('info')} className="btn-secondary flex-1 text-sm">Back</button>
            <button
              onClick={handleCreate}
              disabled={saving || !qform.start_weight_kg}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

// ── Join modal ─────────────────────────────────────────────────────

function JoinModal({ onClose, onJoined }: { onClose: () => void; onJoined: (id: string) => void }) {
  const supabase = createClient()
  const [code,   setCode]   = useState('')
  const [found,  setFound]  = useState<Leaderboard | null>(null)
  const [qform,  setQform]  = useState<QForm>(EMPTY_Q)
  const [step,   setStep]   = useState<'code' | 'quest'>('code')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const patchQ = (k: keyof QForm, v: string) => setQform(prev => ({ ...prev, [k]: v }))

  const lookup = async () => {
    setError('')
    const { data } = await supabase
      .from('leaderboards')
      .select('*')
      .eq('invite_code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle()

    if (!data) { setError('No leaderboard found with that code'); return }

    // Check already a member — redirect directly rather than blocking
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: mem } = await supabase
        .from('leaderboard_members')
        .select('id')
        .eq('leaderboard_id', data.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (mem) { onJoined(data.id); return }
    }

    setFound(data as Leaderboard)
    setStep('quest')
  }

  const handleJoin = async () => {
    if (!found) return
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const startW = parseFloat(qform.start_weight_kg) || null
      await supabase.from('leaderboard_members').insert({
        leaderboard_id:    found.id,
        user_id:           user.id,
        goal_type:         qform.goal_type,
        activity_level:    qform.activity_level,
        start_weight_kg:   startW,
        current_weight_kg: startW,
        target_weight_kg:  parseFloat(qform.target_weight_kg) || null,
      })

      onJoined(found.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Join Leaderboard" onClose={onClose}>
      {step === 'code' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#666] mb-2 font-medium uppercase tracking-wide">Invite Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="input text-center text-xl font-mono tracking-[0.3em] uppercase"
            />
          </div>
          {error && (
            <p className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}
          <button
            onClick={lookup}
            disabled={code.length !== 6}
            className="btn-primary w-full disabled:opacity-50"
          >
            Find Leaderboard
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{found?.name}</p>
              <p className="text-[11px] text-[#555]">Found! Set your goals to join.</p>
            </div>
          </div>
          <Questionnaire form={qform} onChange={patchQ} />
          {error && (
            <p className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep('code')} className="btn-secondary flex-1 text-sm">Back</button>
            <button
              onClick={handleJoin}
              disabled={saving || !qform.start_weight_kg}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining…</> : 'Join'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

// ── Modal shell ────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────

export default function LeaderboardListPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [rows,    setRows]    = useState<MyLeaderboard[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<'create' | 'join' | null>(null)

  const loadAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Fetch memberships and leaderboards with separate queries
    // (avoids dependency on PostgREST schema-cache for embedded joins)
    const { data: mems } = await supabase
      .from('leaderboard_members')
      .select('*')
      .eq('user_id', user.id)

    if (!mems?.length) { setRows([]); setLoading(false); return }

    const lbIds = mems.map(m => m.leaderboard_id)
    const { data: lbs } = await supabase
      .from('leaderboards')
      .select('*')
      .in('id', lbIds)

    const today     = todayIsoLocal()
    const ninetyAgo = daysAgoIsoLocal(90)

    const { data: myLogs } = await supabase
      .from('daily_logs')
      .select('date')
      .eq('user_id', user.id)
      .gte('date', ninetyAgo)
      .lte('date', today)

    const streak = calculateStreak((myLogs ?? []).map(l => ({ date: l.date } as never)))

    const results: MyLeaderboard[] = []
    for (const mem of mems) {
      const lb = (lbs ?? []).find(l => l.id === mem.leaderboard_id) as Leaderboard | undefined
      if (!lb) continue

      const { count } = await supabase
        .from('leaderboard_members')
        .select('id', { count: 'exact', head: true })
        .eq('leaderboard_id', lb.id)

      results.push({
        leaderboard: lb,
        membership:  mem as LeaderboardMember,
        memberCount: count ?? 0,
        myStreak:    streak,
      })
    }

    setRows(results)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadAll() }, [loadAll])

  const onCreated = (id: string) => { setModal(null); router.push(`/leaderboard/${id}`) }
  const onJoined  = (id: string) => { setModal(null); router.push(`/leaderboard/${id}`) }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" /> Leaderboards
          </h1>
          <p className="text-xs text-[#555] mt-1">Invite-only weekly fitness competitions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('join')} className="btn-secondary text-sm flex items-center gap-1.5">
            <Hash className="w-4 h-4" /> Join
          </button>
          <button onClick={() => setModal('create')} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card text-center py-14 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold">No leaderboards yet</p>
            <p className="text-sm text-[#555] mt-1">Create one and invite your crew, or enter an invite code to join.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setModal('join')} className="btn-secondary text-sm flex items-center gap-1.5">
              <Hash className="w-4 h-4" /> Join with code
            </button>
            <button onClick={() => setModal('create')} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Create one
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ leaderboard: lb, membership: mem, memberCount, myStreak }) => (
            <Link
              key={lb.id}
              href={`/leaderboard/${lb.id}`}
              className="card-hover flex items-center gap-4 py-4"
            >
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{lb.name}</p>
                  <span className={`text-[11px] font-medium ${GOAL_LABELS[mem.goal_type].colorClass}`}>
                    {GOAL_LABELS[mem.goal_type].label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-[#555]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </span>
                  {myStreak > 0 && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <Flame className="w-3 h-3" /> {myStreak}-day streak
                    </span>
                  )}
                  <span className="font-mono text-[#333]">{lb.invite_code}</span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-[#444] shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {modal === 'create' && <CreateModal onClose={() => setModal(null)} onCreated={onCreated} />}
      {modal === 'join'   && <JoinModal   onClose={() => setModal(null)} onJoined={onJoined} />}
    </div>
  )
}
