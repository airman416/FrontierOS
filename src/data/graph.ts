export type ReadinessBand = 'full' | 'moderate' | 'severe'

export type Sport = 'baseball' | 'basketball' | 'soccer' | 'swimming' | 'tennis' | 'wrestling' | 'volleyball'
export const SPORTS: Sport[] = ['baseball', 'basketball', 'soccer', 'swimming', 'tennis', 'wrestling', 'volleyball']

export const SPORT_OPTIONS = [
  'baseball',
  'basketball',
  'soccer',
  'swimming',
  'tennis',
  'wrestling',
  'volleyball',
] as const

export interface SkillDef {
  id: string
  label: string
  level: 1 | 2 | 3 | 4 | 5 | 6
  prereqs: string[]
  sport: 'universal' | Sport
  summary?: string
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

  // ── Soccer (Level 3–6) ──
  { id: 'first-touch', label: 'First Touch', level: 3, prereqs: [], sport: 'soccer' },
  { id: 'passing-accuracy', label: 'Passing Accuracy', level: 3, prereqs: [], sport: 'soccer' },
  { id: 'defensive-marking', label: 'Defensive Marking', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'soccer' },
  { id: 'dribbling-moves', label: '1v1 Dribbling', level: 4, prereqs: ['first-touch', 'anaerobic-capacity'], sport: 'soccer' },
  { id: 'crossing-delivery', label: 'Crossing & Delivery', level: 4, prereqs: ['passing-accuracy', 'core-stability'], sport: 'soccer' },
  { id: 'pressing-shape', label: 'Pressing & Shape', level: 4, prereqs: ['defensive-marking'], sport: 'soccer' },
  { id: 'finishing', label: 'Finishing', level: 5, prereqs: ['dribbling-moves', 'crossing-delivery', 'plyometrics'], sport: 'soccer' },
  { id: 'set-piece-execution', label: 'Set Piece Execution', level: 5, prereqs: ['crossing-delivery', 'pressing-shape'], sport: 'soccer' },
  { id: 'peak-game-soccer', label: 'Peak Game Performance', level: 6, prereqs: ['finishing', 'set-piece-execution', 'game-day-fueling'], sport: 'soccer' },

  // ── Swimming (Level 3–6) ──
  { id: 'freestyle-technique', label: 'Freestyle Technique', level: 3, prereqs: [], sport: 'swimming' },
  { id: 'backstroke-technique', label: 'Backstroke Technique', level: 3, prereqs: [], sport: 'swimming' },
  { id: 'kick-efficiency', label: 'Kick Efficiency', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'swimming' },
  { id: 'flip-turns', label: 'Flip Turns', level: 4, prereqs: ['freestyle-technique', 'core-stability'], sport: 'swimming' },
  { id: 'butterfly-technique', label: 'Butterfly Technique', level: 4, prereqs: ['kick-efficiency', 'anaerobic-capacity'], sport: 'swimming' },
  { id: 'open-water-skills', label: 'Open Water Skills', level: 4, prereqs: ['backstroke-technique'], sport: 'swimming' },
  { id: 'race-pacing', label: 'Race Pacing', level: 5, prereqs: ['flip-turns', 'butterfly-technique', 'plyometrics'], sport: 'swimming' },
  { id: 'dive-starts', label: 'Dive Starts', level: 5, prereqs: ['flip-turns', 'open-water-skills'], sport: 'swimming' },
  { id: 'peak-race-swimming', label: 'Peak Race Performance', level: 6, prereqs: ['race-pacing', 'dive-starts', 'game-day-fueling'], sport: 'swimming' },

