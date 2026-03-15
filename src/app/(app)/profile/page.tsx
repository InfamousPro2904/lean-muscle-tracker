'use client'

import { useEffect, useState } from 'react'
import { User, Save, Calculator, Lock, Trash2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

const GOALS = ['Lean Muscle', 'Fat Loss', 'Maintenance', 'Bulk'] as const
const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'] as const

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  Sedentary: 1.2,
  Light: 1.375,
  Moderate: 1.55,
  Active: 1.725,
  'Very Active': 1.9,
}

const GOAL_ADJUSTMENTS: Record<string, { calOffset: number; proteinPerKg: number; fatPct: number }> = {
  'Lean Muscle': { calOffset: 200, proteinPerKg: 2.0, fatPct: 0.25 },
  'Fat Loss': { calOffset: -400, proteinPerKg: 2.2, fatPct: 0.25 },
  Maintenance: { calOffset: 0, proteinPerKg: 1.6, fatPct: 0.30 },
  Bulk: { calOffset: 400, proteinPerKg: 1.8, fatPct: 0.30 },
}

export default function ProfilePage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [email, setEmail] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    age: '',
    weight_kg: '',
    height_cm: '',
    goal: 'Lean Muscle',
    activity_level: 'Moderate',
    calorie_target: '',
    protein_target: '',
    carb_target: '',
    fat_target: '',
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setForm({
          full_name: data.full_name ?? '',
          age: data.age?.toString() ?? '',
          weight_kg: data.weight_kg?.toString() ?? '',
          height_cm: data.height_cm?.toString() ?? '',
          goal: data.goal || 'Lean Muscle',
          activity_level: data.activity_level || 'Moderate',
          calorie_target: data.calorie_target?.toString() ?? '',
          protein_target: data.protein_target?.toString() ?? '',
          carb_target: data.carb_target?.toString() ?? '',
          fat_target: data.fat_target?.toString() ?? '',
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const autoCalculate = () => {
    const weight = parseFloat(form.weight_kg)
    const height = parseFloat(form.height_cm)
    const age = parseInt(form.age)

    if (!weight || !height || !age) {
      setMessage({ type: 'error', text: 'Fill in weight, height, and age first to auto-calculate.' })
      return
    }

    // Mifflin-St Jeor BMR (male default — can be extended)
    const bmr = 10 * weight + 6.25 * height - 5 * age + 5
    const multiplier = ACTIVITY_MULTIPLIERS[form.activity_level] ?? 1.55
    const tdee = Math.round(bmr * multiplier)

    const goalConfig = GOAL_ADJUSTMENTS[form.goal] ?? GOAL_ADJUSTMENTS['Lean Muscle']
    const calories = tdee + goalConfig.calOffset
    const protein = Math.round(weight * goalConfig.proteinPerKg)
    const fatCals = Math.round(calories * goalConfig.fatPct)
    const fat = Math.round(fatCals / 9)
    const proteinCals = protein * 4
    const carbCals = calories - proteinCals - fatCals
    const carbs = Math.round(carbCals / 4)

    setForm((prev) => ({
      ...prev,
      calorie_target: calories.toString(),
      protein_target: protein.toString(),
      carb_target: carbs.toString(),
      fat_target: fat.toString(),
    }))

    setMessage({ type: 'success', text: `Targets calculated: TDEE ${tdee} kcal, adjusted to ${calories} kcal for ${form.goal}.` })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to save your profile.' })
      setSaving(false)
      return
    }

    const payload = {
      id: user.id,
      full_name: form.full_name,
      age: form.age ? parseInt(form.age) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      goal: form.goal,
      activity_level: form.activity_level,
      calorie_target: form.calorie_target ? parseInt(form.calorie_target) : 2500,
      protein_target: form.protein_target ? parseInt(form.protein_target) : 150,
      carb_target: form.carb_target ? parseInt(form.carb_target) : 250,
      fat_target: form.fat_target ? parseInt(form.fat_target) : 80,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })

    if (error) {
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` })
    } else {
      setMessage({ type: 'success', text: 'Profile saved successfully!' })
    }

    setSaving(false)
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setMessage({ type: 'error', text: `Password update failed: ${error.message}` })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    }
  }

  const handleDeleteAccount = async () => {
    setMessage({ type: 'error', text: 'Account deletion requires server-side admin action. Contact support or implement via Edge Function.' })
    setShowDeleteConfirm(false)
  }

  if (loading) {
    return (
      <div className="text-white flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <User className="w-10 h-10 text-green-500 animate-pulse" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="text-white max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <User className="w-7 h-7 text-green-400" />
          <h1 className="text-2xl md:text-3xl font-bold">Profile Settings</h1>
        </div>
        <p className="text-gray-400">Manage your personal info, nutrition targets, and account.</p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Section 1: Personal Info ── */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-5">Personal Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">Full Name</label>
            <input
              type="text"
              className="input"
              placeholder="Your full name"
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Age</label>
            <input
              type="number"
              className="input"
              placeholder="25"
              value={form.age}
              onChange={(e) => updateField('age', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Weight (kg)</label>
            <input
              type="number"
              className="input"
              placeholder="70"
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => updateField('weight_kg', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Height (cm)</label>
            <input
              type="number"
              className="input"
              placeholder="175"
              value={form.height_cm}
              onChange={(e) => updateField('height_cm', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Goal</label>
            <select
              className="select"
              value={form.goal}
              onChange={(e) => updateField('goal', e.target.value)}
            >
              {GOALS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">Activity Level</label>
            <select
              className="select"
              value={form.activity_level}
              onChange={(e) => updateField('activity_level', e.target.value)}
            >
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Section 2: Nutrition Targets ── */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Nutrition Targets</h2>
          <button
            onClick={autoCalculate}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Calculator className="w-4 h-4" />
            Auto-Calculate
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Daily Calories (kcal)</label>
            <input
              type="number"
              className="input"
              placeholder="2500"
              value={form.calorie_target}
              onChange={(e) => updateField('calorie_target', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Protein (g)</label>
            <input
              type="number"
              className="input"
              placeholder="150"
              value={form.protein_target}
              onChange={(e) => updateField('protein_target', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Carbs (g)</label>
            <input
              type="number"
              className="input"
              placeholder="250"
              value={form.carb_target}
              onChange={(e) => updateField('carb_target', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Fat (g)</label>
            <input
              type="number"
              className="input"
              placeholder="80"
              value={form.fat_target}
              onChange={(e) => updateField('fat_target', e.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Auto-calculate uses the Mifflin-St Jeor equation with your weight, height, age, activity level, and goal to estimate targets.
        </p>
      </div>

      {/* ── Section 3: Account ── */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-5">Account</h2>

        {/* Email (read-only) */}
        <div className="mb-5">
          <label className="block text-sm text-gray-400 mb-1.5">Email</label>
          <input
            type="email"
            className="input opacity-60 cursor-not-allowed"
            value={email}
            readOnly
          />
          <p className="text-xs text-gray-500 mt-1">Email is linked to your auth account and cannot be changed here.</p>
        </div>

        {/* Change Password */}
        <div className="mb-5">
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
          ) : (
            <div className="space-y-3 p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleChangePassword} className="btn-primary text-sm">
                  Update Password
                </button>
                <button
                  onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword('') }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-danger flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteAccount}
                className="btn-danger text-sm font-semibold"
              >
                Yes, Delete My Account
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
