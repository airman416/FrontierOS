import type { Sport } from './graph'

export interface TodayTask {
  id: string
  shortLabel: string
  title: string
  detail: string
  sport: 'universal' | Sport
  technique:
    | 'Knowledge graph'
    | 'Physical frontier'
    | 'Expert tutor / autoregulation'
    | 'Objective readiness'
    | 'Spaced repetition'
    | 'Interleaving'
    | 'Testing effect'
    | 'Non-interference'
    | 'Automaticity'
    | 'Encompassings'
}

export const FUTURE_ROADMAP_ITEMS = [
  'Wearable & HRV readiness import',
  'Benchmark gates per graph node',
  'Session log & PDF export',
  'Parent read-only view',
  'Practice session builder',
] as const

export const TECHNIQUE_SWATCH: Record<TodayTask['technique'], string> = {
  'Knowledge graph': '#2563eb',
  'Physical frontier': '#7c3aed',
  'Expert tutor / autoregulation': '#db2777',
  'Objective readiness': '#ca8a04',
  'Spaced repetition': '#059669',
  Interleaving: '#3b82f6',
  'Testing effect': '#ea580c',
  'Non-interference': '#64748b',
  Automaticity: '#6366f1',
  Encompassings: '#0f766e',
}

export const TODAY_TASKS: TodayTask[] = [
  // ── Universal ──
  {
    id: 'mobility-core',
    shortLabel: 'Mobility + core',
    title: 'Ankle dorsiflexion + core anti-rotation',
    detail: 'Hit prerequisite nodes before heavy squats.',
    sport: 'universal',
    technique: 'Knowledge graph',
  },
  {
    id: 'aerobic-repeat',
    shortLabel: 'Repeat sprints',
    title: 'Repeat-sprint intervals',
    detail: 'Your limiter is late-inning repeat effort.',
    sport: 'universal',
    technique: 'Physical frontier',
  },
  {
    id: 'readiness-adjust',
    shortLabel: 'Auto-adjust',
    title: 'Intensity follows readiness',
    detail: 'CNS fatigued? Bar speed targets drop, recovery fueling bumps.',
    sport: 'universal',
    technique: 'Expert tutor / autoregulation',
  },
  {
    id: 'non-interference',
    shortLabel: 'Single focus',
    title: 'One motor pattern today',
    detail: 'Isolate one primary motor habit per micro-cycle.',
    sport: 'universal',
    technique: 'Non-interference',
  },
  {
    id: 'clearance-gate',
    shortLabel: 'Clearance check',
    title: 'Objective readiness check',
    detail: 'No social promotion — benchmarks gate advancement.',
    sport: 'universal',
    technique: 'Objective readiness',
  },

  // ── Baseball ──
  {
    id: 'batting-practice',
    shortLabel: 'BP reps',
    title: 'Batting practice — spaced reps',
    detail: 'Small daily doses beat one marathon block.',
    sport: 'baseball',
    technique: 'Spaced repetition',
  },
  {
    id: 'live-at-bats',
    shortLabel: 'Live ABs',
    title: 'Live at-bats: random pitching',
    detail: 'Matches game chaos — read the pitch and react.',
    sport: 'baseball',
    technique: 'Interleaving',
  },
  {
    id: 'pressure-abs',
    shortLabel: 'Clutch ABs',
    title: 'Pressure testing: high-leverage at-bats',
    detail: 'Soft-toss reps mask gaps. Hit against live arms.',
    sport: 'baseball',
    technique: 'Testing effect',
  },
  {
    id: 'automaticity-fielding',
    shortLabel: 'Glove work',
    title: 'Low-load fielding automaticity',
    detail: 'Field until subconscious — free attention for reads.',
    sport: 'baseball',
    technique: 'Automaticity',
  },
  {
    id: 'encompassings-baseball',
    shortLabel: 'Intrasquad',
    title: 'Intrasquad scrimmage',
    detail: 'Complex scenarios rehearse baserunning, fielding, and situational play at once.',
    sport: 'baseball',
    technique: 'Encompassings',
  },

  // ── Basketball ──
  {
    id: 'ball-handling-drill',
    shortLabel: 'Handle circuits',
    title: 'Ball handling circuits',
    detail: 'Crossover, behind-back, hesitation sequences.',
    sport: 'basketball',
    technique: 'Automaticity',
  },
  {
    id: 'shooting-reps',
    shortLabel: 'Shooting reps',
    title: 'Mid-range catch-and-shoot',
    detail: 'Spaced across the session for maximal retention.',
    sport: 'basketball',
    technique: 'Spaced repetition',
  },
  {
    id: 'defensive-slides',
    shortLabel: 'Def slides',
    title: 'Closeout and lateral movement',
    detail: 'Defensive slides under fatigue — expose real gaps.',
    sport: 'basketball',
    technique: 'Testing effect',
  },
  {
    id: 'pick-and-roll-reps',
    shortLabel: 'PnR reps',
    title: 'Pick & roll reads',
    detail: 'Read the defense: slip, pop, or reject the screen.',
    sport: 'basketball',
    technique: 'Interleaving',
  },
  {
    id: 'live-scrimmage',
    shortLabel: '5v5 scrimmage',
    title: 'Full-court 5v5 scrimmage',
    detail: 'Integrates offense, defense, and transition in game context.',
    sport: 'basketball',
    technique: 'Encompassings',
  },
]

export function tasksForSport(sport: Sport): TodayTask[] {
  return TODAY_TASKS.filter((t) => t.sport === 'universal' || t.sport === sport)
}
