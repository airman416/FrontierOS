import { create } from 'zustand'
import {
  readinessBand,
  SKILL_DEFS,
  type ReadinessBand,
  type SkillDef,
  type Sport,
} from '../data/graph'
import {
  ATHLETES,
  INITIAL_ATHLETE_MASTERY,
  INITIAL_ATHLETE_READINESS,
  type Athlete,
} from '../data/athletes'
import { TODAY_TASKS, type TodayTask } from '../data/student'
import type { GeneratedGraph, GraphDelta, SportPlan } from '../lib/graphSchema'
import { resolveAthleteGraph } from '../lib/graphDelta'

export type BuilderTarget =
  | { kind: 'sport'; sport: Sport | string }
  | { kind: 'athlete'; athleteId: string }

export type VisualRole = 'locked' | 'frontier' | 'mastered' | 'highRisk'

export interface SportData {
  skills: SkillDef[]
  athletes: Athlete[]
  tasks: TodayTask[]
  skillShortLabels: Record<string, string>
}

const STORAGE_KEY = 'frontier-athlete-graphs'
const SPORT_PLANS_KEY = 'frontier-sport-plans'
const ATHLETE_DELTAS_KEY = 'frontier-athlete-deltas'
const MASTERY_KEY = 'frontier-athlete-mastery'
const READINESS_KEY = 'frontier-athlete-readiness'

function loadGraphsFromStorage(): Record<string, GeneratedGraph> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, GeneratedGraph>
  } catch {
    return {}
  }
}

function saveGraphsToStorage(graphs: Record<string, GeneratedGraph>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs))
  } catch { /* quota exceeded */ }
}

