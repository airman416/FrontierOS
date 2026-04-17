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
  /**
   * Coach-graded diagnostic probe — a concrete pass/fail task the coach can
   * run with the athlete in ~30–60s to decide whether this skill is known.
   * Only AI-generated graphs carry this; omitted on the legacy static graph.
   */
  diagnosticPrompt?: string
}

export const SKILL_DEFS: SkillDef[] = [
  // ── Universal (Level 1–5) ──
  { id: 'sleep-hygiene', label: 'Sleep Hygiene', level: 1, prereqs: [], sport: 'universal', diagnosticPrompt: 'Ask 3 quick questions: bedtime, wake time, screens in bed. Pass = 7+ hrs + no screens last hour.' },
  { id: 'joint-mobility', label: 'Joint Mobility', level: 1, prereqs: [], sport: 'universal', diagnosticPrompt: 'Deep bodyweight squat, heels flat, arms overhead. Hold 3s without heel lift or collapse.' },
  { id: 'aerobic-base', label: 'Basic Aerobic Base', level: 1, prereqs: [], sport: 'universal', diagnosticPrompt: '60s line-to-line jog (~100m). Finish breathing through nose, able to talk a full sentence.' },
  { id: 'core-stability', label: 'Core Stability', level: 2, prereqs: ['joint-mobility'], sport: 'universal', diagnosticPrompt: '45s tall plank — flag hip drop, lumbar sag, or elbow drift as partial/fail.' },
  { id: 'anaerobic-capacity', label: 'Anaerobic Capacity', level: 2, prereqs: ['aerobic-base'], sport: 'universal', diagnosticPrompt: '6 × 20yd sprints, 10s rest each. Last rep must stay within 1s of first rep.' },
  { id: 'macro-tracking', label: 'Macronutrient Tracking', level: 2, prereqs: ['sleep-hygiene'], sport: 'universal', diagnosticPrompt: 'Recall yesterday\'s meals. Pass = names 3 meals and can estimate protein source + carb source.' },
  { id: 'heavy-resistance', label: 'Heavy Resistance Training', level: 3, prereqs: ['core-stability'], sport: 'universal', diagnosticPrompt: '3 bodyweight goblet-squat reps with clean depth, neutral spine, knees tracking. Dumbbell optional.' },
  { id: 'plyometrics', label: 'Plyometrics', level: 4, prereqs: ['heavy-resistance'], sport: 'universal', diagnosticPrompt: '5 broad jumps, stick each landing 2s without hop or knee valgus. Fail = any wobble on landing.' },

  // ── Baseball (Level 3–6) ──
  { id: 'batting-tee-work', label: 'Batting Tee Work', level: 3, prereqs: [], sport: 'baseball', diagnosticPrompt: '5 swings off a tee into a net; 4 of 5 must come off the bat as line drives, not ground balls or pop-ups.' },
  { id: 'basic-fielding', label: 'Basic Fielding', level: 3, prereqs: [], sport: 'baseball', diagnosticPrompt: 'Field 5 rolled grounders from 30ft; clean glove-to-throw transfer on 4 of 5.' },
  { id: 'defensive-positioning', label: 'Defensive Positioning', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'baseball', diagnosticPrompt: 'Call out where they\'d stand for a RH pull-hitter at their position. Correct zone = pass.' },
  { id: 'live-pitch-hitting', label: 'Live Pitch Hitting', level: 4, prereqs: ['batting-tee-work', 'anaerobic-capacity'], sport: 'baseball', diagnosticPrompt: '5 coach-tossed pitches from 30ft; make solid contact (no whiffs/foul-tips) on 3 of 5.' },
  { id: 'advanced-fielding', label: 'Advanced Fielding', level: 4, prereqs: ['basic-fielding'], sport: 'baseball', diagnosticPrompt: '3 backhand grounders moving to the glove side; clean field + set feet to throw on 2 of 3.' },

  // ── Basketball (Level 3–6) ──
  { id: 'ball-handling', label: 'Ball Handling', level: 3, prereqs: [], sport: 'basketball', diagnosticPrompt: '20s cone dribble: crossover → between-legs → behind-back. Pass = no fumbles, head up last 5s.' },
  { id: 'shooting-form', label: 'Shooting Form', level: 3, prereqs: [], sport: 'basketball', diagnosticPrompt: '5 free-throws; flag elbow flare, thumb-flick, or double-hand release. Pass = 4 of 5 clean form (not necessarily makes).' },
  { id: 'defensive-stance', label: 'Defensive Stance', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'basketball', diagnosticPrompt: '10s defensive slide across the lane and back; stay low, no crossover of feet.' },
  { id: 'court-vision', label: 'Court Vision', level: 4, prereqs: ['ball-handling', 'anaerobic-capacity'], sport: 'basketball', diagnosticPrompt: 'Dribble to the elbow with eyes up; coach holds up 1/2 fingers — call it out 3 of 3 times.' },
  { id: 'mid-range-shooting', label: 'Mid-Range Shooting', level: 4, prereqs: ['shooting-form', 'core-stability'], sport: 'basketball', diagnosticPrompt: '5 catch-and-shoot from the elbow, no dribble; make 3 of 5 with clean form.' },
  { id: 'help-defense', label: 'Help Defense', level: 4, prereqs: ['defensive-stance'], sport: 'basketball', diagnosticPrompt: 'Walk through a help-side rotation on a drive from the wing: show correct position (one-pass-away split line).' },

  // ── Soccer (Level 3–6) ──
  { id: 'first-touch', label: 'First Touch', level: 3, prereqs: [], sport: 'soccer', diagnosticPrompt: 'Coach plays 5 firm ground balls from 10yd; first touch must stay within 1 yard on 4 of 5.' },
  { id: 'passing-accuracy', label: 'Passing Accuracy', level: 3, prereqs: [], sport: 'soccer', diagnosticPrompt: '5 inside-foot passes to a 2-yard cone gate from 15yd; 4 of 5 through the gate.' },
  { id: 'defensive-marking', label: 'Defensive Marking', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'soccer', diagnosticPrompt: 'Shadow a walking partner with ball over 10yd; stay goal-side, show correct body shape.' },
  { id: 'dribbling-moves', label: '1v1 Dribbling', level: 4, prereqs: ['first-touch', 'anaerobic-capacity'], sport: 'soccer', diagnosticPrompt: 'Beat a cone with a scissor or step-over, then accelerate 5yd. Execute cleanly on 2 of 3 attempts.' },
  { id: 'crossing-delivery', label: 'Crossing & Delivery', level: 4, prereqs: ['passing-accuracy', 'core-stability'], sport: 'soccer', diagnosticPrompt: '3 crosses from the flag to the 6-yd box; 2 of 3 must land in the box, off the ground.' },
  { id: 'pressing-shape', label: 'Pressing & Shape', level: 4, prereqs: ['defensive-marking'], sport: 'soccer', diagnosticPrompt: 'Coach describes a 2v2 scenario — athlete shows correct first-defender/second-defender positions.' },

  // ── Swimming (Level 3–6) ──
  { id: 'freestyle-technique', label: 'Freestyle Technique', level: 3, prereqs: [], sport: 'swimming', diagnosticPrompt: 'One 25yd freestyle length. Watch for breathing to both sides, high-elbow catch, 2-beat kick.' },
  { id: 'backstroke-technique', label: 'Backstroke Technique', level: 3, prereqs: [], sport: 'swimming', diagnosticPrompt: 'One 25yd backstroke. Flat hips, straight line; flag snake-arms or sinking hips.' },
  { id: 'kick-efficiency', label: 'Kick Efficiency', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'swimming', diagnosticPrompt: '25yd kick with board, no fins. Must finish under 30s with narrow, ankles-loose kick.' },
  { id: 'flip-turns', label: 'Flip Turns', level: 4, prereqs: ['freestyle-technique', 'core-stability'], sport: 'swimming', diagnosticPrompt: 'One flip-turn off the wall into a 5yd breakout. Must leave wall on back-to-side rotation, not surface early.' },
  { id: 'butterfly-technique', label: 'Butterfly Technique', level: 4, prereqs: ['kick-efficiency', 'anaerobic-capacity'], sport: 'swimming', diagnosticPrompt: '25yd butterfly. Must hold 2-kicks-per-stroke rhythm; flag head-first lifts or single-kick cycles.' },
  { id: 'open-water-skills', label: 'Open Water Skills', level: 4, prereqs: ['backstroke-technique'], sport: 'swimming', diagnosticPrompt: 'Demonstrate sighting: 3 strokes + head-up sight at a wall target, without stopping. Pass = 3 of 3 clean sights.' },

  // ── Tennis (Level 3–6) ──
  { id: 'forehand-groundstroke', label: 'Forehand Groundstroke', level: 3, prereqs: [], sport: 'tennis', diagnosticPrompt: '5 coach-fed forehands from the baseline; 3 of 5 must clear the net and land inside the singles court.' },
  { id: 'backhand-groundstroke', label: 'Backhand Groundstroke', level: 3, prereqs: [], sport: 'tennis', diagnosticPrompt: '5 coach-fed backhands from the baseline; 3 of 5 land in with a stable two-hand or one-hand grip.' },
  { id: 'court-movement', label: 'Court Movement', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'tennis', diagnosticPrompt: 'Spider drill: 5 cones, touch and recover to center. Must finish in <15s with split-step at each cone.' },
  { id: 'serve-mechanics', label: 'Serve Mechanics', level: 4, prereqs: ['forehand-groundstroke', 'core-stability'], sport: 'tennis', diagnosticPrompt: '3 first serves; flag tossing arm collapse, no knee bend, or arm-only swing. 2 of 3 clean motions = pass.' },
  { id: 'net-volleys', label: 'Net Volleys', level: 4, prereqs: ['backhand-groundstroke', 'court-movement'], sport: 'tennis', diagnosticPrompt: '5 coach-fed volleys (forehand + backhand) at the net; 4 of 5 punched back over, no swing.' },
  { id: 'return-of-serve', label: 'Return of Serve', level: 4, prereqs: ['court-movement'], sport: 'tennis', diagnosticPrompt: '3 coach-hit medium serves; athlete must split-step on ball toss and return 2 of 3 into play.' },

  // ── Wrestling (Level 3–6) ──
  { id: 'stance-motion', label: 'Stance & Motion', level: 3, prereqs: [], sport: 'wrestling', diagnosticPrompt: '15s of staggered stance + level-change motion. Must stay in stance, no standing up, knees don\'t touch mat.' },
  { id: 'takedown-basics', label: 'Takedown Basics', level: 3, prereqs: [], sport: 'wrestling', diagnosticPrompt: 'Shoot a double-leg on a standing partner (cooperative). Penetration step + drive through hips. 2 of 3 clean.' },
  { id: 'mat-awareness', label: 'Mat Awareness', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'wrestling', diagnosticPrompt: 'From bottom referee\'s position, call out where the edge of the mat is without looking. Must be within 2ft.' },
  { id: 'leg-attacks', label: 'Leg Attacks', level: 4, prereqs: ['stance-motion', 'anaerobic-capacity'], sport: 'wrestling', diagnosticPrompt: 'Single-leg finish drill on cooperative partner — change of level + elevate + finish. 2 of 3 clean finishes.' },
  { id: 'top-control', label: 'Top Control & Turns', level: 4, prereqs: ['takedown-basics', 'core-stability'], sport: 'wrestling', diagnosticPrompt: '20s on top riding position — hand control, hip pressure; partner cannot stand or cut free.' },
  { id: 'escape-standup', label: 'Escape & Stand-up', level: 4, prereqs: ['mat-awareness'], sport: 'wrestling', diagnosticPrompt: 'Stand-up escape from bottom referee\'s position — hand control + post leg + separate. 2 of 3 clean.' },
  { id: 'chain-wrestling', label: 'Chain Wrestling', level: 5, prereqs: ['leg-attacks', 'top-control', 'plyometrics'], sport: 'wrestling' },
  { id: 'counter-offense', label: 'Counter Offense', level: 5, prereqs: ['escape-standup', 'top-control'], sport: 'wrestling' },
  { id: 'peak-match-wrestling', label: 'Peak Match Performance', level: 6, prereqs: ['chain-wrestling', 'counter-offense', 'game-day-fueling'], sport: 'wrestling' },

  // ── Volleyball (Level 3–6) ──
  { id: 'passing-platform', label: 'Passing Platform', level: 3, prereqs: [], sport: 'volleyball', diagnosticPrompt: '5 coach-tossed balls to their platform; 4 of 5 controlled to target within 3ft, no arm swing.' },
  { id: 'setting-technique', label: 'Setting Technique', level: 3, prereqs: [], sport: 'volleyball', diagnosticPrompt: '5 overhead sets to a 10ft target; 4 of 5 land in the target with clean hand contact, no lift.' },
  { id: 'serve-receive', label: 'Serve Receive', level: 3, prereqs: ['core-stability', 'anaerobic-capacity'], sport: 'volleyball', diagnosticPrompt: '3 coach-served balls (float); athlete must shuffle into position + pass to target on 2 of 3.' },
  { id: 'attacking-approach', label: 'Attacking Approach', level: 4, prereqs: ['passing-platform', 'anaerobic-capacity'], sport: 'volleyball', diagnosticPrompt: 'Show a 3-step or 4-step approach with proper arm swing; repeat 3 times. Pass = consistent footwork + full arm extension.' },
  { id: 'block-timing', label: 'Block Timing', level: 4, prereqs: ['setting-technique', 'core-stability'], sport: 'volleyball', diagnosticPrompt: 'Coach throws ball over net from 3ft high; athlete blocks with penetrating hands on 2 of 3 timing attempts.' },
  { id: 'defensive-dig', label: 'Defensive Dig', level: 4, prereqs: ['serve-receive'], sport: 'volleyball', diagnosticPrompt: '3 coach-tossed attacks from 10ft; athlete reads + digs up on 2 of 3 with controlled platform.' },
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
