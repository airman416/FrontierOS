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
import type { DiagnosticEntry } from '../lib/diagnostic'
import { seedFromPriorDiagnostic } from '../lib/reonboard'
import {
  BASE_INTERVAL_MS,
  buildPostreqClosure,
  buildPrereqClosure,
  completeTask as fireCompleteTask,
  computeDashboardFill,
  DEFAULT_DASHBOARD_CAP,
  dueSkills,
  failTask as fireFailTask,
  isFrontier,
  type CandidateContext,
  type ConditionalState,
  type ReviewSkillState,
} from '../lib/fire'

export type BuilderTarget =
  | { kind: 'sport'; sport: Sport | string }
  | { kind: 'athlete'; athleteId: string }

export type VisualRole =
  | 'locked'
  | 'frontier'
  | 'mastered'
  | 'highRisk'
  | 'conditional'
  | 'dueReview'

export interface SportData {
  skills: SkillDef[]
  athletes: Athlete[]
  tasks: TodayTask[]
  skillShortLabels: Record<string, string>
}

export interface DiagnosticRecord {
  completedAt: number
  log: DiagnosticEntry[]
}

export interface DashboardState {
  taskIds: string[]
  updatedAt: number
}

export interface ReonboardStatus {
  aiReonboarded: boolean
  at: number
  rationale: string
  confirmed?: boolean
}

const STORAGE_KEY = 'frontier-athlete-graphs'
const SPORT_PLANS_KEY = 'frontier-sport-plans'
const ATHLETE_DELTAS_KEY = 'frontier-athlete-deltas'
const MASTERY_KEY = 'frontier-athlete-mastery'
const READINESS_KEY = 'frontier-athlete-readiness'
const SKILL_PROGRESS_KEY = 'frontier-athlete-skill-progress'
const COMPLETED_TASKS_KEY = 'frontier-athlete-completed-tasks'
const CONDITIONAL_KEY = 'frontier-athlete-conditional'
const REVIEW_STATE_KEY = 'frontier-athlete-review-state'
const DIAGNOSTIC_KEY = 'frontier-athlete-diagnostic'
const DASHBOARD_KEY = 'frontier-athlete-dashboard'
const REONBOARD_STATUS_KEY = 'frontier-athlete-reonboard-status'

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeSave(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota exceeded */ }
}

function loadGraphsFromStorage(): Record<string, GeneratedGraph> {
  return safeLoad(STORAGE_KEY, {} as Record<string, GeneratedGraph>)
}
function saveGraphsToStorage(graphs: Record<string, GeneratedGraph>) {
  safeSave(STORAGE_KEY, graphs)
}
function loadSportPlansFromStorage(): Record<string, SportPlan> {
  return safeLoad(SPORT_PLANS_KEY, {} as Record<string, SportPlan>)
}
function saveSportPlansToStorage(plans: Record<string, SportPlan>) {
  safeSave(SPORT_PLANS_KEY, plans)
}
function loadAthleteDeltasFromStorage(): Record<string, GraphDelta> {
  return safeLoad(ATHLETE_DELTAS_KEY, {} as Record<string, GraphDelta>)
}
function saveAthleteDeltasToStorage(deltas: Record<string, GraphDelta>) {
  safeSave(ATHLETE_DELTAS_KEY, deltas)
}

function saveMasteryToStorage(mastery: Record<string, Set<string>>) {
  const serializable: Record<string, string[]> = {}
  for (const [id, set] of Object.entries(mastery)) serializable[id] = [...set]
  safeSave(MASTERY_KEY, serializable)
}

