'use client'

// Simple front + back muscle diagram SVG.
// Active regions are highlighted with blue fill + pulsing glow animation.

type Props = {
  /** Muscle group IDs that are currently active, e.g. ['chest', 'shoulders'] */
  activeGroups: string[]
  className?: string
}

const FILL_INACTIVE = '#1e1e1e'
const FILL_ACTIVE = 'rgba(59,130,246,0.5)'
const STROKE_INACTIVE = '#333'
const STROKE_ACTIVE = '#3b82f6'

function fill(id: string, active: string[]): { fill: string; stroke: string; className: string } {
  const on = active.includes(id)
  return {
    fill: on ? FILL_ACTIVE : FILL_INACTIVE,
    stroke: on ? STROKE_ACTIVE : STROKE_INACTIVE,
    className: on ? 'muscle-active' : '',
  }
}

export default function MuscleDiagram({ activeGroups, className = '' }: Props) {
  const a = (id: string) => fill(id, activeGroups)

  return (
    <div className={`flex gap-6 items-start justify-center ${className}`}>
      {/* Front view */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-[#555] font-medium tracking-wider uppercase">Front</span>
        <svg viewBox="0 0 100 220" width="90" height="198" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <ellipse cx="50" cy="14" rx="10" ry="12" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {/* Neck */}
          <rect x="46" y="24" width="8" height="8" rx="2" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {/* Shoulders */}
          <ellipse cx="29" cy="38" rx="12" ry="8" {...a('shoulders')} strokeWidth="1.5" />
          <ellipse cx="71" cy="38" rx="12" ry="8" {...a('shoulders')} strokeWidth="1.5" />
          {/* Chest */}
          <path d="M38 32 Q50 28 62 32 L64 50 Q50 54 36 50 Z" {...a('chest')} strokeWidth="1.5" />
          {/* Upper arms (biceps) */}
          <rect x="16" y="44" width="12" height="28" rx="6" {...a('biceps')} strokeWidth="1.5" />
          <rect x="72" y="44" width="12" height="28" rx="6" {...a('biceps')} strokeWidth="1.5" />
          {/* Forearms */}
          <rect x="17" y="74" width="10" height="22" rx="5" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          <rect x="73" y="74" width="10" height="22" rx="5" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {/* Abs */}
          <rect x="40" y="52" width="7" height="9" rx="2" {...a('abs')} strokeWidth="1.2" />
          <rect x="53" y="52" width="7" height="9" rx="2" {...a('abs')} strokeWidth="1.2" />
          <rect x="40" y="63" width="7" height="9" rx="2" {...a('abs')} strokeWidth="1.2" />
          <rect x="53" y="63" width="7" height="9" rx="2" {...a('abs')} strokeWidth="1.2" />
          <rect x="40" y="74" width="7" height="8" rx="2" {...a('abs')} strokeWidth="1.2" />
          <rect x="53" y="74" width="7" height="8" rx="2" {...a('abs')} strokeWidth="1.2" />
          {/* Obliques */}
          <path d="M36 56 Q34 70 36 84" {...a('obliques')} strokeWidth="3" fill="none" />
          <path d="M64 56 Q66 70 64 84" {...a('obliques')} strokeWidth="3" fill="none" />
          {/* Hips/pelvis */}
          <path d="M36 84 Q50 88 64 84 L64 94 Q50 98 36 94 Z" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {/* Quads */}
          <rect x="37" y="96" width="12" height="42" rx="6" {...a('quads')} strokeWidth="1.5" />
          <rect x="51" y="96" width="12" height="42" rx="6" {...a('quads')} strokeWidth="1.5" />
          {/* Knees */}
          <ellipse cx="43" cy="140" rx="6" ry="5" fill="#161616" stroke="#333" strokeWidth="1" />
          <ellipse cx="57" cy="140" rx="6" ry="5" fill="#161616" stroke="#333" strokeWidth="1" />
          {/* Shins */}
          <rect x="39" y="146" width="9" height="32" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          <rect x="53" y="146" width="9" height="32" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {/* Feet */}
          <ellipse cx="43" cy="181" rx="8" ry="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          <ellipse cx="57" cy="181" rx="8" ry="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
        </svg>
      </div>

      {/* Back view */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-[#555] font-medium tracking-wider uppercase">Back</span>
        <svg viewBox="0 0 100 220" width="90" height="198" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <ellipse cx="50" cy="14" rx="10" ry="12" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {/* Neck */}
          <rect x="46" y="24" width="8" height="8" rx="2" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {/* Rear delts */}
          <ellipse cx="29" cy="38" rx="12" ry="8" {...a('rear_delts')} strokeWidth="1.5" />
          <ellipse cx="71" cy="38" rx="12" ry="8" {...a('rear_delts')} strokeWidth="1.5" />
          {/* Traps (upper) */}
          <path d="M40 28 Q50 24 60 28 L62 38 Q50 42 38 38 Z" {...a('traps')} strokeWidth="1.5" />
          {/* Lats */}
          <path d="M34 40 Q32 58 36 76 Q38 80 44 80 Q42 62 40 46 Z" {...a('lats')} strokeWidth="1.5" />
          <path d="M66 40 Q68 58 64 76 Q62 80 56 80 Q58 62 60 46 Z" {...a('lats')} strokeWidth="1.5" />
          {/* Upper arms (triceps back view) */}
          <rect x="16" y="44" width="12" height="28" rx="6" {...a('triceps')} strokeWidth="1.5" />
          <rect x="72" y="44" width="12" height="28" rx="6" {...a('triceps')} strokeWidth="1.5" />
          {/* Forearms */}
          <rect x="17" y="74" width="10" height="22" rx="5" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          <rect x="73" y="74" width="10" height="22" rx="5" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {/* Spinal erectors */}
          <rect x="46" y="40" width="4" height="38" rx="2" fill="#1a1a1a" stroke="#333" strokeWidth="0.8" />
          <rect x="47" y="40" width="6" height="38" rx="2" fill="none" stroke="#2a2a2a" strokeWidth="0.5" />
          {/* Glutes */}
          <path d="M36 84 Q43 100 50 104 Q57 100 64 84 L64 94 Q57 108 50 112 Q43 108 36 94 Z" {...a('glutes')} strokeWidth="1.5" />
          {/* Hamstrings */}
          <rect x="37" y="110" width="12" height="36" rx="6" {...a('hamstrings')} strokeWidth="1.5" />
          <rect x="51" y="110" width="12" height="36" rx="6" {...a('hamstrings')} strokeWidth="1.5" />
          {/* Knee pockets */}
          <ellipse cx="43" cy="148" rx="6" ry="5" fill="#161616" stroke="#333" strokeWidth="1" />
          <ellipse cx="57" cy="148" rx="6" ry="5" fill="#161616" stroke="#333" strokeWidth="1" />
          {/* Calves */}
          <ellipse cx="43" cy="166" rx="5" ry="15" {...a('calves')} strokeWidth="1.5" />
          <ellipse cx="57" cy="166" rx="5" ry="15" {...a('calves')} strokeWidth="1.5" />
          {/* Feet */}
          <ellipse cx="43" cy="183" rx="8" ry="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          <ellipse cx="57" cy="183" rx="8" ry="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}
