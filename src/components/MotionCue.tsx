'use client'

import type { MotionType } from '@/lib/exercise-presets'

type Props = {
  motion: MotionType
  name: string
  className?: string
}

// Each motion renders a small CSS-animated SVG icon showing the movement direction.
export default function MotionCue({ motion, name, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="w-20 h-20 rounded-2xl bg-[#161616] border border-[#252525] flex items-center justify-center overflow-hidden">
        {renderMotion(motion)}
      </div>
      <span className="text-[10px] text-[#555] tracking-wide uppercase text-center leading-tight max-w-[80px]">
        {motionLabel(motion)}
      </span>
    </div>
  )
}

function motionLabel(motion: MotionType): string {
  const labels: Record<MotionType, string> = {
    press: 'Press / Push',
    fly: 'Arc / Fly',
    push: 'Push Away',
    pull_vertical: 'Pull Down',
    pull_horizontal: 'Pull Back',
    curl: 'Curl Up',
    extension_elbow: 'Extend',
    extension_knee: 'Extend Leg',
    hip_hinge: 'Hip Hinge',
    hip_thrust: 'Hip Thrust',
    squat: 'Squat',
    raise: 'Raise',
    crunch: 'Crunch',
    rotation: 'Rotate',
  }
  return labels[motion] ?? motion
}

function renderMotion(motion: MotionType) {
  switch (motion) {
    case 'press':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <g style={{ animation: 'press-out 1.4s ease-in-out infinite' }}>
            <path d="M32 30 L50 30" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M46 25 L52 30 L46 35" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g style={{ animation: 'press-in 1.4s ease-in-out infinite' }}>
            <path d="M28 30 L10 30" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 25 L8 30 L14 35" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <circle cx="30" cy="30" r="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      )

    case 'fly':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <path
            d="M30 36 Q16 24 12 16"
            fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"
            style={{ animation: 'rotate-out 1.6s ease-in-out infinite' }}
          />
          <path
            d="M30 36 Q44 24 48 16"
            fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"
            style={{ animation: 'rotate-out 1.6s ease-in-out infinite', animationDirection: 'reverse' }}
          />
          <circle cx="30" cy="38" r="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      )

    case 'push':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <g style={{ animation: 'pull-down 1.4s ease-in-out infinite' }}>
            <path d="M30 36 L30 14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M24 18 L30 12 L36 18" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <rect x="20" y="38" width="20" height="8" rx="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      )

    case 'pull_vertical':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <path d="M30 8 L30 44" stroke="#2a2a2a" strokeWidth="2" strokeDasharray="3,3" />
          <g style={{ animation: 'pull-down 1.4s ease-in-out infinite' }}>
            <circle cx="30" cy="14" r="5" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M30 20 L30 44" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M24 40 L30 46 L36 40" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      )

    case 'pull_horizontal':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <path d="M52 30 L8 30" stroke="#2a2a2a" strokeWidth="2" strokeDasharray="3,3" />
          <g style={{ animation: 'press-in 1.4s ease-in-out infinite' }}>
            <circle cx="46" cy="30" r="5" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M40 30 L16 30" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M20 24 L14 30 L20 36" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      )

    case 'curl':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <path d="M30 48 L30 34" stroke="#2a2a2a" strokeWidth="2" />
          <g style={{ animation: 'curl-up 1.6s ease-in-out infinite', transformOrigin: '30px 48px' }}>
            <path d="M30 34 Q28 22 22 16" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="22" cy="15" r="5" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
          </g>
        </svg>
      )

    case 'extension_elbow':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <path d="M30 12 L30 26" stroke="#2a2a2a" strokeWidth="2" />
          <g style={{ animation: 'push-up 1.4s ease-in-out infinite', transformOrigin: '30px 26px' }}>
            <path d="M30 26 L30 46" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M24 42 L30 48 L36 42" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <circle cx="30" cy="26" r="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      )

    case 'extension_knee':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <path d="M30 10 L30 32" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round" />
          <g style={{ animation: 'push-up 1.5s ease-in-out infinite', transformOrigin: '30px 32px' }}>
            <path d="M30 32 L30 52" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M24 48 L30 54 L36 48" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <circle cx="30" cy="32" r="5" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      )

    case 'hip_hinge':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <g style={{ animation: 'hinge 1.6s ease-in-out infinite', transformOrigin: '30px 38px' }}>
            <line x1="30" y1="12" x2="30" y2="36" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <line x1="30" y1="38" x2="30" y2="52" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="30" cy="38" r="5" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
          <path d="M14 36 L30 36" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2,2" />
        </svg>
      )

    case 'hip_thrust':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <line x1="8" y1="46" x2="52" y2="46" stroke="#2a2a2a" strokeWidth="2" />
          <g style={{ animation: 'push-up 1.4s ease-in-out infinite', transformOrigin: '30px 46px' }}>
            <path d="M16 46 L16 34 Q30 22 44 34 L44 46" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 28 L30 20 L36 28" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      )

    case 'squat':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <g style={{ animation: 'squat-down 1.6s ease-in-out infinite' }}>
            <circle cx="30" cy="14" r="6" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
            <line x1="30" y1="20" x2="30" y2="34" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M30 34 L20 48" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M30 34 L40 48" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </svg>
      )

    case 'raise':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <g style={{ animation: 'rotate-out 1.5s ease-in-out infinite', transformOrigin: '30px 36px' }}>
            <line x1="10" y1="36" x2="28" y2="36" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g style={{ animation: 'rotate-out 1.5s ease-in-out infinite', animationDirection: 'reverse', transformOrigin: '30px 36px' }}>
            <line x1="32" y1="36" x2="50" y2="36" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <rect x="25" y="26" width="10" height="20" rx="5" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      )

    case 'crunch':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <line x1="16" y1="48" x2="44" y2="48" stroke="#2a2a2a" strokeWidth="2" />
          <g style={{ animation: 'curl-up 1.5s ease-in-out infinite', transformOrigin: '30px 42px' }}>
            <path d="M18 42 Q30 36 42 42" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M24 36 Q30 24 36 18" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="30" cy="16" r="6" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
          </g>
        </svg>
      )

    case 'rotation':
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <path d="M44 30 A14 14 0 0 0 16 30" fill="none" stroke="#2a2a2a" strokeWidth="2" strokeDasharray="3,3" />
          <g style={{ animation: 'rotate-out 1.4s ease-in-out infinite', transformOrigin: '30px 30px' }}>
            <line x1="30" y1="30" x2="44" y2="28" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40 22 L46 28 L40 34" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <circle cx="30" cy="30" r="5" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      )

    default:
      return (
        <svg viewBox="0 0 60 60" width="48" height="48">
          <circle cx="30" cy="30" r="16" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      )
  }
}
