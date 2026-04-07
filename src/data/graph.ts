export type ReadinessBand = 'full' | 'moderate' | 'severe'

export interface SkillDef {
  id: string
  label: string
  level: 1 | 2 | 3 | 4 | 5 | 6
  prereqs: string[]
}

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
  { id: 'batting-tee-work', label: 'Batting Tee Work', level: 3, prereqs: [] },
  { id: 'basic-fielding', label: 'Basic Fielding', level: 3, prereqs: [] },
  {
    id: 'defensive-positioning',
    label: 'Defensive Positioning',
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
    id: 'live-pitch-hitting',
    label: 'Live Pitch Hitting',
    level: 4,
    prereqs: ['batting-tee-work', 'anaerobic-capacity'],
  },
  {
    id: 'advanced-fielding',
    label: 'Advanced Fielding',
    level: 4,
    prereqs: ['basic-fielding'],
  },
  {
    id: 'situational-hitting',
    label: 'Situational Hitting',
    level: 5,
    prereqs: [
      'advanced-fielding',
      'live-pitch-hitting',
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
    label: 'Peak Game Performance',
    level: 6,
    prereqs: ['situational-hitting', 'game-day-fueling'],
  },
]

export const SKILL_BY_ID = Object.fromEntries(
  SKILL_DEFS.map((s) => [s.id, s]),
) as Record<string, SkillDef>

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
  if (band === 'full') return 'Full readiness — all gates open.'
  if (band === 'moderate') return 'CNS fatigue detected — high-velocity work locked.'
  return 'Severe fatigue — recovery protocols only.'
}