function loadSportPlansFromStorage(): Record<string, SportPlan> {
  try {
    const raw = localStorage.getItem(SPORT_PLANS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, SportPlan>
  } catch {
    return {}
  }
}

function saveSportPlansToStorage(plans: Record<string, SportPlan>) {
  try {
    localStorage.setItem(SPORT_PLANS_KEY, JSON.stringify(plans))
  } catch { /* quota exceeded */ }
}

function loadAthleteDeltasFromStorage(): Record<string, GraphDelta> {
  try {
    const raw = localStorage.getItem(ATHLETE_DELTAS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, GraphDelta>
  } catch {
    return {}
  }
}

function saveAthleteDeltasToStorage(deltas: Record<string, GraphDelta>) {
  try {
    localStorage.setItem(ATHLETE_DELTAS_KEY, JSON.stringify(deltas))
  } catch { /* quota exceeded */ }
}

function saveMasteryToStorage(mastery: Record<string, Set<string>>) {
  try {
    const serializable: Record<string, string[]> = {}
    for (const [id, set] of Object.entries(mastery)) {
      serializable[id] = [...set]
    }
    localStorage.setItem(MASTERY_KEY, JSON.stringify(serializable))
  } catch { /* quota exceeded */ }
}

function loadMasteryFromStorage(): Record<string, Set<string>> | null {
  try {
    const raw = localStorage.getItem(MASTERY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, string[]>
    const result: Record<string, Set<string>> = {}
    for (const [id, arr] of Object.entries(parsed)) {
      result[id] = new Set(arr)
    }
    return result
  } catch {
    return null
  }
}

function saveReadinessToStorage(readiness: Record<string, number>) {
  try {
    localStorage.setItem(READINESS_KEY, JSON.stringify(readiness))
  } catch { /* quota exceeded */ }
}

function loadReadinessFromStorage(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(READINESS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return null
  }
}

const DEFAULT_SKILL_SHORT: Record<string, string> = {
  // Universal
  'sleep-hygiene': 'Sleep',
  'joint-mobility': 'Mobility',
  'aerobic-base': 'Aerobic',
  'core-stability': 'Core',
  'anaerobic-capacity': 'Anaerobic',
  'macro-tracking': 'Macros',
  'heavy-resistance': 'Resistance',
  plyometrics: 'Plyo',
  'game-day-fueling': 'Fueling',
  // Baseball
  'batting-tee-work': 'Tee Work',
  'basic-fielding': 'Fielding',
  'defensive-positioning': 'Defense',
  'live-pitch-hitting': 'Live Hitting',
  'advanced-fielding': 'Adv Fielding',
  'situational-hitting': 'Sit Hitting',
  'peak-game-baseball': 'Peak',
  // Basketball
  'ball-handling': 'Handles',
  'shooting-form': 'Shooting',
  'defensive-stance': 'Def Stance',
  'court-vision': 'Vision',
  'mid-range-shooting': 'Mid Range',
  'help-defense': 'Help D',
  'pick-and-roll': 'PnR',
  'three-point-shooting': '3PT',
  'peak-game-basketball': 'Peak',
  // Soccer
  'first-touch': '1st Touch',
  'passing-accuracy': 'Passing',
  'defensive-marking': 'Marking',
  'dribbling-moves': 'Dribbling',
  'crossing-delivery': 'Crossing',
  'pressing-shape': 'Pressing',
  'finishing': 'Finishing',
  'set-piece-execution': 'Set Pieces',
  'peak-game-soccer': 'Peak',
  // Swimming
  'freestyle-technique': 'Freestyle',
  'backstroke-technique': 'Backstroke',
  'kick-efficiency': 'Kick',
  'flip-turns': 'Flip Turns',
  'butterfly-technique': 'Butterfly',
  'open-water-skills': 'Open Water',
  'race-pacing': 'Pacing',
  'dive-starts': 'Starts',
  'peak-race-swimming': 'Peak',
  // Tennis
  'forehand-groundstroke': 'Forehand',
  'backhand-groundstroke': 'Backhand',
  'court-movement': 'Movement',
  'serve-mechanics': 'Serve',
  'net-volleys': 'Volleys',
  'return-of-serve': 'Return',
  'tactical-patterns': 'Tactics',
  'mental-toughness-tennis': 'Mental',
  'peak-match-tennis': 'Peak',
  // Wrestling
  'stance-motion': 'Stance',
  'takedown-basics': 'Takedowns',
  'mat-awareness': 'Mat Aware',
  'leg-attacks': 'Leg Attacks',
  'top-control': 'Top Control',
  'escape-standup': 'Escapes',
  'chain-wrestling': 'Chains',
  'counter-offense': 'Counters',
  'peak-match-wrestling': 'Peak',
  // Volleyball
  'passing-platform': 'Passing',
  'setting-technique': 'Setting',
  'serve-receive': 'Serve Rcv',
  'attacking-approach': 'Attacking',
  'block-timing': 'Blocking',
  'defensive-dig': 'Digging',
  'offensive-systems': 'Offense',
  'transition-play': 'Transition',
  'peak-game-volleyball': 'Peak',
}

function buildSkillById(skills: SkillDef[]): Record<string, SkillDef> {
  return Object.fromEntries(skills.map((s) => [s.id, s]))
}

function basePrereqsMet(id: string, mastered: Set<string>, skillById: Record<string, SkillDef>): boolean {
  const s = skillById[id]
  if (!s) return false
  return s.prereqs.every((p) => mastered.has(p))
}

function computeBaseLocked(id: string, mastered: Set<string>, skillById: Record<string, SkillDef>): boolean {
  const s = skillById[id]
  if (!s) return true
  return s.prereqs.some((p) => !mastered.has(p))
}

function maxFrontierLevel(band: ReadinessBand): number {
  if (band === 'full') return 6
  if (band === 'moderate') return 3
  return 1
}

export function computeVisualRole(
  id: string,
  mastered: Set<string>,
  readinessScore: number,
  skillById?: Record<string, SkillDef>,
): VisualRole {
  const lookup = skillById ?? buildSkillById(SKILL_DEFS)
  const s = lookup[id]
  if (!s) return 'locked'
  const band = readinessBand(readinessScore)
  const baseLocked = computeBaseLocked(id, mastered, lookup)
  const isMastered = mastered.has(id)
  const prereqsMet = basePrereqsMet(id, mastered, lookup)
  const maxLv = maxFrontierLevel(band)

  if (band === 'moderate' && s.level >= 4) {
    if (isMastered || (!baseLocked && !isMastered)) {
      return 'highRisk'
    }
    return 'locked'
  }

  if (band === 'severe' && s.level >= 2) {
    return 'locked'
  }

  if (baseLocked) return 'locked'
  if (isMastered) return 'mastered'

  if (s.level <= maxLv && prereqsMet) return 'frontier'
  return 'locked'
}

export function isClickableFrontier(
  id: string,
  mastered: Set<string>,
  readinessScore: number,
  skillById?: Record<string, SkillDef>,
): boolean {
  return computeVisualRole(id, mastered, readinessScore, skillById) === 'frontier'
}

interface FrontierState {
  sportData: SportData

  selectedAthleteId: string
  athleteMastery: Record<string, Set<string>>
  athleteReadiness: Record<string, number>

  mastered: Set<string>
  readinessScore: number

  userRole: 'coach' | 'athlete'
  selectedSport: Sport | string

  skillById: Record<string, SkillDef>

  athleteGraphs: Record<string, GeneratedGraph>
  sportPlans: Record<string, SportPlan>
  athleteGraphDeltas: Record<string, GraphDelta>

  builderTarget: BuilderTarget | null

  selectAthlete: (id: string) => void
  setReadinessScore: (n: number) => void
  toggleMaster: (id: string) => void
  resetDemo: () => void
  getVisualRole: (id: string) => VisualRole
  setUserRole: (role: 'coach' | 'athlete') => void
  setSelectedSport: (sport: Sport | string) => void
  setBuilderTarget: (target: BuilderTarget | null) => void
  saveAthleteGraph: (athleteId: string, graph: GeneratedGraph) => void
  getAthleteGraph: (athleteId: string) => GeneratedGraph | null
  saveSportPlan: (sport: Sport | string, plan: SportPlan) => void
  getSportPlan: (sport: Sport | string) => SportPlan | null
  saveAthleteDelta: (athleteId: string, delta: GraphDelta) => void
  getAthleteDelta: (athleteId: string) => GraphDelta | null
  getResolvedAthleteGraph: (athleteId: string) => GeneratedGraph | null
  resetAthleteDelta: (athleteId: string) => void
  clearSportPlan: (sport: Sport | string) => void

  getSkillsForSport: (sport: string) => SkillDef[]
  getAthletesForSport: (sport: string) => Athlete[]
  getTasksForSport: (sport: string) => TodayTask[]
}

function buildDefaultSportData(): SportData {
  return {
    skills: SKILL_DEFS,
    athletes: ATHLETES,
    tasks: TODAY_TASKS,
    skillShortLabels: DEFAULT_SKILL_SHORT,
  }
}

function buildInitialMastery(athletes: Athlete[]): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {}
  for (const athlete of athletes) {
    const initial = INITIAL_ATHLETE_MASTERY[athlete.id]
    result[athlete.id] = initial ? new Set(initial) : new Set<string>()
  }
  return result
}

function buildInitialReadiness(athletes: Athlete[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const athlete of athletes) {
    result[athlete.id] = INITIAL_ATHLETE_READINESS[athlete.id] ?? 100
  }
  return result
}

const defaultSportData = buildDefaultSportData()
const defaultSkillById = buildSkillById(defaultSportData.skills)
const DEFAULT_ATHLETE = ATHLETES[0].id
const initialGraphs = loadGraphsFromStorage()
const initialSportPlans = loadSportPlansFromStorage()
const initialAthleteDeltas = loadAthleteDeltasFromStorage()

const storedMastery = loadMasteryFromStorage()
const storedReadiness = loadReadinessFromStorage()
const initialMastery = storedMastery ?? buildInitialMastery(ATHLETES)
const initialReadiness = storedReadiness ?? buildInitialReadiness(ATHLETES)

// Ensure any new athletes added since last save get their defaults
for (const athlete of ATHLETES) {
  if (!(athlete.id in initialMastery)) {
    const init = INITIAL_ATHLETE_MASTERY[athlete.id]
    initialMastery[athlete.id] = init ? new Set(init) : new Set<string>()
  }
  if (!(athlete.id in initialReadiness)) {
    initialReadiness[athlete.id] = INITIAL_ATHLETE_READINESS[athlete.id] ?? 100
  }
}

export const useFrontierStore = create<FrontierState>((set, get) => ({
  sportData: defaultSportData,
  skillById: defaultSkillById,

  selectedAthleteId: DEFAULT_ATHLETE,
  athleteMastery: initialMastery,
  athleteReadiness: initialReadiness,
  mastered: new Set(initialMastery[DEFAULT_ATHLETE] ?? []),
  readinessScore: initialReadiness[DEFAULT_ATHLETE] ?? 100,
  userRole: 'coach',
  selectedSport: 'baseball',

  athleteGraphs: initialGraphs,
  sportPlans: initialSportPlans,
  athleteGraphDeltas: initialAthleteDeltas,
  builderTarget: null,

  selectAthlete: (id) => {
    const { athleteMastery, athleteReadiness, sportData } = get()
    const athlete = sportData.athletes.find((a) => a.id === id)
    set({
      selectedAthleteId: id,
      mastered: new Set(athleteMastery[id] ?? []),
      readinessScore: athleteReadiness[id] ?? 100,
      selectedSport: athlete?.sport ?? get().selectedSport,
    })
  },

  setReadinessScore: (n) => {
    const { selectedAthleteId, athleteReadiness } = get()
    const score = Math.max(0, Math.min(100, Math.round(n)))
    const next = { ...athleteReadiness, [selectedAthleteId]: score }
    set({ readinessScore: score, athleteReadiness: next })
    saveReadinessToStorage(next)
  },

  toggleMaster: (id) => {
    const { mastered, readinessScore, selectedAthleteId, athleteMastery, skillById } = get()
    if (!isClickableFrontier(id, mastered, readinessScore, skillById)) return

    const next = new Set(mastered)
    next.add(id)
    const nextMastery = { ...athleteMastery, [selectedAthleteId]: next }
    set({ mastered: next, athleteMastery: nextMastery })
    saveMasteryToStorage(nextMastery)
  },

  resetDemo: () => {
    const { selectedAthleteId } = get()
    const fresh = buildInitialMastery(ATHLETES)
    const freshReadiness = buildInitialReadiness(ATHLETES)
    set({
      athleteMastery: fresh,
      athleteReadiness: freshReadiness,
      mastered: new Set(fresh[selectedAthleteId]),
      readinessScore: freshReadiness[selectedAthleteId],
    })
    saveMasteryToStorage(fresh)
    saveReadinessToStorage(freshReadiness)
  },

  getVisualRole: (id) => {
    const { mastered, readinessScore, skillById } = get()
    return computeVisualRole(id, mastered, readinessScore, skillById)
  },

  setUserRole: (role) => {
    if (role === 'athlete') {
      const { selectedAthleteId, sportData } = get()
      const athlete = sportData.athletes.find((a) => a.id === selectedAthleteId)
      set({ userRole: role, selectedSport: athlete?.sport ?? 'baseball' })
    } else {
      set({ userRole: role })
    }
  },

  setSelectedSport: (sport) => set({ selectedSport: sport }),

  setBuilderTarget: (target) => set({ builderTarget: target }),

  saveAthleteGraph: (athleteId: string, graph: GeneratedGraph) => {
    const { athleteGraphs } = get()
    const next = { ...athleteGraphs, [athleteId]: graph }
    set({ athleteGraphs: next })
    saveGraphsToStorage(next)
  },

  getAthleteGraph: (athleteId: string) => {
    const { athleteGraphs } = get()
    return athleteGraphs[athleteId] ?? null
  },

  saveSportPlan: (sport, plan) => {
    const { sportPlans } = get()
    const key = String(sport)
    const next = { ...sportPlans, [key]: plan }
    set({ sportPlans: next })
    saveSportPlansToStorage(next)
  },

  getSportPlan: (sport) => {
    const { sportPlans } = get()
    return sportPlans[String(sport)] ?? null
  },

  saveAthleteDelta: (athleteId, delta) => {
    const { athleteGraphDeltas, athleteGraphs } = get()
    const next = { ...athleteGraphDeltas, [athleteId]: delta }
    set({ athleteGraphDeltas: next })
    saveAthleteDeltasToStorage(next)
    if (athleteGraphs[athleteId]) {
      const { [athleteId]: _removed, ...rest } = athleteGraphs
      set({ athleteGraphs: rest })
      saveGraphsToStorage(rest)
    }
  },

  getAthleteDelta: (athleteId) => {
    const { athleteGraphDeltas } = get()
    return athleteGraphDeltas[athleteId] ?? null
  },

  getResolvedAthleteGraph: (athleteId) => {
    const { sportPlans, athleteGraphDeltas, athleteGraphs, sportData } = get()
    const athlete = sportData.athletes.find((a) => a.id === athleteId)
    const sport = athlete?.sport
    const plan = sport ? sportPlans[String(sport)] ?? null : null
    const delta = athleteGraphDeltas[athleteId] ?? null
    const legacy = athleteGraphs[athleteId] ?? null
    return resolveAthleteGraph(plan, delta, legacy)
  },

  resetAthleteDelta: (athleteId) => {
    const { athleteGraphDeltas, athleteGraphs } = get()
    const hasDelta = athleteId in athleteGraphDeltas
    const hasLegacy = athleteId in athleteGraphs
    if (!hasDelta && !hasLegacy) return
    if (hasDelta) {
      const { [athleteId]: _d, ...restDeltas } = athleteGraphDeltas
      set({ athleteGraphDeltas: restDeltas })
      saveAthleteDeltasToStorage(restDeltas)
    }
    if (hasLegacy) {
      const { [athleteId]: _g, ...restGraphs } = athleteGraphs
      set({ athleteGraphs: restGraphs })
      saveGraphsToStorage(restGraphs)
    }
  },

  clearSportPlan: (sport) => {
    const key = String(sport)
    const { sportPlans, athleteGraphDeltas, athleteGraphs, sportData } = get()
    const athleteIdsOnSport = new Set(
      sportData.athletes.filter((a) => a.sport === key).map((a) => a.id),
    )

    if (key in sportPlans) {
      const { [key]: _plan, ...restPlans } = sportPlans
      set({ sportPlans: restPlans })
      saveSportPlansToStorage(restPlans)
    }

    const nextDeltas: Record<string, GraphDelta> = {}
    let deltasChanged = false
    for (const [aid, delta] of Object.entries(athleteGraphDeltas)) {
      if (athleteIdsOnSport.has(aid)) {
        deltasChanged = true
        continue
      }
      nextDeltas[aid] = delta
    }
    if (deltasChanged) {
      set({ athleteGraphDeltas: nextDeltas })
      saveAthleteDeltasToStorage(nextDeltas)
    }

    const nextGraphs: Record<string, GeneratedGraph> = {}
    let graphsChanged = false
    for (const [aid, graph] of Object.entries(athleteGraphs)) {
      if (athleteIdsOnSport.has(aid)) {
        graphsChanged = true
        continue
      }
      nextGraphs[aid] = graph
    }
    if (graphsChanged) {
      set({ athleteGraphs: nextGraphs })
      saveGraphsToStorage(nextGraphs)
    }
  },

  getSkillsForSport: (sport: string) => {
    const { sportData } = get()
    return sportData.skills.filter((s) => s.sport === 'universal' || s.sport === sport)
  },

  getAthletesForSport: (sport: string) => {
    const { sportData } = get()
    return sportData.athletes.filter((a) => a.sport === sport)
  },

  getTasksForSport: (sport: string) => {
    const { sportData } = get()
    return sportData.tasks.filter((t) => t.sport === 'universal' || t.sport === sport)
  },
}))
