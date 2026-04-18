import type { Sport } from './graph'

export type TaskTechnique =
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

export interface TodayTask {
  id: string
  shortLabel: string
  title: string
  detail: string
  sport: 'universal' | Sport
  technique: TaskTechnique
  /**
   * Primary skill this task advances. Per-skill task pools sum to 100 XP.
   * Optional on legacy static tasks (they fall back to the generic list).
   */
  skillId?: string
  /**
   * XP value. 1 XP ≈ 1 minute of fully-focused, fully-productive work for an
   * average serious student; 5–30 is the typical task range. Per-skill pools
   * sum to 100 so promoting a skill always requires 100 XP worth of work.
   */
  xp?: number
  /** "Why this task, why now" - shown to the student on the dashboard. */
  rationale?: string
}

export type PracticeTask = TodayTask

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
    detail: 'No social promotion - benchmarks gate advancement.',
    sport: 'universal',
    technique: 'Objective readiness',
  },

  // ── Baseball ──
  {
    id: 'batting-practice',
    shortLabel: 'BP reps',
    title: 'Batting practice - spaced reps',
    detail: 'Small daily doses beat one marathon block.',
    sport: 'baseball',
    technique: 'Spaced repetition',
  },
  {
    id: 'live-at-bats',
    shortLabel: 'Live ABs',
    title: 'Live at-bats: random pitching',
    detail: 'Matches game chaos - read the pitch and react.',
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
    detail: 'Field until subconscious - free attention for reads.',
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
    detail: 'Defensive slides under fatigue - expose real gaps.',
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

  // ── Soccer ──
  {
    id: 'rondo-drill',
    shortLabel: 'Rondo',
    title: 'Possession rondo - tight spaces',
    detail: 'First touch and passing under pressure.',
    sport: 'soccer',
    technique: 'Automaticity',
  },
  {
    id: 'crossing-reps',
    shortLabel: 'Crossing reps',
    title: 'Crossing & finishing sequences',
    detail: 'Spaced reps of wide delivery and runs into the box.',
    sport: 'soccer',
    technique: 'Spaced repetition',
  },
  {
    id: 'pressing-triggers',
    shortLabel: 'Press triggers',
    title: 'Pressing trigger recognition',
    detail: 'Read cues and press as a unit - expose defensive gaps.',
    sport: 'soccer',
    technique: 'Testing effect',
  },
  {
    id: 'set-piece-variations',
    shortLabel: 'Set pieces',
    title: 'Corner & free-kick variations',
    detail: 'Randomized set-piece routines to sharpen reads.',
    sport: 'soccer',
    technique: 'Interleaving',
  },
  {
    id: 'small-sided-game',
    shortLabel: 'SSG',
    title: 'Small-sided game - 7v7',
    detail: 'High-intensity game simulation with tactical constraints.',
    sport: 'soccer',
    technique: 'Encompassings',
  },

  // ── Swimming ──
  {
    id: 'stroke-drill',
    shortLabel: 'Stroke drills',
    title: 'Stroke-specific drill set',
    detail: 'Isolated catch and pull patterns until automatic.',
    sport: 'swimming',
    technique: 'Automaticity',
  },
  {
    id: 'interval-sets',
    shortLabel: 'Interval sets',
    title: 'Descending interval sets',
    detail: 'Spaced pace targets with active rest.',
    sport: 'swimming',
    technique: 'Spaced repetition',
  },
  {
    id: 'race-pace-test',
    shortLabel: 'Race pace',
    title: 'Race-pace broken swim',
    detail: 'Split a race into segments - hit target pace per segment.',
    sport: 'swimming',
    technique: 'Testing effect',
  },
  {
    id: 'mixed-stroke-set',
    shortLabel: 'Mixed strokes',
    title: 'IM-order stroke rotation',
    detail: 'Alternate strokes to build versatility and transitions.',
    sport: 'swimming',
    technique: 'Interleaving',
  },
  {
    id: 'mock-meet',
    shortLabel: 'Mock meet',
    title: 'Simulated meet - full warm-up to race',
    detail: 'Practice the entire meet-day routine under time pressure.',
    sport: 'swimming',
    technique: 'Encompassings',
  },

  // ── Tennis ──
  {
    id: 'rally-consistency',
    shortLabel: 'Rally reps',
    title: 'Cross-court rally consistency',
    detail: 'Build stroke grooves with targeted rally patterns.',
    sport: 'tennis',
    technique: 'Automaticity',
  },
  {
    id: 'serve-practice',
    shortLabel: 'Serve reps',
    title: 'Serve placement practice',
    detail: 'Spaced serving to targets across the service box.',
    sport: 'tennis',
    technique: 'Spaced repetition',
  },
  {
    id: 'tiebreak-sim',
    shortLabel: 'Tiebreak sim',
    title: 'Tiebreak simulation under pressure',
    detail: 'Point-play starting at 4-4 to train clutch performance.',
    sport: 'tennis',
    technique: 'Testing effect',
  },
  {
    id: 'mixed-point-play',
    shortLabel: 'Mixed points',
    title: 'Serve & return point play',
    detail: 'Alternate serving and returning to sharpen both skills.',
    sport: 'tennis',
    technique: 'Interleaving',
  },
  {
    id: 'practice-match',
    shortLabel: 'Practice set',
    title: 'Full practice set with coaching',
    detail: 'Full match simulation with tactical feedback between games.',
    sport: 'tennis',
    technique: 'Encompassings',
  },

  // ── Wrestling ──
  {
    id: 'takedown-drill',
    shortLabel: 'TD drill',
    title: 'Takedown repetition circuits',
    detail: 'Single-leg and double-leg drills until automatic.',
    sport: 'wrestling',
    technique: 'Automaticity',
  },
  {
    id: 'chain-drill',
    shortLabel: 'Chain reps',
    title: 'Chain wrestling sequences',
    detail: 'Spaced reps linking failed attempts to follow-up attacks.',
    sport: 'wrestling',
    technique: 'Spaced repetition',
  },
  {
    id: 'live-wrestling',
    shortLabel: 'Live goes',
    title: 'Live wrestling from neutral',
    detail: 'Full resistance - expose real gaps in positioning.',
    sport: 'wrestling',
    technique: 'Testing effect',
  },
  {
    id: 'position-rotation',
    shortLabel: 'Position rotation',
    title: 'Rotate top, bottom, neutral',
    detail: 'Interleave all three positions to build adaptability.',
    sport: 'wrestling',
    technique: 'Interleaving',
  },
  {
    id: 'scrimmage-match',
    shortLabel: 'Scrimmage',
    title: 'Full 6-minute scrimmage match',
    detail: 'Complete match simulation with score and time pressure.',
    sport: 'wrestling',
    technique: 'Encompassings',
  },

  // ── Volleyball ──
  {
    id: 'passing-reps',
    shortLabel: 'Passing reps',
    title: 'Serve-receive passing circuits',
    detail: 'Platform angle and footwork drilled to automatic.',
    sport: 'volleyball',
    technique: 'Automaticity',
  },
  {
    id: 'hitting-lines',
    shortLabel: 'Hitting lines',
    title: 'Approach and attack hitting lines',
    detail: 'Spaced approach-jump-hit sequences to varied zones.',
    sport: 'volleyball',
    technique: 'Spaced repetition',
  },
  {
    id: 'block-dig-test',
    shortLabel: 'Block-dig',
    title: 'Block-dig transition drill',
    detail: 'React to the hitter - block or dig under game pressure.',
    sport: 'volleyball',
    technique: 'Testing effect',
  },
  {
    id: 'rotation-drill',
    shortLabel: 'Rotation drill',
    title: 'Six-rotation offensive drill',
    detail: 'Rotate through all positions to build system fluency.',
    sport: 'volleyball',
    technique: 'Interleaving',
  },
  {
    id: 'wash-drill',
    shortLabel: 'Wash drill',
    title: 'Wash drill - full rally simulation',
    detail: 'Complete rally sequences integrating serve, pass, set, and attack.',
    sport: 'volleyball',
    technique: 'Encompassings',
  },
]

export function tasksForSport(sport: Sport): TodayTask[] {
  return TODAY_TASKS.filter((t) => t.sport === 'universal' || t.sport === sport)
}
