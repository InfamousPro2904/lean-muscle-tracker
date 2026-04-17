'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Dumbbell, UtensilsCrossed, TrendingUp, Pill,
  LayoutDashboard, User, LogOut, Menu, X, BookOpen, MessageSquare
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/workouts',     label: 'Workouts',     icon: Dumbbell },
  { href: '/presets',      label: 'Exercises',    icon: BookOpen },
  { href: '/diet',         label: 'Nutrition',    icon: UtensilsCrossed },
  { href: '/progress',     label: 'Progress',     icon: TrendingUp },
  { href: '/supplements',  label: 'Supplements',  icon: Pill },
  { href: '/feedback',     label: 'Feedback',     icon: MessageSquare },
  { href: '/profile',      label: 'Profile',      icon: User },
]

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav className="hidden md:flex flex-col w-64 min-h-screen bg-[#0d0d0d] border-r border-[#1a1a1a] p-5 fixed left-0 top-0 z-30">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="font-bold text-[15px] tracking-tight text-white">Workout Routine</h1>
            <p className="text-[11px] text-[#444] mt-0.5">Training System</p>
          </div>
        </div>

        {/* Section: Main */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#333] px-3 mb-2">Main</p>
        <div className="flex flex-col gap-0.5 mb-6">
          {NAV_ITEMS.slice(0, 3).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  active
                    ? 'bg-blue-500/12 text-blue-400'
                    : 'text-[#555] hover:text-white hover:bg-[#161616]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : ''}`} />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Section: Track */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#333] px-3 mb-2">Track</p>
        <div className="flex flex-col gap-0.5 mb-6">
          {NAV_ITEMS.slice(3, 6).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  active
                    ? 'bg-blue-500/12 text-blue-400'
                    : 'text-[#555] hover:text-white hover:bg-[#161616]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : ''}`} />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Section: Account */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#333] px-3 mb-2">Account</p>
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.slice(6).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  active
                    ? 'bg-blue-500/12 text-blue-400'
                    : 'text-[#555] hover:text-white hover:bg-[#161616]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : ''}`} />
                {label}
              </Link>
            )
          })}
        </div>

        <div className="mt-auto pt-6 border-t border-[#1a1a1a]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[#444] hover:text-red-400 hover:bg-red-500/8 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Log Out
          </button>
        </div>
      </nav>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/95 backdrop-blur border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-bold text-sm tracking-tight">Workout Routine</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-[#555] hover:text-white transition-colors p-1"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#0a0a0a] pt-14 overflow-y-auto">
          <div className="flex flex-col gap-1 p-4">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-sm font-medium ${
                    active
                      ? 'bg-blue-500/12 text-blue-400'
                      : 'text-[#666] hover:text-white hover:bg-[#161616]'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  {label}
                </Link>
              )
            })}
            <div className="pt-4 mt-2 border-t border-[#1a1a1a]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[#555] hover:text-red-400 text-sm font-medium"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
