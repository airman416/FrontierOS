export type ReadinessBand = 'full' | 'moderate' | 'severe'

export type Sport = 'baseball' | 'basketball'
export const SPORTS: Sport[] = ['baseball', 'basketball']

export interface SkillDef {
  id: string
  label: string
  level: 1 | 2 | 3 | 4 | 5 | 6
  prereqs: string[]
  sport: 'universal' | Sport
}

export const SKILL_DEFS: SkillDef[] = [
  // ── Universal (Level 1–5) ──
  { id: 'sleep-hygiene', label: 'Sleep Hygiene', level: 1, prereqs: [], sport: 'universal' },
  { id: 'joint-mobility', label: 'Joint Mobility', level: 1, prereqs: [], sport: 'universal' },
  { id: 'aerobic-base', label: 'Basic Aerobic Base', level: 1, prereqs: [], sport: 'universal' },
  { id: 'core-stability', label: 'Core Stability', level: 2, prereqs: ['joint-mobility'], sport: 'universal' },
  { id: 'anaerobic-capacity', label: 'Anaerobic Capacity', level: 2, prereqs: ['aerobic-base'], sport: 'universal' },
  { id: 'macro-tracking', label: 'Macronutrient Tracking', level: 2, prereqs: ['sleep-hygiene'], sport: 'universal' },
  { id: 'heavy-resistance', label: 'Heavy Resistance Training', level: 3, prereqs: ['core-stability'], sport: 'universal' },
  { id: 'plyometrics', label: 'Plyometrics', level: 4, prereqs: ['heavy-resistance'], sport: 'universal' },
  { id: 'game-day-fueling', label: 'Game Day Fueling', level: 5, prereqs: ['macro-tracking'], sport: 'universal' },

  // ── Baseball (Level 3–6) ──
  { id: 'batting-tee-work', label: 'Batting Tee Work', level: 3, prereqs: [], sport: 'baseball' },
  { id: 'basic-fielding', label: 'Basic Fielding', level: 3, prereqs: [], sport: 'baseball' },
  { id: 'defensive-positioning', label: 'Defensive Positioning', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'baseball' },
  { id: 'live-pitch-hitting', label: 'Live Pitch Hitting', level: 4, prereqs: ['batting-tee-work', 'anaerobic-capacity'], sport: 'baseball' },
  { id: 'advanced-fielding', label: 'Advanced Fielding', level: 4, prereqs: ['basic-fielding'], sport: 'baseball' },
  { id: 'situational-hitting', label: 'Situational Hitting', level: 5, prereqs: ['advanced-fielding', 'live-pitch-hitting', 'plyometrics'], sport: 'baseball' },
  { id: 'peak-game-baseball', label: 'Peak Game Performance', level: 6, prereqs: ['situational-hitting', 'game-day-fueling'], sport: 'baseball' },

  // ── Basketball (Level 3–6) ──
  { id: 'ball-handling', label: 'Ball Handling', level: 3, prereqs: [], sport: 'basketball' },
  { id: 'shooting-form', label: 'Shooting Form', level: 3, prereqs: [], sport: 'basketball' },
  { id: 'defensive-stance', label: 'Defensive Stance', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'basketball' },
  { id: 'court-vision', label: 'Court Vision', level: 4, prereqs: ['ball-handling', 'anaerobic-capacity'], sport: 'basketball' },
  { id: 'mid-range-shooting', label: 'Mid-Range Shooting', level: 4, prereqs: ['shooting-form', 'core-stability'], sport: 'basketball' },
  { id: 'help-defense', label: 'Help Defense', level: 4, prereqs: ['defensive-stance'], sport: 'basketball' },
  { id: 'pick-and-roll', label: 'Pick & Roll', level: 5, prereqs: ['court-vision', 'mid-range-shooting', 'plyometrics'], sport: 'basketball' },
  { id: 'three-point-shooting', label: 'Three-Point Shooting', level: 5, prereqs: ['mid-range-shooting', 'help-defense'], sport: 'basketball' },
  { id: 'peak-game-basketball', label: 'Peak Game Performance', level: 6, prereqs: ['pick-and-roll', 'three-point-shooting', 'game-day-fueling'], sport: 'basketball' },
]

export const SKILL_BY_ID = Object.fromEntries(
  SKILL_DEFS.map((s) => [s.id, s]),
) as Record<string, SkillDef>

export function skillsForSport(sport: Sport): SkillDef[] {
  return SKILL_DEFS.filter((s) => s.sport === 'universal' || s.sport === sport)
}

export function buildLinks(sport?: Sport): { source: string; target: string }[] {
  const defs = sport ? skillsForSport(sport) : SKILL_DEFS
  const idSet = new Set(defs.map((s) => s.id))
  const links: { source: string; target: string }[] = []
  for (const s of defs) {
    for (const p of s.prereqs) {
      if (idSet.has(p)) links.push({ source: p, target: s.id })
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
