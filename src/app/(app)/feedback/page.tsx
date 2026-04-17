'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  MessageSquare, Plus, ThumbsUp, Clock, X,
  ChevronDown, Zap, Bug, HelpCircle, Sparkles,
  Loader2, CheckCircle2, AlertCircle, Send
} from 'lucide-react'

interface FeedbackItem {
  id: string
  user_id: string | null
  author_name: string | null
  title: string
  body: string | null
  category: string
  status: string
  upvotes: number
  created_at: string
}

type CategoryFilter = 'all' | 'feature' | 'bug' | 'improvement' | 'question'
type StatusFilter   = 'all' | 'open' | 'under_review' | 'planned' | 'implemented' | 'wont_fix'

const CATEGORY_CONFIG: Record<string, { label: string; color: string; badgeClass: string; icon: React.ReactNode }> = {
  feature:     { label: 'Feature',     color: 'text-blue-400',   badgeClass: 'badge-blue',   icon: <Sparkles className="w-3 h-3" /> },
  bug:         { label: 'Bug',         color: 'text-red-400',    badgeClass: 'badge-red',    icon: <Bug className="w-3 h-3" /> },
  improvement: { label: 'Improvement', color: 'text-amber-400',  badgeClass: 'badge-amber',  icon: <Zap className="w-3 h-3" /> },
  question:    { label: 'Question',    color: 'text-purple-400', badgeClass: 'badge-purple', icon: <HelpCircle className="w-3 h-3" /> },
}

