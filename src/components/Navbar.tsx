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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/presets', label: 'Presets', icon: BookOpen },
  { href: '/diet', label: 'Diet', icon: UtensilsCrossed },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/supplements', label: 'Supplements', icon: Pill },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
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
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-64 min-h-screen bg-[#0d0d0d] border-r border-[#1e1e1e] p-5 fixed left-0 top-0">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight">Lean Muscle</h1>
            <p className="text-xs text-[#555]">Training System</p>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                  active
                    ? 'bg-blue-500/12 text-blue-400 font-medium'
                    : 'text-[#666] hover:text-white hover:bg-[#181818]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : ''}`} />
                {label}
              </Link>
            )
          })}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#555] hover:text-red-400 hover:bg-red-500/8 transition-all mt-auto text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </nav>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d] border-b border-[#1e1e1e] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-bold text-sm">Lean Muscle</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-[#555]">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#0a0a0a] pt-16">
          <div className="flex flex-col gap-0.5 p-4">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                    active
                      ? 'bg-blue-500/12 text-blue-400 font-medium'
                      : 'text-[#666] hover:text-white hover:bg-[#181818]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#555] hover:text-red-400 mt-4 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  )
}
