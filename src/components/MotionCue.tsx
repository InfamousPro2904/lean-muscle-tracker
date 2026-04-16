'use client'

import type { MotionType } from '@/lib/exercise-presets'

type Props = {
  motion: MotionType
  name: string
  className?: string
}

const BLUE = '#3b82f6'
const BLUE_DIM = 'rgba(59,130,246,0.15)'
const AMBER = '#f59e0b'

export default function MotionCue({ motion, name, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="w-24 h-24 rounded-2xl bg-[#0e0e0e] border border-[#1e1e1e] flex items-center justify-center overflow-hidden">
        {renderFigure(motion)}
      </div>
      <span className="text-[10px] text-[#555] tracking-wide uppercase text-center leading-tight max-w-[90px]">
        {motionLabel(motion)}
      </span>
    </div>
  )
}

function motionLabel(motion: MotionType): string {
  const labels: Record<MotionType, string> = {
    press: 'Push / Press',
    fly: 'Arc / Fly',
    push: 'Push Up',
    pull_vertical: 'Pull Down',
    pull_horizontal: 'Row / Pull',
    curl: 'Bicep Curl',
    extension_elbow: 'Tricep Extend',
    extension_knee: 'Leg Extension',
    hip_hinge: 'Hip Hinge',
    hip_thrust: 'Hip Thrust',
    squat: 'Squat',
    raise: 'Lateral Raise',
    crunch: 'Crunch / Abs',
    rotation: 'Rotation',
  }
  return labels[motion] ?? motion
}

// ── Shared figure drawing helpers ──────────────────────────────────

function Head({ cx, cy, r = 5 }: { cx: number | string; cy: number | string; r?: number | string }) {
  return <circle cx={cx} cy={cy} r={r} fill={BLUE_DIM} stroke={BLUE} strokeWidth="1.5" />
}

function Stick({ x1, y1, x2, y2, color = BLUE, w = 2 }: {
  x1: number | string; y1: number | string; x2: number | string; y2: number | string
  color?: string; w?: number | string
}) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeLinecap="round" />
}

// ── Per-motion stick figures ───────────────────────────────────────