  // ── Tennis (Level 3–6) ──
  { id: 'forehand-groundstroke', label: 'Forehand Groundstroke', level: 3, prereqs: [], sport: 'tennis' },
  { id: 'backhand-groundstroke', label: 'Backhand Groundstroke', level: 3, prereqs: [], sport: 'tennis' },
  { id: 'court-movement', label: 'Court Movement', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'tennis' },
  { id: 'serve-mechanics', label: 'Serve Mechanics', level: 4, prereqs: ['forehand-groundstroke', 'core-stability'], sport: 'tennis' },
  { id: 'net-volleys', label: 'Net Volleys', level: 4, prereqs: ['backhand-groundstroke', 'court-movement'], sport: 'tennis' },
  { id: 'return-of-serve', label: 'Return of Serve', level: 4, prereqs: ['court-movement'], sport: 'tennis' },
  { id: 'tactical-patterns', label: 'Tactical Patterns', level: 5, prereqs: ['serve-mechanics', 'net-volleys', 'plyometrics'], sport: 'tennis' },
  { id: 'mental-toughness-tennis', label: 'Mental Toughness', level: 5, prereqs: ['return-of-serve', 'net-volleys'], sport: 'tennis' },
  { id: 'peak-match-tennis', label: 'Peak Match Performance', level: 6, prereqs: ['tactical-patterns', 'mental-toughness-tennis', 'game-day-fueling'], sport: 'tennis' },

  // ── Wrestling (Level 3–6) ──
  { id: 'stance-motion', label: 'Stance & Motion', level: 3, prereqs: [], sport: 'wrestling' },
  { id: 'takedown-basics', label: 'Takedown Basics', level: 3, prereqs: [], sport: 'wrestling' },
  { id: 'mat-awareness', label: 'Mat Awareness', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'wrestling' },
  { id: 'leg-attacks', label: 'Leg Attacks', level: 4, prereqs: ['stance-motion', 'anaerobic-capacity'], sport: 'wrestling' },
  { id: 'top-control', label: 'Top Control & Turns', level: 4, prereqs: ['takedown-basics', 'core-stability'], sport: 'wrestling' },
  { id: 'escape-standup', label: 'Escape & Stand-up', level: 4, prereqs: ['mat-awareness'], sport: 'wrestling' },
  { id: 'chain-wrestling', label: 'Chain Wrestling', level: 5, prereqs: ['leg-attacks', 'top-control', 'plyometrics'], sport: 'wrestling' },
  { id: 'counter-offense', label: 'Counter Offense', level: 5, prereqs: ['escape-standup', 'top-control'], sport: 'wrestling' },
  { id: 'peak-match-wrestling', label: 'Peak Match Performance', level: 6, prereqs: ['chain-wrestling', 'counter-offense', 'game-day-fueling'], sport: 'wrestling' },

  // ── Volleyball (Level 3–6) ──
  { id: 'passing-platform', label: 'Passing Platform', level: 3, prereqs: [], sport: 'volleyball' },
  { id: 'setting-technique', label: 'Setting Technique', level: 3, prereqs: [], sport: 'volleyball' },
  { id: 'serve-receive', label: 'Serve Receive', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'volleyball' },
  { id: 'attacking-approach', label: 'Attacking Approach', level: 4, prereqs: ['passing-platform', 'anaerobic-capacity'], sport: 'volleyball' },
  { id: 'block-timing', label: 'Block Timing', level: 4, prereqs: ['setting-technique', 'core-stability'], sport: 'volleyball' },
  { id: 'defensive-dig', label: 'Defensive Dig', level: 4, prereqs: ['serve-receive'], sport: 'volleyball' },
  { id: 'offensive-systems', label: 'Offensive Systems', level: 5, prereqs: ['attacking-approach', 'block-timing', 'plyometrics'], sport: 'volleyball' },
  { id: 'transition-play', label: 'Transition Play', level: 5, prereqs: ['defensive-dig', 'block-timing'], sport: 'volleyball' },
  { id: 'peak-game-volleyball', label: 'Peak Game Performance', level: 6, prereqs: ['offensive-systems', 'transition-play', 'game-day-fueling'], sport: 'volleyball' },
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