function loadMasteryFromStorage(): Record<string, Set<string>> | null {
  try {
    const raw = localStorage.getItem(MASTERY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, string[]>
    const result: Record<string, Set<string>> = {}
    for (const [id, arr] of Object.entries(parsed)) result[id] = new Set(arr)
    return result
  } catch {
    return null
  }
}

function saveReadinessToStorage(readiness: Record<string, number>) {
  safeSave(READINESS_KEY, readiness)
}
function loadReadinessFromStorage(): Record<string, number> | null {
  return safeLoad<Record<string, number> | null>(READINESS_KEY, null)
}

function loadSkillProgress(): Record<string, Record<string, number>> {
  return safeLoad(SKILL_PROGRESS_KEY, {} as Record<string, Record<string, number>>)
}
function saveSkillProgress(v: Record<string, Record<string, number>>) {
  safeSave(SKILL_PROGRESS_KEY, v)
}

function loadCompletedTasks(): Record<string, Set<string>> {
  const raw = safeLoad<Record<string, string[]>>(COMPLETED_TASKS_KEY, {})
  const out: Record<string, Set<string>> = {}
  for (const [k, v] of Object.entries(raw)) out[k] = new Set(v)
  return out
}
function saveCompletedTasks(v: Record<string, Set<string>>) {
  const serializable: Record<string, string[]> = {}
  for (const [k, set] of Object.entries(v)) serializable[k] = [...set]
  safeSave(COMPLETED_TASKS_KEY, serializable)
}

function loadConditional(): Record<string, Record<string, ConditionalState>> {
  return safeLoad(CONDITIONAL_KEY, {} as Record<string, Record<string, ConditionalState>>)
}
function saveConditional(v: Record<string, Record<string, ConditionalState>>) {
  safeSave(CONDITIONAL_KEY, v)
}

function loadReviewState(): Record<string, Record<string, ReviewSkillState>> {
  return safeLoad(REVIEW_STATE_KEY, {} as Record<string, Record<string, ReviewSkillState>>)
}
function saveReviewState(v: Record<string, Record<string, ReviewSkillState>>) {
  safeSave(REVIEW_STATE_KEY, v)
}

function loadDiagnostic(): Record<string, DiagnosticRecord> {
  return safeLoad(DIAGNOSTIC_KEY, {} as Record<string, DiagnosticRecord>)
}
function saveDiagnostic(v: Record<string, DiagnosticRecord>) {
  safeSave(DIAGNOSTIC_KEY, v)
}

function loadDashboard(): Record<string, DashboardState> {
  return safeLoad(DASHBOARD_KEY, {} as Record<string, DashboardState>)
}
function saveDashboard(v: Record<string, DashboardState>) {
  safeSave(DASHBOARD_KEY, v)
}

function loadReonboardStatus(): Record<string, ReonboardStatus> {
  return safeLoad(REONBOARD_STATUS_KEY, {} as Record<string, ReonboardStatus>)
}
function saveReonboardStatus(v: Record<string, ReonboardStatus>) {
  safeSave(REONBOARD_STATUS_KEY, v)
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

export function computeSkillVisualState(opts: {
  skillId: string
  mastered: Set<string>
  readinessScore: number
  skillById: Record<string, SkillDef>
  conditional?: Record<string, ConditionalState>
  reviewState?: Record<string, ReviewSkillState>
  now?: number
}): VisualRole {
  const base = computeVisualRole(opts.skillId, opts.mastered, opts.readinessScore, opts.skillById)
  if (base === 'mastered') {
    if (opts.conditional && opts.conditional[opts.skillId]) return 'conditional'
    const r = opts.reviewState?.[opts.skillId]
    if (r && r.dueAt <= (opts.now ?? Date.now())) return 'dueReview'
  }
  return base
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

  athleteSkillProgress: Record<string, Record<string, number>>
  athleteCompletedTasks: Record<string, Set<string>>
  athleteConditional: Record<string, Record<string, ConditionalState>>
  athleteReviewState: Record<string, Record<string, ReviewSkillState>>
  athleteDiagnostic: Record<string, DiagnosticRecord>
  athleteDashboard: Record<string, DashboardState>
  athleteReonboardStatus: Record<string, ReonboardStatus>

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
  getSkillVisualState: (athleteId: string, skillId: string) => VisualRole
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

  runDiagnostic: (
    athleteId: string,
    entries: DiagnosticEntry[],
    derivedStatus: Record<string, 'known' | 'not-known' | 'conditional' | 'unknown'>,
  ) => void
  clearDiagnostic: (athleteId: string) => void
  seedReonboardedAthlete: (payload: {
    athleteId: string
    mastered: string[]
    conditional: Record<string, { confidence: number }>
    rationale: string
  }) => void
  confirmReonboard: (athleteId: string) => void
  completeTask: (athleteId: string, taskId: string) => void
  failTask: (athleteId: string, taskId: string) => void
  getDashboardTasks: (athleteId: string) => TodayTask[]
  getAthleteSkillProgress: (athleteId: string) => Record<string, number>
  getAthleteReviewState: (athleteId: string) => Record<string, ReviewSkillState>
  getAthleteConditional: (athleteId: string) => Record<string, ConditionalState>
  getAthleteDiagnostic: (athleteId: string) => DiagnosticRecord | null
  overrideMastery: (athleteId: string, skillId: string, mastered: boolean) => void
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

for (const athlete of ATHLETES) {
  if (!(athlete.id in initialMastery)) {
    const init = INITIAL_ATHLETE_MASTERY[athlete.id]
    initialMastery[athlete.id] = init ? new Set(init) : new Set<string>()
  }
  if (!(athlete.id in initialReadiness)) {
    initialReadiness[athlete.id] = INITIAL_ATHLETE_READINESS[athlete.id] ?? 100
  }
}

const initialSkillProgress = loadSkillProgress()
const initialCompletedTasks = loadCompletedTasks()
const initialConditional = loadConditional()
const initialReviewState = loadReviewState()
const initialDiagnostic = loadDiagnostic()
const initialDashboard = loadDashboard()
const initialReonboardStatus = loadReonboardStatus()

/**
 * Pull together the per-athlete graph + task context needed by the FIRe
 * engine. Returns null if the athlete has no resolved graph yet.
 */
function buildCandidateContext(
  state: FrontierState,
  athleteId: string,
  now: number = Date.now(),
): CandidateContext | null {
  const athlete = state.sportData.athletes.find((a) => a.id === athleteId)
  if (!athlete) return null
  const resolved = state.getResolvedAthleteGraph(athleteId)
  const skills: SkillDef[] = resolved?.skills && resolved.skills.length > 0
    ? resolved.skills
    : state.sportData.skills.filter((s) => s.sport === 'universal' || s.sport === athlete.sport)
  const skillById = buildSkillById(skills)
  const allTasks: TodayTask[] = resolved?.tasks && resolved.tasks.length > 0
    ? resolved.tasks
    : state.sportData.tasks
  // Only tasks whose skillId matches a skill in this athlete's graph are FIRe-eligible.
  const tasks = allTasks.filter((t) => t.skillId && skillById[t.skillId])
  const mastered = state.athleteMastery[athleteId] ?? new Set<string>()
  return {
    athleteId,
    skills,
    tasks,
    skillById,
    prereqClosure: buildPrereqClosure(skills),
    postreqClosure: buildPostreqClosure(skills),
    mastered,
    completedTaskIds: state.athleteCompletedTasks[athleteId] ?? new Set<string>(),
    skillProgress: state.athleteSkillProgress[athleteId] ?? {},
    reviewState: state.athleteReviewState[athleteId] ?? {},
    now,
  }
}

export const useFrontierStore = create<FrontierState>((set, get) => ({
  sportData: defaultSportData,
  skillById: defaultSkillById,

  selectedAthleteId: DEFAULT_ATHLETE,
  athleteMastery: initialMastery,
  athleteReadiness: initialReadiness,

  athleteSkillProgress: initialSkillProgress,
  athleteCompletedTasks: initialCompletedTasks,
  athleteConditional: initialConditional,
  athleteReviewState: initialReviewState,
  athleteDiagnostic: initialDiagnostic,
  athleteDashboard: initialDashboard,
  athleteReonboardStatus: initialReonboardStatus,

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
      athleteSkillProgress: {},
      athleteCompletedTasks: {},
      athleteConditional: {},
      athleteReviewState: {},
      athleteDiagnostic: {},
      athleteDashboard: {},
      athleteReonboardStatus: {},
    })
    saveMasteryToStorage(fresh)
    saveReadinessToStorage(freshReadiness)
    saveSkillProgress({})
    saveCompletedTasks({})
    saveConditional({})
    saveReviewState({})
    saveDiagnostic({})
    saveDashboard({})
    saveReonboardStatus({})
  },

  getVisualRole: (id) => {
    const { mastered, readinessScore, skillById } = get()
    return computeVisualRole(id, mastered, readinessScore, skillById)
  },

  getSkillVisualState: (athleteId, skillId) => {
    const state = get()
    const mastered = state.athleteMastery[athleteId] ?? new Set<string>()
    const readiness = state.athleteReadiness[athleteId] ?? 100
    const resolved = state.getResolvedAthleteGraph(athleteId)
    const skills = resolved?.skills ?? state.sportData.skills
    const skillById = buildSkillById(skills)
    return computeSkillVisualState({
      skillId,
      mastered,
      readinessScore: readiness,
      skillById,
      conditional: state.athleteConditional[athleteId],
      reviewState: state.athleteReviewState[athleteId],
    })
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
    const state = get()
    const key = String(sport)
    const prevPlan = state.sportPlans[key] ?? null
    const nextPlans = { ...state.sportPlans, [key]: plan }
    set({ sportPlans: nextPlans })
    saveSportPlansToStorage(nextPlans)

    // AI re-onboard: port any previously-onboarded athletes on this sport onto
    // the new graph using their prior diagnostic log. We only do this when
    // there was a prior plan (i.e. this is a regeneration, not the first save).
    if (!prevPlan) return
    const priorSkills = prevPlan.graph?.skills ?? []
    if (priorSkills.length === 0) return
    const newSkills = plan.graph?.skills ?? []
    if (newSkills.length === 0) return

    const affected = state.sportData.athletes
      .filter((a) => a.sport === key)
      .map((a) => ({ athlete: a, record: state.athleteDiagnostic[a.id] }))
      .filter((x): x is { athlete: Athlete; record: DiagnosticRecord } => !!x.record)

    for (const { athlete, record } of affected) {
      const seed = seedFromPriorDiagnostic({
        priorSkills,
        priorLog: record.log,
        newSkills,
      })
      get().seedReonboardedAthlete({
        athleteId: athlete.id,
        mastered: seed.mastered,
        conditional: seed.conditional,
        rationale: seed.rationale,
      })
    }
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

  /* ─── Adaptive diagnostic ─── */

  runDiagnostic: (athleteId, entries, derivedStatus) => {
    const now = Date.now()
    const state = get()

    // Seed the per-athlete state from the derived status.
    const nextMastered = new Set<string>()
    const nextConditional: Record<string, ConditionalState> = {}
    const nextReviewState: Record<string, ReviewSkillState> = {}

    for (const [skillId, status] of Object.entries(derivedStatus)) {
      if (status === 'known') {
        nextMastered.add(skillId)
        nextReviewState[skillId] = {
          stability: 1.0,
          lastReviewedAt: now,
          dueAt: now + 1.0 * BASE_INTERVAL_MS,
        }
      } else if (status === 'conditional') {
        nextMastered.add(skillId)
        nextConditional[skillId] = { confidence: 0.5, successes: 0 }
        nextReviewState[skillId] = {
          stability: 0.5,
          lastReviewedAt: now,
          dueAt: now + 0.5 * BASE_INTERVAL_MS,
        }
      }
    }

    const nextAthleteMastery = { ...state.athleteMastery, [athleteId]: nextMastered }
    const nextAthleteConditional = { ...state.athleteConditional, [athleteId]: nextConditional }
    const nextAthleteReviewState = { ...state.athleteReviewState, [athleteId]: nextReviewState }
    const nextAthleteDiagnostic = {
      ...state.athleteDiagnostic,
      [athleteId]: { completedAt: now, log: entries },
    }
    // Reset skillProgress + completedTasks on (re)diagnostic — fresh start.
    const nextSkillProgress = { ...state.athleteSkillProgress, [athleteId]: {} }
    const nextCompletedTasks = { ...state.athleteCompletedTasks, [athleteId]: new Set<string>() }
    // Clear any prior AI re-onboard pill.
    const nextReonboardStatus = { ...state.athleteReonboardStatus }
    delete nextReonboardStatus[athleteId]

    // Seed dashboard after state is in place.
    const stagedState: FrontierState = {
      ...state,
      athleteMastery: nextAthleteMastery,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteDiagnostic: nextAthleteDiagnostic,
      athleteSkillProgress: nextSkillProgress,
      athleteCompletedTasks: nextCompletedTasks,
      athleteReonboardStatus: nextReonboardStatus,
    }
    const ctx = buildCandidateContext(stagedState, athleteId, now)
    const nextIds = ctx ? computeDashboardFill(ctx, [], DEFAULT_DASHBOARD_CAP) : []
    const nextDashboard = {
      ...state.athleteDashboard,
      [athleteId]: { taskIds: nextIds, updatedAt: now },
    }

    const isSelected = state.selectedAthleteId === athleteId

    set({
      athleteMastery: nextAthleteMastery,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteDiagnostic: nextAthleteDiagnostic,
      athleteSkillProgress: nextSkillProgress,
      athleteCompletedTasks: nextCompletedTasks,
      athleteDashboard: nextDashboard,
      athleteReonboardStatus: nextReonboardStatus,
      ...(isSelected ? { mastered: nextMastered } : {}),
    })
    saveMasteryToStorage(nextAthleteMastery)
    saveConditional(nextAthleteConditional)
    saveReviewState(nextAthleteReviewState)
    saveDiagnostic(nextAthleteDiagnostic)
    saveSkillProgress(nextSkillProgress)
    saveCompletedTasks(nextCompletedTasks)
    saveDashboard(nextDashboard)
    saveReonboardStatus(nextReonboardStatus)
  },

  clearDiagnostic: (athleteId) => {
    const state = get()
    const { [athleteId]: _d, ...rest } = state.athleteDiagnostic
    set({ athleteDiagnostic: rest })
    saveDiagnostic(rest)
  },

  seedReonboardedAthlete: ({ athleteId, mastered, conditional, rationale }) => {
    const now = Date.now()
    const state = get()
    const nextMastered = new Set(mastered)
    const nextConditional: Record<string, ConditionalState> = {}
    const nextReviewState: Record<string, ReviewSkillState> = {}

    for (const id of mastered) {
      nextReviewState[id] = {
        stability: 1.0,
        lastReviewedAt: now,
        dueAt: now + 1.0 * BASE_INTERVAL_MS,
      }
    }
    for (const [id, v] of Object.entries(conditional)) {
      nextConditional[id] = { confidence: v.confidence, successes: 0 }
      nextReviewState[id] = {
        stability: 0.5,
        lastReviewedAt: now,
        dueAt: now + 0.5 * BASE_INTERVAL_MS,
      }
    }

    const nextAthleteMastery = { ...state.athleteMastery, [athleteId]: nextMastered }
    const nextAthleteConditional = { ...state.athleteConditional, [athleteId]: nextConditional }
    const nextAthleteReviewState = { ...state.athleteReviewState, [athleteId]: nextReviewState }
    const nextSkillProgress = { ...state.athleteSkillProgress, [athleteId]: {} }
    const nextCompletedTasks = { ...state.athleteCompletedTasks, [athleteId]: new Set<string>() }
    const nextReonboardStatus = {
      ...state.athleteReonboardStatus,
      [athleteId]: { aiReonboarded: true, at: now, rationale, confirmed: false },
    }

    const stagedState: FrontierState = {
      ...state,
      athleteMastery: nextAthleteMastery,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteSkillProgress: nextSkillProgress,
      athleteCompletedTasks: nextCompletedTasks,
      athleteReonboardStatus: nextReonboardStatus,
    }
    const ctx = buildCandidateContext(stagedState, athleteId, now)
    const nextIds = ctx ? computeDashboardFill(ctx, [], DEFAULT_DASHBOARD_CAP) : []
    const nextDashboard = {
      ...state.athleteDashboard,
      [athleteId]: { taskIds: nextIds, updatedAt: now },
    }

    const isSelected = state.selectedAthleteId === athleteId
    set({
      athleteMastery: nextAthleteMastery,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteSkillProgress: nextSkillProgress,
      athleteCompletedTasks: nextCompletedTasks,
      athleteReonboardStatus: nextReonboardStatus,
      athleteDashboard: nextDashboard,
      ...(isSelected ? { mastered: nextMastered } : {}),
    })
    saveMasteryToStorage(nextAthleteMastery)
    saveConditional(nextAthleteConditional)
    saveReviewState(nextAthleteReviewState)
    saveSkillProgress(nextSkillProgress)
    saveCompletedTasks(nextCompletedTasks)
    saveReonboardStatus(nextReonboardStatus)
    saveDashboard(nextDashboard)
  },

  confirmReonboard: (athleteId) => {
    const state = get()
    const cur = state.athleteReonboardStatus[athleteId]
    if (!cur) return
    const next = { ...state.athleteReonboardStatus, [athleteId]: { ...cur, confirmed: true } }
    set({ athleteReonboardStatus: next })
    saveReonboardStatus(next)
  },

  completeTask: (athleteId, taskId) => {
    const now = Date.now()
    const state = get()
    const ctx = buildCandidateContext(state, athleteId, now)
    if (!ctx) return
    const task = ctx.tasks.find((t) => t.id === taskId)
    if (!task) return

    if ((state.athleteCompletedTasks[athleteId] ?? new Set()).has(taskId)) return

    const result = fireCompleteTask({
      task,
      skillById: ctx.skillById,
      prereqClosure: ctx.prereqClosure,
      mastered: ctx.mastered,
      skillProgress: ctx.skillProgress,
      conditional: state.athleteConditional[athleteId] ?? {},
      reviewState: ctx.reviewState,
      now,
    })

    const completedSet = new Set(state.athleteCompletedTasks[athleteId] ?? new Set<string>())
    completedSet.add(taskId)

    const nextAthleteMastery = { ...state.athleteMastery, [athleteId]: result.mastered }
    const nextAthleteSkillProgress = { ...state.athleteSkillProgress, [athleteId]: result.skillProgress }
    const nextAthleteConditional = { ...state.athleteConditional, [athleteId]: result.conditional }
    const nextAthleteReviewState = { ...state.athleteReviewState, [athleteId]: result.reviewState }
    const nextAthleteCompletedTasks = { ...state.athleteCompletedTasks, [athleteId]: completedSet }

    // Drop the completed task from dashboard and refill.
    const stagedState: FrontierState = {
      ...state,
      athleteMastery: nextAthleteMastery,
      athleteSkillProgress: nextAthleteSkillProgress,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteCompletedTasks: nextAthleteCompletedTasks,
    }
    const refilledCtx = buildCandidateContext(stagedState, athleteId, now)
    const currentIds = state.athleteDashboard[athleteId]?.taskIds ?? []
    const keptIds = currentIds.filter((id) => id !== taskId)
    const nextIds = refilledCtx
      ? computeDashboardFill(refilledCtx, keptIds, DEFAULT_DASHBOARD_CAP)
      : keptIds
    const nextDashboard = {
      ...state.athleteDashboard,
      [athleteId]: { taskIds: nextIds, updatedAt: now },
    }

    const isSelected = state.selectedAthleteId === athleteId
    set({
      athleteMastery: nextAthleteMastery,
      athleteSkillProgress: nextAthleteSkillProgress,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteCompletedTasks: nextAthleteCompletedTasks,
      athleteDashboard: nextDashboard,
      ...(isSelected ? { mastered: result.mastered } : {}),
    })
    saveMasteryToStorage(nextAthleteMastery)
    saveSkillProgress(nextAthleteSkillProgress)
    saveConditional(nextAthleteConditional)
    saveReviewState(nextAthleteReviewState)
    saveCompletedTasks(nextAthleteCompletedTasks)
    saveDashboard(nextDashboard)
  },

  failTask: (athleteId, taskId) => {
    const now = Date.now()
    const state = get()
    const ctx = buildCandidateContext(state, athleteId, now)
    if (!ctx) return
    const task = ctx.tasks.find((t) => t.id === taskId)
    if (!task) return

    const result = fireFailTask({
      task,
      prereqClosure: ctx.prereqClosure,
      mastered: ctx.mastered,
      conditional: state.athleteConditional[athleteId] ?? {},
      reviewState: ctx.reviewState,
      now,
    })

    const nextAthleteConditional = { ...state.athleteConditional, [athleteId]: result.conditional }
    const nextAthleteReviewState = { ...state.athleteReviewState, [athleteId]: result.reviewState }
    set({
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
    })
    saveConditional(nextAthleteConditional)
    saveReviewState(nextAthleteReviewState)
  },

  getDashboardTasks: (athleteId) => {
    const now = Date.now()
    const state = get()
    const ctx = buildCandidateContext(state, athleteId, now)
    if (!ctx) return []
    const currentIds = state.athleteDashboard[athleteId]?.taskIds ?? []
    const nextIds = computeDashboardFill(ctx, currentIds, DEFAULT_DASHBOARD_CAP)
    // Persist if the dashboard content changed.
    const changed =
      nextIds.length !== currentIds.length ||
      nextIds.some((id, i) => currentIds[i] !== id)
    if (changed) {
      const nextDashboard = {
        ...state.athleteDashboard,
        [athleteId]: { taskIds: nextIds, updatedAt: now },
      }
      set({ athleteDashboard: nextDashboard })
      saveDashboard(nextDashboard)
    }
    const tasksById = new Map(ctx.tasks.map((t) => [t.id, t]))
    const out: TodayTask[] = []
    for (const id of nextIds) {
      const t = tasksById.get(id)
      if (t) out.push(t)
    }
    return out
  },

  getAthleteSkillProgress: (athleteId) => {
    return get().athleteSkillProgress[athleteId] ?? {}
  },
  getAthleteReviewState: (athleteId) => {
    return get().athleteReviewState[athleteId] ?? {}
  },
  getAthleteConditional: (athleteId) => {
    return get().athleteConditional[athleteId] ?? {}
  },
  getAthleteDiagnostic: (athleteId) => {
    return get().athleteDiagnostic[athleteId] ?? null
  },

  overrideMastery: (athleteId, skillId, masteredNow) => {
    const state = get()
    const cur = new Set(state.athleteMastery[athleteId] ?? [])
    if (masteredNow) cur.add(skillId)
    else cur.delete(skillId)
    const nextMastery = { ...state.athleteMastery, [athleteId]: cur }
    const isSelected = state.selectedAthleteId === athleteId
    set({
      athleteMastery: nextMastery,
      ...(isSelected ? { mastered: cur } : {}),
    })
    saveMasteryToStorage(nextMastery)
  },
}))

// Re-export helpers for consumers that previously imported from this module.
export { isFrontier, dueSkills }