function renderFigure(motion: MotionType) {
  switch (motion) {

    // ── Bench Press / Press motion ──
    // Figure lying flat, arms pressing up
    case 'press':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Bench */}
          <rect x="10" y="46" width="60" height="5" rx="2" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
          {/* Body (lying) */}
          <Stick x1="20" y1="44" x2="60" y2="44" />
          {/* Head */}
          <Head cx="64" cy="44" r="5" />
          {/* Arms pressing - animated */}
          <g style={{ animation: 'press-out 1.5s ease-in-out infinite', transformOrigin: '25px 44px' }}>
            <Stick x1="25" y1="44" x2="25" y2="28" />
            <Stick x1="22" y1="28" x2="28" y2="28" color={AMBER} w={2.5} />
          </g>
          <g style={{ animation: 'press-out 1.5s ease-in-out infinite', transformOrigin: '45px 44px' }}>
            <Stick x1="45" y1="44" x2="45" y2="28" />
            <Stick x1="42" y1="28" x2="48" y2="28" color={AMBER} w={2.5} />
          </g>
          {/* Legs */}
          <Stick x1="20" y1="44" x2="15" y2="56" />
          <Stick x1="20" y1="44" x2="25" y2="56" />
        </svg>
      )

    // ── Fly / Arc ──
    // Standing figure, arms sweep inward
    case 'fly':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          <Head cx="40" cy="14" />
          {/* Torso */}
          <Stick x1="40" y1="19" x2="40" y2="50" />
          {/* Arms arc out / in */}
          <g style={{ animation: 'rotate-out 1.6s ease-in-out infinite', transformOrigin: '40px 30px' }}>
            <Stick x1="40" y1="30" x2="18" y2="26" />
          </g>
          <g style={{ animation: 'rotate-out 1.6s ease-in-out infinite', animationDirection: 'reverse', transformOrigin: '40px 30px' }}>
            <Stick x1="40" y1="30" x2="62" y2="26" />
          </g>
          {/* Legs */}
          <Stick x1="40" y1="50" x2="32" y2="68" />
          <Stick x1="40" y1="50" x2="48" y2="68" />
        </svg>
      )

    // ── Push (Push-up) ──
    // Figure in plank / push-up position
    case 'push':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Floor */}
          <line x1="8" y1="60" x2="72" y2="60" stroke="#222" strokeWidth="1.5" />
          {/* Head */}
          <Head cx="68" cy="44" r="5" />
          {/* Body (plank) */}
          <Stick x1="62" y1="44" x2="20" y2="44" />
          {/* Arms - animated push */}
          <g style={{ animation: 'push-up 1.4s ease-in-out infinite', transformOrigin: '20px 44px' }}>
            <Stick x1="20" y1="44" x2="16" y2="60" />
            <Stick x1="20" y1="44" x2="26" y2="60" />
          </g>
          {/* Feet */}
          <Stick x1="62" y1="44" x2="60" y2="60" />
          <Stick x1="62" y1="44" x2="66" y2="60" />
        </svg>
      )

    // ── Pull-down (Lat Pulldown) ──
    // Figure seated, pulling bar down
    case 'pull_vertical':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Seat */}
          <rect x="26" y="54" width="28" height="4" rx="2" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
          {/* Head */}
          <Head cx="40" cy="18" />
          {/* Bar at top */}
          <line x1="14" y1="10" x2="66" y2="10" stroke="#333" strokeWidth="2" />
          {/* Body seated */}
          <Stick x1="40" y1="23" x2="40" y2="53" />
          {/* Arms pulling bar down - animated */}
          <g style={{ animation: 'pull-down 1.4s ease-in-out infinite' }}>
            <Stick x1="40" y1="23" x2="22" y2="14" />
            <Stick x1="40" y1="23" x2="58" y2="14" />
            {/* Hands on bar */}
            <circle cx="22" cy="14" r="2.5" fill={BLUE_DIM} stroke={BLUE} strokeWidth="1" />
            <circle cx="58" cy="14" r="2.5" fill={BLUE_DIM} stroke={BLUE} strokeWidth="1" />
          </g>
          {/* Legs */}
          <Stick x1="40" y1="53" x2="28" y2="66" />
          <Stick x1="40" y1="53" x2="52" y2="66" />
        </svg>
      )

    // ── Row / Pull Horizontal ──
    // Figure bent over pulling toward body
    case 'pull_horizontal':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Head */}
          <Head cx="64" cy="36" />
          {/* Torso bent 45° */}
          <Stick x1="58" y1="36" x2="30" y2="50" />
          {/* Arms rowing - animated */}
          <g style={{ animation: 'press-in 1.4s ease-in-out infinite' }}>
            <Stick x1="44" y1="43" x2="20" y2="46" />
            <Stick x1="44" y1="43" x2="20" y2="54" />
            <circle cx="20" cy="50" r="3" fill={BLUE_DIM} stroke={BLUE} strokeWidth="1" />
          </g>
          {/* Legs */}
          <Stick x1="30" y1="50" x2="22" y2="68" />
          <Stick x1="30" y1="50" x2="38" y2="68" />
        </svg>
      )

    // ── Bicep Curl ──
    // Standing, forearm rotating up
    case 'curl':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          <Head cx="40" cy="12" />
          {/* Torso */}
          <Stick x1="40" y1="17" x2="40" y2="48" />
          {/* Upper arm (static) */}
          <Stick x1="40" y1="26" x2="54" y2="38" />
          <Stick x1="40" y1="26" x2="26" y2="38" />
          {/* Forearm curling - animated */}
          <g style={{ animation: 'curl-up 1.6s ease-in-out infinite', transformOrigin: '26px 38px' }}>
            <Stick x1="26" y1="38" x2="20" y2="26" />
            <circle cx="20" cy="24" r="3.5" fill={BLUE_DIM} stroke={AMBER} strokeWidth="1.5" />
          </g>
          {/* Legs */}
          <Stick x1="40" y1="48" x2="32" y2="66" />
          <Stick x1="40" y1="48" x2="48" y2="66" />
        </svg>
      )

    // ── Tricep Extension ──
    // Arm overhead extending down
    case 'extension_elbow':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          <Head cx="40" cy="12" />
          <Stick x1="40" y1="17" x2="40" y2="48" />
          {/* Upper arm overhead */}
          <Stick x1="40" y1="22" x2="52" y2="14" />
          {/* Forearm extending - animated */}
          <g style={{ animation: 'push-up 1.4s ease-in-out infinite', transformOrigin: '52px 14px' }}>
            <Stick x1="52" y1="14" x2="60" y2="28" />
            <circle cx="61" cy="30" r="3.5" fill={BLUE_DIM} stroke={AMBER} strokeWidth="1.5" />
          </g>
          <Stick x1="40" y1="22" x2="28" y2="30" />
          <Stick x1="40" y1="48" x2="32" y2="66" />
          <Stick x1="40" y1="48" x2="48" y2="66" />
        </svg>
      )

    // ── Leg Extension ──
    // Seated, lower leg swinging up
    case 'extension_knee':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Chair */}
          <rect x="20" y="48" width="40" height="4" rx="2" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
          <Stick x1="20" y1="52" x2="20" y2="70" color="#2a2a2a" />
          <Stick x1="60" y1="52" x2="60" y2="70" color="#2a2a2a" />
          {/* Head */}
          <Head cx="40" cy="16" />
          {/* Torso upright */}
          <Stick x1="40" y1="21" x2="40" y2="48" />
          {/* Arms on seat sides */}
          <Stick x1="40" y1="32" x2="20" y2="38" />
          <Stick x1="40" y1="32" x2="60" y2="38" />
          {/* Thigh (seated) */}
          <Stick x1="40" y1="48" x2="28" y2="54" />
          {/* Lower leg extending - animated */}
          <g style={{ animation: 'push-up 1.5s ease-in-out infinite', transformOrigin: '28px 54px' }}>
            <Stick x1="28" y1="54" x2="14" y2="54" />
            <circle cx="13" cy="54" r="3.5" fill={BLUE_DIM} stroke={AMBER} strokeWidth="1.5" />
          </g>
        </svg>
      )

    // ── Hip Hinge (Deadlift / RDL) ──
    // Figure hinges at hip, torso parallel to floor
    case 'hip_hinge':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Floor */}
          <line x1="8" y1="68" x2="72" y2="68" stroke="#222" strokeWidth="1.5" />
          {/* Head */}
          <Head cx="68" cy="34" />
          {/* Torso hinged - animated */}
          <g style={{ animation: 'hinge 1.6s ease-in-out infinite', transformOrigin: '40px 50px' }}>
            <Stick x1="40" y1="50" x2="66" y2="36" />
          </g>
          {/* Hips */}
          <circle cx="40" cy="50" r="4" fill={BLUE_DIM} stroke={BLUE} strokeWidth="1.5" />
          {/* Legs straight */}
          <Stick x1="40" y1="50" x2="34" y2="68" />
          <Stick x1="40" y1="50" x2="46" y2="68" />
          {/* Arms hanging - animated with torso */}
          <g style={{ animation: 'hinge 1.6s ease-in-out infinite', transformOrigin: '40px 50px' }}>
            <Stick x1="56" y1="42" x2="52" y2="54" color={AMBER} />
          </g>
        </svg>
      )

    // ── Hip Thrust ──
    // Figure on floor, hips thrusting up
    case 'hip_thrust':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Floor */}
          <line x1="8" y1="68" x2="72" y2="68" stroke="#222" strokeWidth="1.5" />
          {/* Bench for back */}
          <rect x="8" y="46" width="20" height="6" rx="2" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
          <g style={{ animation: 'push-up 1.5s ease-in-out infinite', transformOrigin: '40px 52px' }}>
            {/* Torso (resting on bench) */}
            <Stick x1="14" y1="50" x2="40" y2="50" />
            {/* Hips up */}
            <Stick x1="40" y1="50" x2="54" y2="60" />
          </g>
          {/* Head */}
          <Head cx="14" cy="43" />
          {/* Legs bent on floor */}
          <Stick x1="54" y1="60" x2="54" y2="68" />
          <Stick x1="54" y1="60" x2="62" y2="60" />
          <Stick x1="62" y1="60" x2="62" y2="68" />
        </svg>
      )

    // ── Squat ──
    // Full stick figure squatting down
    case 'squat':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Floor */}
          <line x1="8" y1="72" x2="72" y2="72" stroke="#222" strokeWidth="1.5" />
          <g style={{ animation: 'squat-down 1.8s ease-in-out infinite' }}>
            {/* Head */}
            <Head cx="40" cy="14" />
            {/* Torso */}
            <Stick x1="40" y1="19" x2="40" y2="44" />
            {/* Arms out for balance */}
            <Stick x1="40" y1="30" x2="20" y2="36" />
            <Stick x1="40" y1="30" x2="60" y2="36" />
            {/* Thighs (spread) */}
            <Stick x1="40" y1="44" x2="22" y2="58" />
            <Stick x1="40" y1="44" x2="58" y2="58" />
            {/* Lower legs */}
            <Stick x1="22" y1="58" x2="18" y2="72" />
            <Stick x1="58" y1="58" x2="62" y2="72" />
          </g>
        </svg>
      )

    // ── Lateral Raise ──
    // Arms raising to sides
    case 'raise':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          <Head cx="40" cy="12" />
          <Stick x1="40" y1="17" x2="40" y2="48" />
          {/* Arms raising - animated */}
          <g style={{ animation: 'rotate-out 1.5s ease-in-out infinite', transformOrigin: '40px 28px' }}>
            <Stick x1="40" y1="28" x2="16" y2="36" />
            <circle cx="15" cy="36" r="3.5" fill={BLUE_DIM} stroke={AMBER} strokeWidth="1.5" />
          </g>
          <g style={{ animation: 'rotate-out 1.5s ease-in-out infinite', animationDirection: 'reverse', transformOrigin: '40px 28px' }}>
            <Stick x1="40" y1="28" x2="64" y2="36" />
            <circle cx="65" cy="36" r="3.5" fill={BLUE_DIM} stroke={AMBER} strokeWidth="1.5" />
          </g>
          <Stick x1="40" y1="48" x2="32" y2="66" />
          <Stick x1="40" y1="48" x2="48" y2="66" />
        </svg>
      )

    // ── Crunch / Ab ──
    // Figure crunching torso toward knees
    case 'crunch':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Floor */}
          <line x1="8" y1="72" x2="72" y2="72" stroke="#222" strokeWidth="1.5" />
          {/* Lower body flat */}
          <Stick x1="40" y1="62" x2="28" y2="72" />
          <Stick x1="40" y1="62" x2="52" y2="72" />
          {/* Hips */}
          <Stick x1="20" y1="62" x2="60" y2="62" />
          {/* Torso crunching - animated */}
          <g style={{ animation: 'curl-up 1.6s ease-in-out infinite', transformOrigin: '40px 62px' }}>
            <Stick x1="40" y1="62" x2="40" y2="44" />
            <Head cx="40" cy="40" />
            <Stick x1="40" y1="50" x2="26" y2="56" />
            <Stick x1="40" y1="50" x2="54" y2="56" />
          </g>
        </svg>
      )

    // ── Rotation (Obliques / Cable Twist) ──
    case 'rotation':
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          <Head cx="40" cy="12" />
          {/* Torso rotating - animated */}
          <g style={{ animation: 'rotate-out 1.4s ease-in-out infinite', transformOrigin: '40px 32px' }}>
            <Stick x1="40" y1="17" x2="40" y2="48" />
            <Stick x1="40" y1="28" x2="18" y2="34" />
            <Stick x1="40" y1="28" x2="62" y2="22" />
            <circle cx="62" cy="22" r="3.5" fill={BLUE_DIM} stroke={AMBER} strokeWidth="1.5" />
          </g>
          <Stick x1="40" y1="48" x2="32" y2="66" />
          <Stick x1="40" y1="48" x2="48" y2="66" />
          {/* Rotation arc */}
          <path d="M 60 36 A 20 20 0 0 0 20 36" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeDasharray="3,3" />
        </svg>
      )

    default:
      return (
        <svg viewBox="0 0 80 80" width="80" height="80">
          <Head cx="40" cy="12" />
          <Stick x1="40" y1="17" x2="40" y2="48" />
          <Stick x1="40" y1="28" x2="22" y2="38" />
          <Stick x1="40" y1="28" x2="58" y2="38" />
          <Stick x1="40" y1="48" x2="32" y2="66" />
          <Stick x1="40" y1="48" x2="48" y2="66" />
        </svg>
      )
  }
}
