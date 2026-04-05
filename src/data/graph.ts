export type ReadinessBand = 'full' | 'moderate' | 'severe'

export interface SkillDef {
  id: string
  label: string
  level: 1 | 2 | 3 | 4 | 5 | 6
  /** Prerequisite node ids (must be mastered) */
  prereqs: string[]
}

/** Strict hierarchical skill tree from PRD */
export const SKILL_DEFS: SkillDef[] = [
  { id: 'sleep-hygiene', label: 'Sleep Hygiene', level: 1, prereqs: [] },
  { id: 'joint-mobility', label: 'Joint Mobility', level: 1, prereqs: [] },
  { id: 'aerobic-base', label: 'Basic Aerobic Base', level: 1, prereqs: [] },
  {
    id: 'core-stability',
    label: 'Core Stability',
    level: 2,
    prereqs: ['joint-mobility'],
  },
  {
    id: 'anaerobic-capacity',
    label: 'Anaerobic Capacity',
    level: 2,
    prereqs: ['aerobic-base'],
  },
  {
    id: 'macro-tracking',
    label: 'Macronutrient Tracking',
    level: 2,
    prereqs: ['sleep-hygiene'],
  },
  {
    id: 'heavy-resistance',
    label: 'Heavy Resistance Training',
    level: 3,
    prereqs: ['core-stability'],
  },
  { id: 'form-shooting', label: 'Form Shooting', level: 3, prereqs: [] },
  { id: 'basic-dribbling', label: 'Basic Dribbling', level: 3, prereqs: [] },
  {
    id: 'defensive-stance',
    label: 'Defensive Stance',
    level: 3,
    prereqs: ['core-stability', 'anaerobic-capacity'],
  },
  {
    id: 'plyometrics',
    label: 'Plyometrics',
    level: 4,
    prereqs: ['heavy-resistance'],
  },
  {
    id: 'game-speed-catch-shoot',
    label: 'Game Speed Catch and Shoot',
    level: 4,
    prereqs: ['form-shooting', 'anaerobic-capacity'],
  },
  {
    id: 'advanced-ball-handling',
    label: 'Advanced Ball Handling',
    level: 4,
    prereqs: ['basic-dribbling'],
  },
  {
    id: 'shot-creation',
    label: 'Shot Creation off Dribble',
    level: 5,
    prereqs: [
      'advanced-ball-handling',
      'game-speed-catch-shoot',
      'plyometrics',
    ],
  },
  {
    id: 'game-day-fueling',
    label: 'Game Day Fueling',
    level: 5,
    prereqs: ['macro-tracking'],
  },
  {
    id: 'peak-performance',
    label: 'Peak Match Performance',
    level: 6,
    prereqs: ['shot-creation', 'game-day-fueling'],
  },
]

export const SKILL_BY_ID = Object.fromEntries(
  SKILL_DEFS.map((s) => [s.id, s]),
) as Record<string, SkillDef>

/** Directed edges: prerequisite → dependent (dependency tether) */
export function buildLinks(): { source: string; target: string }[] {
  const links: { source: string; target: string }[] = []
  for (const s of SKILL_DEFS) {
    for (const p of s.prereqs) {
      links.push({ source: p, target: s.id })
    }
  }
  return links
}

export function readinessBand(score: number): ReadinessBand {
  if (score >= 75) return 'full'
  if (score >= 40) return 'moderate'
  return 'severe'
}

export function bannerForReadiness(score: number): string {
  const band = readinessBand(score)
  if (band === 'full') {
    return 'Full readiness. The graph reflects your mastery progression and prerequisite gates.'
  }
  if (band === 'moderate') {
    return 'Central Nervous System fatigue detected. High velocity movements locked. Regressing training frontier to active recovery and mobility.'
  }
  return 'Severe fatigue. Only foundational recovery protocols remain active. Focus on sleep, mobility, and aerobic base.'
}