const STATUS_CONFIG: Record<string, { label: string; dotClass: string; textClass: string }> = {
  open:         { label: 'Open',         dotClass: 'bg-[#444]',        textClass: 'text-[#777]' },
  under_review: { label: 'Under Review', dotClass: 'bg-blue-400',      textClass: 'text-blue-400' },
  planned:      { label: 'Planned',      dotClass: 'bg-amber-400',     textClass: 'text-amber-400' },
  implemented:  { label: 'Implemented',  dotClass: 'bg-emerald-400',   textClass: 'text-emerald-400' },
  wont_fix:     { label: "Won't Fix",    dotClass: 'bg-[#333]',        textClass: 'text-[#444]' },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

// ─────────────────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const supabase = createClient()

  // ── User state ──────────────────────────────────────────────────
  const [userId, setUserId]           = useState<string | null>(null)
  const [authorName, setAuthorName]   = useState<string>('Anonymous')

  // ── Items ───────────────────────────────────────────────────────
  const [items, setItems]             = useState<FeedbackItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [upvotedIds, setUpvotedIds]   = useState<Set<string>>(new Set())

  // ── Filters ─────────────────────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all')

  // ── Form ────────────────────────────────────────────────────────
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formData, setFormData]   = useState({ title: '', body: '', category: 'feature' })

  // ── Expanded card ───────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Realtime channel ref
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Load user + profile on mount ────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      // Get author display name from profile
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setAuthorName(data.full_name)
        })
      // Load which items this user has upvoted
      supabase
        .from('feedback_upvotes')
        .select('feedback_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setUpvotedIds(new Set(data.map(r => r.feedback_id)))
        })
    })
  }, [])

  // ── Load feedback items ─────────────────────────────────────────
  const loadItems = useCallback(async () => {
    let query = supabase
      .from('feedback')
      .select('*')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false })

    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter)
    if (statusFilter   !== 'all') query = query.eq('status',   statusFilter)

    const { data, error } = await query

    if (!error && data) setItems(data)
    setLoading(false)
  }, [categoryFilter, statusFilter])

  useEffect(() => {
    setLoading(true)
    loadItems()
  }, [loadItems])

  // ── Realtime subscription ───────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('feedback-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
        loadItems()
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [loadItems])

  // ── Submit new feedback (browser client — no API route) ─────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) { setFormError('You must be logged in to post feedback.'); return }
    if (!formData.title.trim()) { setFormError('Title is required.'); return }

    const VALID = ['feature', 'bug', 'improvement', 'question']
    if (!VALID.includes(formData.category)) { setFormError('Invalid category.'); return }

    setSubmitting(true)
    setFormError('')

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id:     userId,
        author_name: authorName,
        title:       formData.title.trim(),
        body:        formData.body.trim() || null,
        category:    formData.category,
      })
      .select()
      .single()

    if (error) {
      setFormError(error.message)
      setSubmitting(false)
      return
    }

    // Immediately show in list
    if (data) setItems(prev => [data, ...prev])
    setFormData({ title: '', body: '', category: 'feature' })
    setSubmitSuccess(true)
    setTimeout(() => { setSubmitSuccess(false); setShowForm(false) }, 1500)
    setSubmitting(false)
  }

  // ── Toggle upvote (browser client) ─────────────────────────────
  const handleUpvote = async (id: string) => {
    if (!userId) return
    const wasUpvoted = upvotedIds.has(id)

    // Optimistic UI
    setUpvotedIds(prev => {
      const next = new Set(prev)
      wasUpvoted ? next.delete(id) : next.add(id)
      return next
    })
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, upvotes: item.upvotes + (wasUpvoted ? -1 : 1) }
        : item
    ))

    if (wasUpvoted) {
      await supabase.from('feedback_upvotes').delete()
        .eq('feedback_id', id).eq('user_id', userId)
      await supabase.rpc('decrement_feedback_upvotes', { fid: id })
    } else {
      await supabase.from('feedback_upvotes').insert({ feedback_id: id, user_id: userId })
      await supabase.rpc('increment_feedback_upvotes', { fid: id })
    }

    // Sync accurate count
    const { data } = await supabase.from('feedback').select('upvotes').eq('id', id).single()
    if (data) setItems(prev => prev.map(item => item.id === id ? { ...item, upvotes: data.upvotes } : item))
  }

  // ── Update status (browser client — author only via RLS) ────────
  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('feedback').update({ status }).eq('id', id).eq('user_id', userId!)
    setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item))
  }

  // ── Counts ──────────────────────────────────────────────────────
  const counts = {
    open:         items.filter(i => i.status === 'open').length,
    under_review: items.filter(i => i.status === 'under_review').length,
    planned:      items.filter(i => i.status === 'planned').length,
    implemented:  items.filter(i => i.status === 'implemented').length,
  }

  const filtered = items.filter(item => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
    if (statusFilter   !== 'all' && item.status   !== statusFilter)   return false
    return true
  })

  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Feedback</h1>
          </div>
          <p className="text-[#555] text-sm">
            Feature requests, bug reports, and ideas. Shared across all users.
          </p>
        </div>
        {userId && (
          <button
            onClick={() => { setShowForm(true); setSubmitSuccess(false); setFormError('') }}
            className="btn-primary flex items-center gap-2 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Post
          </button>
        )}
      </div>

      {/* ── Status summary ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(counts) as [string, number][]).map(([key, count]) => {
          const cfg = STATUS_CONFIG[key]
          const active = statusFilter === key
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(active ? 'all' : key as StatusFilter)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                active
                  ? 'bg-[#1e1e1e] border-[#333] text-white'
                  : 'bg-[#0e0e0e] border-[#1a1a1a] text-[#444] hover:text-[#888] hover:border-[#252525]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
              {cfg.label}
              <span className="bg-[#1a1a1a] text-[#555] px-1.5 py-0.5 rounded-md text-[10px] font-mono">{count}</span>
            </button>
          )
        })}
      </div>

      {/* ── Category filter tabs ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'feature', 'bug', 'improvement', 'question'] as CategoryFilter[]).map(cat => {
          const active = categoryFilter === cat
          const cfg = cat !== 'all' ? CATEGORY_CONFIG[cat] : null
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                active
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#0e0e0e] border border-[#1a1a1a] text-[#555] hover:text-white hover:border-[#252525]'
              }`}
            >
              {cfg?.icon}
              {cat === 'all' ? 'All' : cfg?.label}
            </button>
          )
        })}
      </div>

      {/* ── New post form ────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#111] border border-blue-500/20 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">New Feedback</h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(''); setSubmitSuccess(false) }}
              className="text-[#444] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Title — short and specific *"
            value={formData.title}
            onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            className="input text-sm"
            maxLength={120}
            autoFocus
          />
          <textarea
            placeholder="Description (optional) — steps to reproduce, use case, expected vs actual…"
            value={formData.body}
            onChange={e => setFormData(p => ({ ...p, body: e.target.value }))}
            className="input resize-none text-sm"
            rows={3}
          />
          <select
            value={formData.category}
            onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
            className="select text-sm"
          >
            <option value="feature">Feature Request</option>
            <option value="bug">Bug Report</option>
            <option value="improvement">Improvement</option>
            <option value="question">Question</option>
          </select>

          {formError && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/8 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          {submitSuccess && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/8 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Posted successfully!
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || submitSuccess}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {submitting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              Submit
            </button>
          </div>
        </form>
      )}

      {/* ── Not logged in notice ─────────────────────────────────── */}
      {!userId && !loading && (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-4 text-center">
          <p className="text-sm text-[#555]">
            <a href="/login" className="text-blue-400 hover:underline">Log in</a> to post feedback or upvote items.
          </p>
        </div>
      )}

      {/* ── Item list ───────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[#222]" />
          <p className="text-sm text-[#444]">No feedback yet.</p>
          {userId && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-400 text-sm hover:underline"
            >
              Be the first to post
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <FeedbackCard
              key={item.id}
              item={item}
              hasUpvoted={upvotedIds.has(item.id)}
              isAuthor={item.user_id === userId}
              isExpanded={expandedId === item.id}
              canInteract={!!userId}
              onToggle={() => setExpandedId(prev => prev === item.id ? null : item.id)}
              onUpvote={() => handleUpvote(item.id)}
              onStatusChange={(status) => handleStatusChange(item.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Feedback Card ─────────────────────────────────────────────────

function FeedbackCard({
  item,
  hasUpvoted,
  isAuthor,
  isExpanded,
  canInteract,
  onToggle,
  onUpvote,
  onStatusChange,
}: {
  item: FeedbackItem
  hasUpvoted: boolean
  isAuthor: boolean
  isExpanded: boolean
  canInteract: boolean
  onToggle: () => void
  onUpvote: () => void
  onStatusChange: (status: string) => void
}) {
  const catCfg    = CATEGORY_CONFIG[item.category]
  const statusCfg = STATUS_CONFIG[item.status]
  const [statusOpen, setStatusOpen] = useState(false)

  return (
    <div
      className={`bg-[#111] border rounded-2xl transition-all duration-150 ${
        isExpanded ? 'border-[#2a2a2a]' : 'border-[#1a1a1a] hover:border-[#252525]'
      }`}
    >
      {/* Main row */}
      <div className="flex gap-3 p-4">
        {/* Upvote button */}
        <button
          onClick={canInteract ? onUpvote : undefined}
          disabled={!canInteract}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all min-w-[44px] shrink-0 ${
            hasUpvoted
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
              : canInteract
                ? 'bg-[#141414] text-[#444] hover:text-blue-400 hover:bg-blue-500/8 border border-[#1e1e1e]'
                : 'bg-[#0e0e0e] text-[#2a2a2a] border border-[#141414] cursor-default'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold tabular-nums">{item.upvotes}</span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <button onClick={onToggle} className="w-full text-left">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              {catCfg && (
                <span className={`badge ${catCfg.badgeClass} flex items-center gap-1`}>
                  {catCfg.icon}
                  {catCfg.label}
                </span>
              )}
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg?.dotClass}`} />
                <span className={`text-xs ${statusCfg?.textClass}`}>{statusCfg?.label}</span>
              </div>
              {isAuthor && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-medium">you</span>
              )}
            </div>
            <p className="text-sm font-semibold text-white leading-snug">{item.title}</p>
          </button>

          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#444]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeTime(item.created_at)}
            </span>
            {item.author_name && (
              <span className="text-[#333]">{item.author_name}</span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        {(item.body || isAuthor) && (
          <button
            onClick={onToggle}
            className="text-[#333] hover:text-[#666] shrink-0 self-start mt-1 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-3 border-t border-[#151515] space-y-4">
          {item.body && (
            <p className="text-sm text-[#888] leading-relaxed whitespace-pre-wrap">{item.body}</p>
          )}

          {/* Author: status control */}
          {isAuthor && (
            <div className="relative inline-block">
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#1e1e1e] text-xs text-[#666] hover:text-white transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg?.dotClass}`} />
                Change Status
                <ChevronDown className={`w-3 h-3 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
              </button>

              {statusOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-20 bg-[#141414] border border-[#222] rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => { onStatusChange(key); setStatusOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-[#1e1e1e] transition-colors ${cfg.textClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotClass}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
