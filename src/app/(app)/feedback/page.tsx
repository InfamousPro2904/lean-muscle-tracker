'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  MessageSquare, Plus, ThumbsUp, Tag, Clock,
  CheckCircle2, Circle, Loader2, X, ChevronDown, Zap, Bug, HelpCircle, Sparkles
} from 'lucide-react'

interface FeedbackItem {
  id: string
  user_id: string
  author_name: string | null
  title: string
  body: string | null
  category: string
  status: string
  upvotes: number
  created_at: string
  hasUpvoted?: boolean
}

type CategoryFilter = 'all' | 'feature' | 'bug' | 'improvement' | 'question'
type StatusFilter = 'all' | 'open' | 'under_review' | 'planned' | 'implemented' | 'wont_fix'

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  feature:     { label: 'Feature',     color: 'badge-blue',   icon: <Sparkles className="w-3 h-3" /> },
  bug:         { label: 'Bug',         color: 'badge-red',    icon: <Bug className="w-3 h-3" /> },
  improvement: { label: 'Improvement', color: 'badge-amber',  icon: <Zap className="w-3 h-3" /> },
  question:    { label: 'Question',    color: 'badge-purple', icon: <HelpCircle className="w-3 h-3" /> },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  open:         { label: 'Open',         color: 'text-[#888]',      dotColor: 'bg-[#555]' },
  under_review: { label: 'Under Review', color: 'text-blue-400',    dotColor: 'bg-blue-400' },
  planned:      { label: 'Planned',      color: 'text-amber-400',   dotColor: 'bg-amber-400' },
  implemented:  { label: 'Implemented',  color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  wont_fix:     { label: 'Won\'t Fix',   color: 'text-[#555]',      dotColor: 'bg-[#444]' },
}

