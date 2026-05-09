'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, AlertCircle, Trash2, RefreshCw, UserMinus, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Leaderboard, LeaderboardMember } from '@/lib/types'
import { generateInviteCode } from '@/lib/scoring'

interface MemberInfo extends LeaderboardMember {
  full_name: string
}

interface Props {
  leaderboard: Leaderboard
  members:     MemberInfo[]
  onClose:     () => void
  onUpdated:   () => void
}

export default function LeaderboardManageModal({ leaderboard, members, onClose, onUpdated }: Props) {
  const supabase = createClient()
  const router   = useRouter()

  const [name,         setName]        = useState(leaderboard.name)
  const [description,  setDescription] = useState(leaderboard.description ?? '')
  const [autoArchive,  setAutoArchive] = useState(leaderboard.auto_archive)
  const [isActive,     setIsActive]    = useState(leaderboard.is_active)
  const [saving,       setSaving]      = useState(false)
  const [error,        setError]       = useState('')
  const [regenCode,    setRegenCode]   = useState(false)
  const [removingId,   setRemovingId]  = useState<string | null>(null)
  const [confirmDelete,setConfirmDelete] = useState(false)
  const [deleteText,   setDeleteText]  = useState('')
  const [deleting,     setDeleting]    = useState(false)

  const saveSettings = async () => {
    setSaving(true)
    setError('')
    try {
      const updates: Record<string, unknown> = {
        name:         name.trim(),
        description:  description.trim() || null,
        auto_archive: autoArchive,
        is_active:    isActive,
      }
      if (regenCode) {
        updates.invite_code = generateInviteCode()
      }
      const { error: err } = await supabase
        .from('leaderboards')
        .update(updates)
        .eq('id', leaderboard.id)
      if (err) throw err
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const removeMember = async (memberId: string) => {
    setRemovingId(memberId)
    try {
      await supabase.from('leaderboard_members').delete().eq('id', memberId)
      onUpdated()
    } finally {
      setRemovingId(null)
    }
  }

  const deleteLeaderboard = async () => {
    if (deleteText !== leaderboard.name) return
    setDeleting(true)
    try {
      await supabase.from('leaderboards').delete().eq('id', leaderboard.id)
      router.push('/leaderboard')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Manage Leaderboard</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Edit details ── */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#444]">Details</p>
          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#666] mb-1.5 font-medium">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
              className="input text-sm resize-none"
            />
          </div>
        </div>

        {/* ── Settings ── */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#444]">Settings</p>
          <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#222] cursor-pointer">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Auto-archive weeks</p>
              <p className="text-[10px] text-[#555] mt-0.5">Archive last week automatically when you visit on Mon/Tue.</p>
            </div>
            <input
              type="checkbox"
              checked={autoArchive}
              onChange={e => setAutoArchive(e.target.checked)}
              className="w-4 h-4 accent-blue-500 shrink-0"
            />
          </label>
          <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#222] cursor-pointer">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Active</p>
              <p className="text-[10px] text-[#555] mt-0.5">Inactive leaderboards stay visible to existing members.</p>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-blue-500 shrink-0"
            />
          </label>
          <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#222] cursor-pointer">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                Regenerate invite code
              </p>
              <p className="text-[10px] text-[#555] mt-0.5">Old code stops working. Members keep their access.</p>
            </div>
            <input
              type="checkbox"
              checked={regenCode}
              onChange={e => setRegenCode(e.target.checked)}
              className="w-4 h-4 accent-amber-500 shrink-0"
            />
          </label>
        </div>

        {/* ── Members ── */}
        {members.length > 1 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#444]">Members ({members.length})</p>
            <div className="space-y-1">
              {members.map(m => {
                const isCreator = m.user_id === leaderboard.created_by
                return (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#161616] border border-[#222]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.full_name}</p>
                      <p className="text-[10px] text-[#555]">{isCreator ? 'Creator' : 'Member'}</p>
                    </div>
                    {!isCreator && (
                      <button
                        onClick={() => removeMember(m.id)}
                        disabled={removingId === m.id}
                        className="text-[10px] py-1 px-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1 disabled:opacity-50"
                      >
                        {removingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                        Remove
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
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
            onClick={saveSettings}
            disabled={saving || !name.trim()}
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </button>
        </div>

        {/* ── Danger zone ── */}
        <div className="pt-4 border-t border-[#1a1a1a] space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Danger Zone
          </p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-xs text-[#666] hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete this leaderboard
            </button>
          ) : (
            <div className="space-y-2 bg-red-500/8 border border-red-500/20 rounded-xl p-3">
              <p className="text-xs text-red-400">
                Type <span className="font-mono font-bold">{leaderboard.name}</span> to confirm.
                All members, archives, and badges will be permanently deleted.
              </p>
              <input
                type="text"
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                placeholder={leaderboard.name}
                className="input text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteText('') }}
                  className="text-[11px] btn-secondary py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteLeaderboard}
                  disabled={deleting || deleteText !== leaderboard.name}
                  className="text-[11px] py-1.5 px-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete forever
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
