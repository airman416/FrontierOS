export interface TodayTask {
  id: string
  shortLabel: string
  title: string
  detail: string
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
  {
    id: 'mobility-core',
    shortLabel: 'Mobility + core',
    title: 'Ankle dorsiflexion + core anti-rotation',
    detail: 'Hit prerequisite nodes before heavy squats.',
    technique: 'Knowledge graph',
  },
  {
    id: 'aerobic-repeat',
    shortLabel: 'Repeat sprints',
    title: 'Repeat-sprint intervals',
    detail: 'Your limiter is late-inning repeat effort.',
    technique: 'Physical frontier',
  },
  {
    id: 'readiness-adjust',
    shortLabel: 'Auto-adjust',
    title: 'Intensity follows readiness',
    detail: 'CNS fatigued? Bar speed targets drop, recovery fueling bumps.',
    technique: 'Expert tutor / autoregulation',
  },
  {
    id: 'batting-practice',
    shortLabel: 'BP reps',
    title: 'Batting practice — spaced reps',
    detail: 'Small daily doses beat one marathon block.',
    technique: 'Spaced repetition',
  },
  {
    id: 'live-at-bats',
    shortLabel: 'Live ABs',
    title: 'Live at-bats: random pitching',
    detail: 'Matches game chaos — read the pitch and react.',
    technique: 'Interleaving',
  },
  {
    id: 'pressure-abs',
    shortLabel: 'Clutch ABs',
    title: 'Pressure testing: high-leverage at-bats',
    detail: 'Soft-toss reps mask gaps. Hit against live arms.',
    technique: 'Testing effect',
  },
  {
    id: 'clearance-gate',
    shortLabel: 'Clearance check',
    title: 'Objective readiness check',
    detail: 'No social promotion — benchmarks gate advancement.',
    technique: 'Objective readiness',
  },
  {
    id: 'non-interference',
    shortLabel: 'Single focus',
    title: 'One motor pattern today',
    detail: 'Isolate one primary motor habit per micro-cycle.',
    technique: 'Non-interference',
  },
  {
    id: 'automaticity',
    shortLabel: 'Glove work',
    title: 'Low-load fielding automaticity',
    detail: 'Field until subconscious — free attention for reads.',
    technique: 'Automaticity',
  },
  {
    id: 'encompassings',
    shortLabel: 'Intrasquad',
    title: 'Intrasquad scrimmage',
    detail: 'Complex scenarios rehearse baserunning, fielding, and situational play at once.',
    technique: 'Encompassings',
  },
]
