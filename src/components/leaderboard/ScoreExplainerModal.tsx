'use client'

import { X, Info } from 'lucide-react'
import type { WeeklyScore } from '@/lib/types'

interface Props {
  score:    WeeklyScore
  username: string
  onClose:  () => void
}

export default function ScoreExplainerModal({ score, username, onClose }: Props) {
  const components = [
    {
      label:    'Goal Adherence',
      weight:   40,
      value:    score.adherence,
      color:    '#3b82f6',
      blurb:    'How close your daily kcal_in is to your TDEE-based target. Cuts aim 20% under, bulks 15% over, athletic = maintenance.',
    },
    {
      label:    'Calories Burnt',
      weight:   30,
      value:    score.burnt,
      color:    '#10b981',
      blurb:    'Total weekly kcal_burnt from logged exercise vs. a 2,500 kcal weekly target.',
    },
    {
      label:    'Consistency',
      weight:   20,
      value:    score.consistency,
      color:    '#f59e0b',
      blurb:    'Days with any logged activity (kcal in, workout, rest day) out of 7.',
    },
    {
      label:    'Goal Progress',
      weight:   10,
      value:    score.progress,
      color:    '#a78bfa',
      blurb:    'Movement of current weight toward target. Cuts reward weight loss, bulks reward gain, athletic rewards stability.',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            How {username}&apos;s score is built
          </h2>
          <button onClick={onClose} className="text-[#555] hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center py-3 bg-[#0e0e0e] rounded-2xl">
          <p className="text-4xl font-bold text-white">{score.total}</p>
          <p className="text-xs text-[#666] mt-1">/ 100 this week</p>
        </div>

        <div className="space-y-3">
          {components.map(c => (
            <div key={c.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: c.color }}>{c.label}</span>
                  <span className="text-[10px] text-[#555] font-mono">×{c.weight}%</span>
                </div>
                <span className="font-bold text-white">{c.value} <span className="text-[#555] font-normal">/ 100</span></span>
              </div>
              <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${c.value}%`, backgroundColor: c.color }}
                />
              </div>
              <p className="text-[10px] text-[#666] leading-relaxed">{c.blurb}</p>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#1a1a1a] text-center">
          <p className="text-[10px] text-[#555]">
            Total = adherence × 0.4 + burnt × 0.3 + consistency × 0.2 + progress × 0.1
          </p>
        </div>
      </div>
    </div>
  )
}
