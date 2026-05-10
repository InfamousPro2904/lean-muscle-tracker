'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellRing, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Notification } from '@/lib/types'

interface Props {
  /** Filter notifications to a specific leaderboard via data.leaderboard_id */
  leaderboardId?: string
}

export default function NotificationsPanel({ leaderboardId }: Props) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open,          setOpen]          = useState(false)
  const [loading,       setLoading]       = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setLoading(true)
    const q = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    const { data } = await q
    let rows = (data ?? []) as Notification[]
    if (leaderboardId) {
      rows = rows.filter(n => {
        const d = n.data as { leaderboard_id?: string } | null
        return d?.leaderboard_id === leaderboardId
      })
    }
    setNotifications(rows)
    setLoading(false)
  }, [leaderboardId, supabase])

  useEffect(() => { load() }, [load])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(o => !o)
          if (!open && unreadCount > 0) setTimeout(markAllRead, 500)
        }}
        className="relative p-2 text-[#555] hover:text-white rounded-lg"
        title="Notifications"
      >
        {unreadCount > 0 ? <BellRing className="w-4 h-4 text-amber-400" /> : <Bell className="w-4 h-4" />}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-[#0e0e0e] border border-[#222] rounded-xl shadow-2xl z-50">
            <div className="sticky top-0 bg-[#0e0e0e] border-b border-[#1a1a1a] px-3 py-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#888]">Notifications</p>
              <button onClick={() => setOpen(false)} className="text-[#555] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="px-3 py-6 text-center text-xs text-[#555]">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[#555]">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-[#161616] transition-colors flex gap-2 ${
                      !n.read ? 'bg-amber-500/4' : ''
                    }`}
                  >
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />}
                    <div className={`flex-1 min-w-0 ${n.read ? 'pl-3.5' : ''}`}>
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.body && <p className="text-[11px] text-[#777] mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-[#444] mt-1">
                        {new Date(n.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {n.read && <Check className="w-3 h-3 text-[#444] shrink-0 mt-1" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
