'use client'

import { useState, useEffect, useCallback, use } from 'react'
import {
  Users, Hash, Copy, Check, Flame, Crown, Loader2,
  ChevronDown, ChevronUp, Medal, Star, AlertCircle,
  Archive, RefreshCw, Settings, SlidersHorizontal,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { createClient } from '@/lib/supabase'
import type { Leaderboard, LeaderboardMember, DailyLog, WeeklyArchive, WeeklyScore, Badge, Reaction } from '@/lib/types'
import {
  calculateWeeklyScore, calculateStreak, getWeekStart, getWeekEnd,
  formatWeekLabel, BADGE_DEFINITIONS, GOAL_LABELS, ACTIVITY_LABELS,
  memberColor, scoreColorClass, REACTION_EMOJIS,
  goalProgressPct, scoreTrend,
} from '@/lib/scoring'
import MemberSettingsModal from '@/components/leaderboard/MemberSettingsModal'
import LeaderboardManageModal from '@/components/leaderboard/LeaderboardManageModal'
import NotificationsPanel from '@/components/leaderboard/NotificationsPanel'
import ScoreExplainerModal from '@/components/leaderboard/ScoreExplainerModal'
import MyDailyLogsPanel from '@/components/leaderboard/MyDailyLogsPanel'

// ── Sub-types ──────────────────────────────────────────────────────

interface MemberRow extends LeaderboardMember {
  score:    WeeklyScore
  streak:   number
  badges:   Badge[]
  logs:     DailyLog[]
}

type Tab = 'week' | 'monthly' | 'yearly' | 'archives'

// ── Confetti ───────────────────────────────────────────────────────

function Confetti() {
  const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#a78bfa', '#f97316', '#ec4899']
  const pieces = Array.from({ length: 48 }, (_, i) => ({
    id:    i,
    color: colors[i % colors.length],
    left:  `${(i / 48) * 105 - 2}%`,
    delay: `${(i % 8) * 0.15}s`,
    dur:   `${2.5 + (i % 5) * 0.3}s`,
    size:  i % 3 === 0 ? '10px' : '7px',
    shape: i % 4 === 0 ? '50%' : '2px',
  }))

  return (
    <>
      <style>{`
        @keyframes confettiDrop {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {pieces.map(p => (
          <div
            key={p.id}
            style={{
              position:        'absolute',
              top:             '-10px',
              left:            p.left,
              width:           p.size,
              height:          p.size,
              backgroundColor: p.color,
              borderRadius:    p.shape,
              animation:       `confettiDrop ${p.dur} ${p.delay} ease-in forwards`,
            }}
          />
        ))}
      </div>
    </>
  )
}

// ── Score breakdown bar ────────────────────────────────────────────

function ScoreBreakdown({ score }: { score: WeeklyScore }) {
  const bars = [
    { label: 'Adherence', value: score.adherence,   color: '#3b82f6', pct: 40 },
    { label: 'Burnt',     value: score.burnt,        color: '#10b981', pct: 30 },
    { label: 'Consistent',value: score.consistency,  color: '#f59e0b', pct: 20 },
    { label: 'Progress',  value: score.progress,     color: '#a78bfa', pct: 10 },
  ]
  return (
    <div className="space-y-1.5">
      {bars.map(b => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="text-[10px] text-[#555] w-18 shrink-0">{b.label}</span>
          <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${b.value}%`, backgroundColor: b.color }}
            />
          </div>
          <span className="text-[10px] text-[#555] w-8 text-right">{b.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Reaction buttons ───────────────────────────────────────────────

function ReactionBar({
  targetUserId,
  reactions,
  myUserId,
  onToggle,
}: {
  targetUserId: string
  reactions:    Reaction[]
  myUserId:     string
  onToggle:     (emoji: string, has: boolean) => void
}) {
  const counts = REACTION_EMOJIS.reduce<Record<string, { count: number; mine: boolean }>>(
    (acc, e) => {
      const mine  = reactions.some(r => r.emoji === e && r.from_user_id === myUserId && r.target_user_id === targetUserId)
      const count = reactions.filter(r => r.emoji === e && r.target_user_id === targetUserId).length
      if (count > 0 || mine) acc[e] = { count, mine }
      return acc
    },
    {}
  )

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {REACTION_EMOJIS.map(e => {
        const entry = counts[e]
        const mine  = entry?.mine ?? false
        const count = entry?.count ?? 0
        return (
          <button
            key={e}
            onClick={() => onToggle(e, mine)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
              mine
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                : count > 0
                  ? 'bg-[#1a1a1a] border-[#2a2a2a] text-[#666] hover:border-[#333] hover:text-white'
                  : 'bg-transparent border-[#222] text-[#444] hover:border-[#2a2a2a] hover:text-[#777]'
            }`}
          >
            {e}{count > 0 && <span className="ml-0.5">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Trend pill ─────────────────────────────────────────────────────

function TrendPill({ trend }: { trend: 'up' | 'down' | 'flat' | null }) {
  if (!trend) return null
  if (trend === 'up')   return <span className="flex items-center gap-0.5 text-[10px] text-emerald-400" title="Up vs last week"><TrendingUp className="w-3 h-3" /></span>
  if (trend === 'down') return <span className="flex items-center gap-0.5 text-[10px] text-red-400" title="Down vs last week"><TrendingDown className="w-3 h-3" /></span>
  return <span className="flex items-center gap-0.5 text-[10px] text-[#666]" title="Flat vs last week"><Minus className="w-3 h-3" /></span>
}

// ── Main page ──────────────────────────────────────────────────────

export default function LeaderboardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase  = createClient()

  const [lb,       setLb]       = useState<Leaderboard | null>(null)
  const [myId,     setMyId]     = useState<string>('')
  const [myMem,    setMyMem]    = useState<LeaderboardMember | null>(null)
  const [rows,     setRows]     = useState<MemberRow[]>([])
  const [archives, setArchives] = useState<WeeklyArchive[]>([])
  const [reactions,setReactions]= useState<Reaction[]>([])
  const [allBadges,setAllBadges]= useState<Badge[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<Tab>('week')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)
  const [archiving,setArchiving]= useState(false)
  const [archErr,  setArchErr]  = useState('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showManageModal,   setShowManageModal]   = useState(false)
  const [showConfetti,      setShowConfetti]      = useState(false)
  const [autoArchiveBanner, setAutoArchiveBanner] = useState<string | null>(null)
  const [explainRow,        setExplainRow]        = useState<MemberRow | null>(null)
  type RankAxis = 'total' | 'workout' | 'nutrition'
  const [rankAxis,          setRankAxis]          = useState<RankAxis>('total')

  const weekStart = getWeekStart()
  const weekEnd   = getWeekEnd(weekStart)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyId(user.id)

    const [lbRes, memRes, archRes] = await Promise.all([
      supabase.from('leaderboards').select('*').eq('id', id).single(),
      supabase.from('leaderboard_members').select('*, profiles(full_name, weight_kg, height_cm, age)').eq('leaderboard_id', id),
      supabase.from('weekly_archives').select('*').eq('leaderboard_id', id).order('week_start', { ascending: false }).limit(52),
    ])

    if (!lbRes.data) { setLoading(false); return }
    setLb(lbRes.data as Leaderboard)
    setArchives((archRes.data ?? []) as WeeklyArchive[])

    const members = (memRes.data ?? []) as (LeaderboardMember & { profiles: { full_name: string; weight_kg: number | null; height_cm: number | null; age: number | null } })[]
    const memberIds = members.map(m => m.user_id)
    const me = members.find(m => m.user_id === user.id)
    if (me) setMyMem(me)

    // Fetch this week's logs for all members
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('*')
      .in('user_id', memberIds)
      .gte('date', weekStart)
      .lte('date', weekEnd)

    // Fetch recent logs (90 days) for streak calculation
    const ninetyAgo = new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0]
    const { data: recentLogs } = await supabase
      .from('daily_logs')
      .select('user_id, date')
      .in('user_id', memberIds)
      .gte('date', ninetyAgo)

    // Fetch badges
    const { data: badgesData } = await supabase
      .from('badges')
      .select('*')
      .eq('leaderboard_id', id)

    setAllBadges((badgesData ?? []) as Badge[])

    // Fetch reactions on archives
    if ((archRes.data ?? []).length > 0) {
      const archiveIds = (archRes.data ?? []).map((a: { id: string }) => a.id)
      const { data: rxns } = await supabase
        .from('reactions')
        .select('*')
        .in('archive_id', archiveIds)
      setReactions((rxns ?? []) as Reaction[])
    }

    // Build MemberRow list
    const memberRows: MemberRow[] = members.map(mem => {
      const profile = mem.profiles
      const memberLogs     = (logs ?? []).filter(l => l.user_id === mem.user_id)
      const memberAllLogs  = (recentLogs ?? []).filter(l => l.user_id === mem.user_id)
      const score          = calculateWeeklyScore(mem, memberLogs as DailyLog[], profile)
      const streak         = calculateStreak(memberAllLogs as DailyLog[])
      const memberBadges   = (badgesData ?? []).filter((b: Badge) => b.user_id === mem.user_id) as Badge[]

      return {
        ...mem,
        profile: { full_name: profile.full_name, weight_kg: profile.weight_kg, height_cm: profile.height_cm, age: profile.age },
        score,
        streak,
        badges:  memberBadges,
        logs:    memberLogs as DailyLog[],
      }
    }).sort((a, b) => b.score.total - a.score.total)

    setRows(memberRows)

    // Confetti: if current user is top scorer this week
    const myRow = memberRows.find(r => r.user_id === user.id)
    if (myRow && memberRows[0]?.user_id === user.id && memberRows.length > 1 && myRow.score.total > 0) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 4000)
    }

    setLoading(false)
  }, [supabase, id, weekStart, weekEnd])

  useEffect(() => { load() }, [load])

  const copyCode = () => {
    if (!lb) return
    navigator.clipboard.writeText(lb.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Shared archive helper (used by manual archive + auto-archive) ────────

  const archiveWeekHelper = async (
    weekStartIso: string,
    weekEndIso:   string,
    rowsForWeek:  MemberRow[]
  ): Promise<{ ok: true } | { ok: false; reason: string }> => {
    if (!lb) return { ok: false, reason: 'No leaderboard' }

    const winner = rowsForWeek.length > 0 ? rowsForWeek[0].user_id : null
    const scores: Record<string, WeeklyScore> = {}
    rowsForWeek.forEach(r => { scores[r.user_id] = r.score })

    const { error } = await supabase.from('weekly_archives').insert({
      leaderboard_id: lb.id,
      week_start:     weekStartIso,
      week_end:       weekEndIso,
      winner_user_id: winner,
      scores,
    })

    if (error) {
      const dup = error.message.includes('unique') || error.message.includes('duplicate')
      return { ok: false, reason: dup ? 'This week is already archived.' : error.message }
    }

    // Award badges + notifications — use Promise.all to avoid race (LB-8)
    const badgeInserts = []
    const notifInserts: Record<string, unknown>[] = []

    if (winner) {
      badgeInserts.push(
        supabase.from('badges').upsert({ user_id: winner, leaderboard_id: lb.id, badge_type: 'week_winner', meta: { week: weekStartIso } })
      )
    }

    // Notify every member — winner gets a special title, others get a recap
    const winnerName = winner ? rowsForWeek.find(r => r.user_id === winner)?.profile?.full_name ?? 'A member' : null
    for (const r of rowsForWeek) {
      const isWinner = r.user_id === winner
      notifInserts.push({
        user_id: r.user_id,
        type:    isWinner ? 'week_winner' : 'week_recap',
        title:   isWinner
          ? '👑 You won the week!'
          : `📊 Week of ${formatWeekLabel(weekStartIso)} archived`,
        body:    isWinner
          ? `You topped ${lb.name} for the week of ${formatWeekLabel(weekStartIso)}.`
          : `${winnerName ?? 'Someone'} won. You scored ${r.score.total} / 100.`,
        data:    { leaderboard_id: lb.id, week_start: weekStartIso },
      })
    }

    for (const r of rowsForWeek) {
      if (r.score.total >= 100) {
        badgeInserts.push(supabase.from('badges').upsert({ user_id: r.user_id, leaderboard_id: lb.id, badge_type: 'century', meta: {} }))
      } else if (r.score.total >= 80) {
        badgeInserts.push(supabase.from('badges').upsert({ user_id: r.user_id, leaderboard_id: lb.id, badge_type: 'top_scorer', meta: {} }))
      }
      const activeDays = r.logs.filter(l => l.workout_done || l.is_rest_day || l.kcal_in > 0).length
      if (activeDays >= 5) {
        badgeInserts.push(supabase.from('badges').upsert({ user_id: r.user_id, leaderboard_id: lb.id, badge_type: 'consistent', meta: {} }))
      }
    }

    await Promise.all(badgeInserts)

    if (notifInserts.length > 0) {
      await supabase.from('notifications').insert(notifInserts)
    }

    return { ok: true }
  }

  // Manual archive of current week
  const archiveWeek = async () => {
    if (!lb) return
    setArchiving(true)
    setArchErr('')
    try {
      const result = await archiveWeekHelper(weekStart, weekEnd, rows)
      if (!result.ok) { setArchErr(result.reason); return }
      await load()
    } finally {
      setArchiving(false)
    }
  }

  // Auto-archive last week (LB-3) — runs silently after `load()` resolves
  // when isCreator AND auto_archive=true AND last week unarchived.
  const autoArchiveLastWeekIfDue = useCallback(async () => {
    if (!lb || !lb.auto_archive) return
    if (lb.created_by !== myId) return  // creator-only

    // Compute last week (Mon to Sun before this week's Mon)
    const lastWeekStartDate = new Date(weekStart)
    lastWeekStartDate.setDate(lastWeekStartDate.getDate() - 7)
    const lastWeekStartIso = lastWeekStartDate.toISOString().split('T')[0]
    const lastWeekEndIso   = getWeekEnd(lastWeekStartIso)

    if (archives.some(a => a.week_start === lastWeekStartIso)) return  // already archived

    // Fetch last week's logs for all members
    const memberIds = rows.map(r => r.user_id)
    if (memberIds.length === 0) return
    const { data: lastWeekLogs } = await supabase
      .from('daily_logs')
      .select('*')
      .in('user_id', memberIds)
      .gte('date', lastWeekStartIso)
      .lte('date', lastWeekEndIso)

    if (!lastWeekLogs || lastWeekLogs.length === 0) return  // no activity that week

    // Build last-week MemberRow list using existing rows (profile, member info) + last week's logs
    const lastWeekRows: MemberRow[] = rows.map(r => {
      const memLogs = (lastWeekLogs ?? []).filter(l => l.user_id === r.user_id) as DailyLog[]
      const score   = calculateWeeklyScore(r, memLogs, r.profile ?? { weight_kg: null, height_cm: null, age: null })
      return { ...r, logs: memLogs, score }
    })
      .filter(r => r.logs.length > 0)
      .sort((a, b) => b.score.total - a.score.total)

    if (lastWeekRows.length === 0) return

    const result = await archiveWeekHelper(lastWeekStartIso, lastWeekEndIso, lastWeekRows)
    if (result.ok) {
      setAutoArchiveBanner(`✓ Auto-archived week of ${formatWeekLabel(lastWeekStartIso)}`)
      setTimeout(() => setAutoArchiveBanner(null), 5000)
      await load()
    }
    // Silent on duplicate / error — manual archive button remains available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lb, myId, weekStart, archives, rows, supabase])

  useEffect(() => {
    if (!loading && lb) autoArchiveLastWeekIfDue()
  }, [loading, lb, autoArchiveLastWeekIfDue])

  const toggleReaction = async (archiveId: string, targetUserId: string, emoji: string, hasIt: boolean) => {
    if (!myId) return
    if (hasIt) {
      await supabase.from('reactions').delete()
        .eq('archive_id', archiveId).eq('target_user_id', targetUserId)
        .eq('from_user_id', myId).eq('emoji', emoji)
    } else {
      await supabase.from('reactions').insert({ archive_id: archiveId, target_user_id: targetUserId, from_user_id: myId, emoji })
    }
    // Refresh reactions
    const archiveIds = archives.map(a => a.id)
    const { data } = await supabase.from('reactions').select('*').in('archive_id', archiveIds)
    setReactions((data ?? []) as Reaction[])
  }

  // ── Chart data ───────────────────────────────────────────────────

  const buildMonthlyData = () => {
    const data: Record<string, number>[] = []
    const last4 = [...archives].slice(0, 4).reverse()
    last4.forEach(arch => {
      const point: Record<string, number> = { week: new Date(arch.week_start).getTime() }
      Object.entries(arch.scores).forEach(([uid, s]) => { point[uid] = s.total })
      data.push(point)
    })
    // Add current live week
    const livePoint: Record<string, number> = { week: new Date(weekStart).getTime() }
    rows.forEach(r => { livePoint[r.user_id] = r.score.total })
    data.push(livePoint)
    return data
  }

  const buildYearlyData = () => {
    if (archives.length === 0) return []
    // Group by month
    const monthMap: Record<string, { sum: Record<string, number>; count: number }> = {}
    archives.forEach(arch => {
      const month = arch.week_start.slice(0, 7) // YYYY-MM
      if (!monthMap[month]) monthMap[month] = { sum: {}, count: 0 }
      monthMap[month].count++
      Object.entries(arch.scores).forEach(([uid, s]) => {
        monthMap[month].sum[uid] = (monthMap[month].sum[uid] ?? 0) + s.total
      })
    })
    return Object.entries(monthMap).map(([month, { sum, count }]) => {
      const point: Record<string, unknown> = { month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }) }
      Object.entries(sum).forEach(([uid, total]) => { point[uid] = Math.round((total as number) / count) })
      return point
    })
  }

  // ── Render ────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )

  if (!lb) return (
    <div className="max-w-xl mx-auto pt-16 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-[#555]">Leaderboard not found.</p>
    </div>
  )

  const isCreator = lb.created_by === myId
  const monthlyData = buildMonthlyData()
  const yearlyData  = buildYearlyData()

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {showConfetti && <Confetti />}

      {/* ── Header ── */}
      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{lb.name}</h1>
            {lb.description && <p className="text-sm text-[#555] mt-1">{lb.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationsPanel leaderboardId={lb.id} />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
              <Hash className="w-3.5 h-3.5 text-[#555]" />
              <span className="font-mono text-sm tracking-widest text-white">{lb.invite_code}</span>
              <button onClick={copyCode} className="text-[#555] hover:text-white ml-1">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#555] flex-wrap">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {rows.length} members</span>
          <span>Week of {formatWeekLabel(weekStart)}</span>
          {myMem && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 ml-auto"
            >
              <Settings className="w-3.5 h-3.5" /> My Settings
            </button>
          )}
        </div>

        {autoArchiveBanner && (
          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            {autoArchiveBanner}
          </div>
        )}

        {isCreator && (
          <div className="flex items-center gap-2 pt-1 border-t border-[#1a1a1a] flex-wrap">
            <button
              onClick={archiveWeek}
              disabled={archiving}
              className="flex items-center gap-1.5 text-xs btn-secondary py-1.5 px-3 disabled:opacity-50"
            >
              {archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
              Archive Week
            </button>
            <button
              onClick={() => setShowManageModal(true)}
              className="flex items-center gap-1.5 text-xs btn-secondary py-1.5 px-3"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Manage
            </button>
            <button onClick={load} className="text-[#555] hover:text-white p-1.5" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {archErr && <span className="text-xs text-red-400">{archErr}</span>}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-2xl p-1">
        {(['week', 'monthly', 'yearly', 'archives'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-blue-500 text-white' : 'text-[#555] hover:text-white'
            }`}
          >
            {t === 'week' ? 'This Week' : t === 'monthly' ? 'Monthly' : t === 'yearly' ? 'Yearly' : 'Past Weeks'}
          </button>
        ))}
      </div>

      {/* ── This Week ── */}
      {tab === 'week' && (() => {
        // Pick which score axis drives ranking + display
        const axisValue = (r: MemberRow): number => {
          if (rankAxis === 'workout')   return r.score.burnt
          if (rankAxis === 'nutrition') return r.score.adherence
          return r.score.total
        }
        const sortedRows = [...rows].sort((a, b) => axisValue(b) - axisValue(a))
        const axisMeta: Record<RankAxis, { label: string; color: string; bg: string }> = {
          total:     { label: 'Combined',  color: 'text-blue-400',  bg: 'bg-blue-500/15' },
          workout:   { label: 'Workout',   color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
          nutrition: { label: 'Nutrition', color: 'text-amber-400',  bg: 'bg-amber-500/15' },
        }
        return (
        <div className="space-y-2">
          {/* Ranking axis pills */}
          <div className="flex gap-1 bg-[#0e0e0e] border border-[#222] rounded-xl p-1 mb-3">
            {(['total', 'workout', 'nutrition'] as RankAxis[]).map(a => (
              <button
                key={a}
                onClick={() => setRankAxis(a)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  rankAxis === a
                    ? `${axisMeta[a].bg} ${axisMeta[a].color}`
                    : 'text-[#555] hover:text-white'
                }`}
              >
                {axisMeta[a].label}
              </button>
            ))}
          </div>
          {rows.length === 0 && (
            <div className="card text-center py-10 text-[#555] text-sm">
              No members yet. Share the invite code!
            </div>
          )}
          {sortedRows.map((row, idx) => {
            const isMe    = row.user_id === myId
            const isFirst = idx === 0
            const name    = row.profile?.full_name ?? 'Unknown'
            const open    = expanded === row.user_id

            return (
              <div
                key={row.user_id}
                className={`rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-blue-500/5 border-blue-500/20'
                    : 'bg-[#111] border-[#1e1e1e]'
                }`}
              >
                <button
                  className="w-full flex items-center gap-4 px-4 py-4 text-left"
                  onClick={() => setExpanded(open ? null : row.user_id)}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                    isFirst ? 'bg-amber-500/20 text-amber-400' :
                    idx === 1 ? 'bg-[#333] text-[#999]' :
                    'bg-[#1a1a1a] text-[#666]'
                  }`}>
                    {isFirst ? <Crown className="w-4 h-4" /> : idx + 1}
                  </div>

                  {/* Name + streak */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{name}</span>
                      {isMe && <span className="text-[10px] text-blue-400">(you)</span>}
                      {row.streak > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] text-orange-400">
                          <Flame className="w-3 h-3" />{row.streak}
                        </span>
                      )}
                      {row.badges.slice(0, 2).map(b => (
                        <span key={b.id} title={BADGE_DEFINITIONS[b.badge_type as keyof typeof BADGE_DEFINITIONS]?.label}>
                          {BADGE_DEFINITIONS[b.badge_type as keyof typeof BADGE_DEFINITIONS]?.emoji}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] text-[#555] mt-0.5">
                      {GOAL_LABELS[row.goal_type]?.label} · {ACTIVITY_LABELS[row.activity_level]?.label}
                    </div>
                  </div>

                  {/* Score + trend + explain */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1">
                      <TrendPill trend={scoreTrend(row.user_id, row.score.total, archives)} />
                      <p className={`text-2xl font-bold ${scoreColorClass(axisValue(row))}`}>
                        {axisValue(row)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExplainRow(row) }}
                      className="text-[10px] text-[#555] hover:text-blue-400 transition-colors"
                    >
                      {rankAxis === 'total' ? '/ 100 ⓘ' : `${axisMeta[rankAxis].label} ⓘ`}
                    </button>
                  </div>

                  {open ? <ChevronUp className="w-4 h-4 text-[#444]" /> : <ChevronDown className="w-4 h-4 text-[#444]" />}
                </button>

                {open && (() => {
                  const progress = goalProgressPct(row)
                  return (
                    <div className="px-4 pb-4 pt-1 border-t border-[#1a1a1a]">
                      {/* Goal progress bar (LB-6) */}
                      {progress !== null && row.start_weight_kg !== null && row.target_weight_kg !== null && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[10px] text-[#555] mb-1">
                            <span>{row.start_weight_kg}kg → {row.target_weight_kg}kg</span>
                            <span className="font-semibold text-blue-400">{progress}% there</span>
                          </div>
                          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-700"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          {row.current_weight_kg !== null && (
                            <p className="text-[10px] text-[#666] mt-1">
                              Currently: <span className="text-white">{row.current_weight_kg}kg</span>
                            </p>
                          )}
                        </div>
                      )}
                      <ScoreBreakdown score={row.score} />
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-[#0e0e0e] rounded-xl py-2">
                          <p className="text-[#555] mb-0.5">Kcal in</p>
                          <p className="font-bold">{row.logs.reduce((s, l) => s + l.kcal_in, 0)}</p>
                        </div>
                        <div className="bg-[#0e0e0e] rounded-xl py-2">
                          <p className="text-[#555] mb-0.5">Burnt</p>
                          <p className="font-bold">{row.logs.reduce((s, l) => s + l.kcal_burnt, 0)}</p>
                        </div>
                        <div className="bg-[#0e0e0e] rounded-xl py-2">
                          <p className="text-[#555] mb-0.5">Active days</p>
                          <p className="font-bold">{row.logs.filter(l => l.workout_done || l.kcal_in > 0).length}</p>
                        </div>
                        <div className="bg-[#0e0e0e] rounded-xl py-2">
                          <p className="text-[#555] mb-0.5">Rest days</p>
                          <p className="font-bold">{row.logs.filter(l => l.is_rest_day).length}</p>
                        </div>
                      </div>

                      {/* Editable own daily-logs panel — only for the current user */}
                      {isMe && (
                        <MyDailyLogsPanel
                          weekStart={weekStart}
                          weekEnd={weekEnd}
                          logs={row.logs}
                          onChanged={load}
                        />
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
        )
      })()}

      {/* ── Monthly chart ── */}
      {tab === 'monthly' && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-5">Score over last 4 weeks</h2>
          {monthlyData.length < 2 ? (
            <p className="text-sm text-[#555] text-center py-8">Archive more weeks to see a trend.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tickFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  tick={{ fill: '#555', fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tick={{ fill: '#555', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 12, fontSize: 12 }}
                  labelFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {rows.map((r, i) => (
                  <Line
                    key={r.user_id}
                    type="monotone"
                    dataKey={r.user_id}
                    name={r.profile?.full_name ?? 'Unknown'}
                    stroke={memberColor(i)}
                    strokeWidth={2}
                    dot={{ r: 3, fill: memberColor(i) }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Yearly chart ── */}
      {tab === 'yearly' && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-5">Monthly average scores</h2>
          {yearlyData.length === 0 ? (
            <p className="text-sm text-[#555] text-center py-8">Archive weeks first to see yearly progress.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={yearlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#555', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 12, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {rows.map((r, i) => (
                  <Bar
                    key={r.user_id}
                    dataKey={r.user_id}
                    name={r.profile?.full_name ?? 'Unknown'}
                    fill={memberColor(i)}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Past weeks ── */}
      {tab === 'archives' && (
        <div className="space-y-3">
          {archives.length === 0 && (
            <div className="card text-center py-10 text-[#555] text-sm">
              No archived weeks yet.{isCreator ? ' Use "Archive This Week" at the end of each week.' : ''}
            </div>
          )}
          {archives.map(arch => {
            const sortedScores = Object.entries(arch.scores).sort((a, b) => b[1].total - a[1].total)
            const winnerRow = rows.find(r => r.user_id === arch.winner_user_id)

            return (
              <div key={arch.id} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      Week of {formatWeekLabel(arch.week_start)}
                      <span className="text-[#555] font-normal"> – {formatWeekLabel(arch.week_end)}</span>
                    </p>
                    {winnerRow && (
                      <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        {winnerRow.profile?.full_name ?? 'Unknown'} won this week
                      </p>
                    )}
                  </div>
                  <Medal className="w-5 h-5 text-amber-400/60" />
                </div>

                <div className="space-y-2">
                  {sortedScores.map(([uid, score], idx) => {
                    const member = rows.find(r => r.user_id === uid)
                    const name   = member?.profile?.full_name ?? 'Unknown'
                    return (
                      <div key={uid} className="space-y-0.5">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-[#555] w-5 shrink-0">#{idx + 1}</span>
                          <span className="text-sm flex-1">{name}{uid === myId && ' (you)'}</span>
                          <span className={`text-sm font-bold ${scoreColorClass(score.total)}`}>{score.total}</span>
                        </div>
                        <ReactionBar
                          targetUserId={uid}
                          reactions={reactions}
                          myUserId={myId}
                          onToggle={(emoji, has) => toggleReaction(arch.id, uid, emoji, has)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Badges panel ── */}
      {tab === 'week' && allBadges.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Earned Badges
          </h2>
          <div className="flex flex-wrap gap-2">
            {allBadges.map(b => {
              const def  = BADGE_DEFINITIONS[b.badge_type as keyof typeof BADGE_DEFINITIONS]
              const name = rows.find(r => r.user_id === b.user_id)?.profile?.full_name ?? 'Unknown'
              return (
                <div key={b.id} title={`${name}: ${def?.description}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-[#2a2a2a] rounded-xl text-xs">
                  <span className="text-base">{def?.emoji ?? '🏅'}</span>
                  <div>
                    <p className="font-medium text-white">{def?.label ?? b.badge_type}</p>
                    <p className="text-[10px] text-[#555]">{name}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showSettingsModal && myMem && (
        <MemberSettingsModal
          member={myMem}
          onClose={() => setShowSettingsModal(false)}
          onUpdated={load}
        />
      )}

      {showManageModal && lb && (
        <LeaderboardManageModal
          leaderboard={lb}
          members={rows.map(r => ({
            ...r,
            full_name: r.profile?.full_name ?? 'Unknown',
          }))}
          onClose={() => setShowManageModal(false)}
          onUpdated={load}
        />
      )}

      {explainRow && (
        <ScoreExplainerModal
          score={explainRow.score}
          username={explainRow.profile?.full_name ?? 'Unknown'}
          onClose={() => setExplainRow(null)}
        />
      )}
    </div>
  )
}