export default function FeedbackPage() {
  const supabase = createClient()

  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set())

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ title: '', body: '', category: 'feature' })
  const [formError, setFormError] = useState('')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Load feedback items
  const loadItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (categoryFilter !== 'all') params.set('category', categoryFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)

    const res = await fetch(`/api/feedback?${params}`)
    const json = await res.json()
    if (json.success) setItems(json.data)
    setLoading(false)
  }, [categoryFilter, statusFilter])

  useEffect(() => {
    setLoading(true)
    loadItems()
  }, [loadItems])

  // Load upvoted IDs for current user
  useEffect(() => {
    if (!userId) return
    supabase
      .from('feedback_upvotes')
      .select('feedback_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) setUpvotedIds(new Set(data.map(r => r.feedback_id)))
      })
  }, [userId])

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('feedback-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
        loadItems()
      })
      .subscribe()

    realtimeRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [loadItems])

  const handleUpvote = async (id: string) => {
    if (!userId) return

    const wasUpvoted = upvotedIds.has(id)
    // Optimistic update
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

    const res = await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upvote', feedback_id: id }),
    })
    if (!res.ok) {
      // Revert on failure
      setUpvotedIds(prev => {
        const next = new Set(prev)
        wasUpvoted ? next.add(id) : next.delete(id)
        return next
      })
      setItems(prev => prev.map(item =>
        item.id === id
          ? { ...item, upvotes: item.upvotes + (wasUpvoted ? 1 : -1) }
          : item
      ))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) { setFormError('Title is required'); return }
    setSubmitting(true)
    setFormError('')

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    const json = await res.json()

    if (json.success) {
      setFormData({ title: '', body: '', category: 'feature' })
      setShowForm(false)
      loadItems()
    } else {
      setFormError(json.error ?? 'Failed to submit')
    }
    setSubmitting(false)
  }

  const filtered = items.filter(item => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    return true
  })

  const counts = {
    open: items.filter(i => i.status === 'open').length,
    under_review: items.filter(i => i.status === 'under_review').length,
    planned: items.filter(i => i.status === 'planned').length,
    implemented: items.filter(i => i.status === 'implemented').length,
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/12 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
          </div>
          <p className="text-[#666] text-sm">
            Feature requests, bug reports, and ideas — shared across all users.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([key, count]) => {
          const cfg = STATUS_CONFIG[key]
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key as StatusFilter)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                statusFilter === key
                  ? 'bg-[#1e1e1e] border-[#333] text-white'
                  : 'bg-[#111] border-[#1e1e1e] text-[#555] hover:text-white hover:border-[#2a2a2a]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
              {cfg.label}
              <span className="bg-[#2a2a2a] text-[#888] px-1.5 rounded-md text-[10px]">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'feature', 'bug', 'improvement', 'question'] as CategoryFilter[]).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              categoryFilter === cat
                ? 'bg-blue-500 text-white'
                : 'bg-[#161616] text-[#555] hover:text-white border border-[#222]'
            }`}
          >
            {cat === 'all' ? 'All' : CATEGORY_CONFIG[cat]?.label}
          </button>
        ))}
      </div>

      {/* New post form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 border-blue-500/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">New Feedback</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-[#555] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              placeholder="Title — short and specific *"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              className="input"
              maxLength={120}
            />
            <textarea
              placeholder="Description (optional) — steps to reproduce, use case, context..."
              value={formData.body}
              onChange={e => setFormData(p => ({ ...p, body: e.target.value }))}
              className="input resize-none"
              rows={3}
            />
            <select
              value={formData.category}
              onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
              className="select"
            >
              <option value="feature">Feature Request</option>
              <option value="bug">Bug Report</option>
              <option value="improvement">Improvement</option>
              <option value="question">Question</option>
            </select>
          </div>

          {formError && <p className="text-xs text-red-400">{formError}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary text-sm flex items-center gap-2">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Submit
            </button>
          </div>
        </form>
      )}

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#555]">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No feedback yet. Be the first to post!</p>
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
              onToggle={() => setExpandedId(prev => (prev === item.id ? null : item.id))}
              onUpvote={() => handleUpvote(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Feedback Card ──────────────────────────────────────────────────

function FeedbackCard({
  item,
  hasUpvoted,
  isAuthor,
  isExpanded,
  onToggle,
  onUpvote,
}: {
  item: FeedbackItem
  hasUpvoted: boolean
  isAuthor: boolean
  isExpanded: boolean
  onToggle: () => void
  onUpvote: () => void
}) {
  const catCfg = CATEGORY_CONFIG[item.category]
  const statusCfg = STATUS_CONFIG[item.status]

  const relativeTime = (iso: string) => {
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

  const [statusOpen, setStatusOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setStatusOpen(false)
    setUpdatingStatus(true)
    await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', feedback_id: item.id, status: newStatus }),
    })
    setUpdatingStatus(false)
  }

  return (
    <div className={`bg-[#111] border rounded-2xl transition-all ${
      isExpanded ? 'border-[#333]' : 'border-[#1e1e1e] hover:border-[#2a2a2a]'
    }`}>
      {/* Main row */}
      <div className="flex gap-3 p-4">
        {/* Upvote */}
        <button
          onClick={onUpvote}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-[44px] shrink-0 ${
            hasUpvoted
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
              : 'bg-[#161616] text-[#555] hover:text-blue-400 hover:bg-blue-500/8 border border-[#222]'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{item.upvotes}</span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <button onClick={onToggle} className="w-full text-left">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`badge ${catCfg?.color} flex items-center gap-1`}>
                {catCfg?.icon}
                {catCfg?.label}
              </span>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg?.dotColor}`} />
                <span className={`text-xs ${statusCfg?.color}`}>{statusCfg?.label}</span>
              </div>
              {isAuthor && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">You</span>
              )}
            </div>
            <p className="text-sm font-semibold text-white leading-snug">{item.title}</p>
          </button>

          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#555]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeTime(item.created_at)}
            </span>
            {item.author_name && (
              <span>{item.author_name}</span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        {item.body && (
          <button onClick={onToggle} className="text-[#444] hover:text-white shrink-0 self-start mt-1">
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Expanded body */}
      {isExpanded && (item.body || isAuthor) && (
        <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-4 space-y-4">
          {item.body && (
            <p className="text-sm text-[#999] leading-relaxed whitespace-pre-wrap">{item.body}</p>
          )}

          {/* Author status controls */}
          {isAuthor && (
            <div className="relative inline-block">
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                disabled={updatingStatus}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161616] border border-[#252525] text-xs text-[#888] hover:text-white transition-all"
              >
                {updatingStatus ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg?.dotColor}`} />
                )}
                Change Status
                <ChevronDown className="w-3 h-3" />
              </button>

              {statusOpen && (
                <div className="absolute left-0 top-full mt-1 z-20 bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#1e1e1e] transition-colors ${cfg.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
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
