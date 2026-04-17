'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Dumbbell, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/12 border border-blue-500/20 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Workout Routine</h1>
          <p className="text-[#555] text-sm">Your complete training system</p>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-[#0e0e0e] p-1 rounded-xl">
            <button
              onClick={() => { setIsSignUp(false); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                !isSignUp ? 'bg-[#1e1e1e] text-white shadow' : 'text-[#555] hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                isSignUp ? 'bg-[#1e1e1e] text-white shadow' : 'text-[#555] hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input pl-10 text-sm"
                  required={isSignUp}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10 text-sm"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10 text-sm"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm mt-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Log In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[#333] text-xs mt-6">
          Built for consistency. Not excuses.
        </p>
      </div>
    </div>
  )
}
