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
import type { DiagnosticEntry, EscalationEntry } from '../lib/diagnostic'
import {
  buildPostreqClosure,
  buildPrereqClosure,
  completeTask as fireCompleteTask,
  computeDashboardFill,
  DEFAULT_DASHBOARD_CAP,
  dueSkills,
  failTask as fireFailTask,
  isFrontier,
  seedMissingReviewState,
  type CandidateContext,
  type ConditionalState,
  type ReviewSkillState,
} from '../lib/fire'
import { api, type ApiTrainingState } from '../lib/api'

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
  /**
   * AI-generated harder probes graded during the escalation phase. Empty
   * for athletes onboarded before escalation existed.
   */
  escalations?: EscalationEntry[]
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

/**
 * Snapshot of training state captured immediately *before* a task completion is
 * applied. Used by `uncompleteTask` to restore the prior state when an athlete
 * unchecks a task. Persisted to the backend (`athlete_training_state.task_snapshots`)
 * so undo survives page reloads.
 */
export interface TaskCompletionSnapshot {
  mastered: string[]
  skillProgress: Record<string, number>
  conditional: Record<string, ConditionalState>
  reviewState: Record<string, ReviewSkillState>
}

const DEFAULT_SKILL_SHORT: Record<string, string> = {
  'sleep-hygiene': 'Sleep',
  'joint-mobility': 'Mobility',
  'aerobic-base': 'Aerobic',
  'core-stability': 'Core',
  'anaerobic-capacity': 'Anaerobic',
  'macro-tracking': 'Macros',
  'heavy-resistance': 'Resistance',
  plyometrics: 'Plyo',
  'game-day-fueling': 'Fueling',
  'batting-tee-work': 'Tee Work',
  'basic-fielding': 'Fielding',
  'defensive-positioning': 'Defense',
  'live-pitch-hitting': 'Live Hitting',
  'advanced-fielding': 'Adv Fielding',
  'situational-hitting': 'Sit Hitting',
  'peak-game-baseball': 'Peak',
  'ball-handling': 'Handles',
  'shooting-form': 'Shooting',
  'defensive-stance': 'Def Stance',
  'court-vision': 'Vision',
  'mid-range-shooting': 'Mid Range',
  'help-defense': 'Help D',
  'pick-and-roll': 'PnR',
  'three-point-shooting': '3PT',
  'peak-game-basketball': 'Peak',
  'first-touch': '1st Touch',
  'passing-accuracy': 'Passing',
  'defensive-marking': 'Marking',
  'dribbling-moves': 'Dribbling',
  'crossing-delivery': 'Crossing',
  'pressing-shape': 'Pressing',
  'finishing': 'Finishing',
  'set-piece-execution': 'Set Pieces',
  'peak-game-soccer': 'Peak',
  'freestyle-technique': 'Freestyle',
  'backstroke-technique': 'Backstroke',
  'kick-efficiency': 'Kick',
  'flip-turns': 'Flip Turns',
  'butterfly-technique': 'Butterfly',
  'open-water-skills': 'Open Water',
  'race-pacing': 'Pacing',
  'dive-starts': 'Starts',
  'peak-race-swimming': 'Peak',
  'forehand-groundstroke': 'Forehand',
  'backhand-groundstroke': 'Backhand',
  'court-movement': 'Movement',
  'serve-mechanics': 'Serve',
  'net-volleys': 'Volleys',
  'return-of-serve': 'Return',
  'tactical-patterns': 'Tactics',
  'mental-toughness-tennis': 'Mental',
  'peak-match-tennis': 'Peak',
  'stance-motion': 'Stance',
  'takedown-basics': 'Takedowns',
  'mat-awareness': 'Mat Aware',
  'leg-attacks': 'Leg Attacks',
  'top-control': 'Top Control',
  'escape-standup': 'Escapes',
  'chain-wrestling': 'Chains',
  'counter-offense': 'Counters',
  'peak-match-wrestling': 'Peak',
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

function basePrereqsMet(
  id: string,
  mastered: Set<string>,
  skillById: Record<string, SkillDef>,
): boolean {
  const s = skillById[id]
  if (!s) return false
  return s.prereqs.every((p) => mastered.has(p))
}

function computeBaseLocked(
  id: string,
  mastered: Set<string>,
  skillById: Record<string, SkillDef>,
): boolean {
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
    if (isMastered || (!baseLocked && !isMastered)) return 'highRisk'
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
  hydrated: boolean

  sportData: SportData

  selectedAthleteId: string
  athleteMastery: Record<string, Set<string>>
  athleteReadiness: Record<string, number>

  athleteSkillProgress: Record<string, Record<string, number>>
  athleteCompletedTasks: Record<string, Set<string>>
  /**
   * Maps athleteId → taskId → snapshot taken just before the task was
   * completed. Powers `uncompleteTask`. Persisted to the backend so undo
   * still works after a reload; cleared per task by `clearCompletedTasks`.
   */
  athleteTaskSnapshots: Record<string, Record<string, TaskCompletionSnapshot>>
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
  athleteGraphDraftDeltas: Record<string, GraphDelta>

  builderTarget: BuilderTarget | null

  hydrate: () => Promise<void>

  selectAthlete: (id: string) => void
  setReadinessScore: (n: number) => void
  toggleMaster: (id: string) => void
  resetDemo: () => Promise<void>
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
  saveAthleteDraftDelta: (athleteId: string, delta: GraphDelta) => void
  getAthleteDraftDelta: (athleteId: string) => GraphDelta | null
  acceptAthleteDraft: (athleteId: string) => void
  discardAthleteDraft: (athleteId: string) => void
  getResolvedAthleteGraph: (athleteId: string) => GeneratedGraph | null
  getDraftResolvedAthleteGraph: (athleteId: string) => GeneratedGraph | null
  resetAthleteDelta: (athleteId: string) => void
  clearSportPlan: (sport: Sport | string) => void

  getSkillsForSport: (sport: string) => SkillDef[]
  getAthletesForSport: (sport: string) => Athlete[]
  getTasksForSport: (sport: string) => TodayTask[]

  runDiagnostic: (
    athleteId: string,
    entries: DiagnosticEntry[],
    derivedStatus: Record<string, 'known' | 'not-known' | 'conditional' | 'unknown'>,
    escalations?: EscalationEntry[],
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
  uncompleteTask: (athleteId: string, taskId: string) => void
  clearCompletedTasks: (athleteId: string) => void
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

/**
 * Best-effort async write. Errors are logged to the console but not surfaced
 * to the UI - every mutation is optimistic, so the local state has already
 * been updated. The store stays consistent with the server after the next
 * successful bootstrap (on reload).
 */
function fireAndForget<T>(promise: Promise<T>, label: string): void {
  promise.catch((err) => {
    console.error(`[FrontierOS] ${label} failed`, err)
  })
}

/** Shape used by `patchAthleteState`. */
type ApiStatePatch = Parameters<typeof api.patchAthleteState>[1]

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
  const skills: SkillDef[] =
    resolved?.skills && resolved.skills.length > 0
      ? resolved.skills
      : state.sportData.skills.filter(
          (s) => s.sport === 'universal' || s.sport === athlete.sport,
        )
  const skillById = buildSkillById(skills)
  const allTasks: TodayTask[] =
    resolved?.tasks && resolved.tasks.length > 0 ? resolved.tasks : state.sportData.tasks
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

function trainingStateToSlices(rows: ApiTrainingState[]) {
  const athleteMastery: Record<string, Set<string>> = {}
  const athleteReadiness: Record<string, number> = {}
  const athleteSkillProgress: Record<string, Record<string, number>> = {}
  const athleteCompletedTasks: Record<string, Set<string>> = {}
  const athleteTaskSnapshots: Record<string, Record<string, TaskCompletionSnapshot>> = {}
  const athleteConditional: Record<string, Record<string, ConditionalState>> = {}
  const athleteReviewState: Record<string, Record<string, ReviewSkillState>> = {}
  const athleteDiagnostic: Record<string, DiagnosticRecord> = {}
  const athleteDashboard: Record<string, DashboardState> = {}
  const athleteReonboardStatus: Record<string, ReonboardStatus> = {}

  for (const row of rows) {
    athleteMastery[row.athleteId] = new Set(row.mastery)
    athleteReadiness[row.athleteId] = row.readiness
    athleteSkillProgress[row.athleteId] = row.skillProgress ?? {}
    athleteCompletedTasks[row.athleteId] = new Set(row.completedTasks ?? [])
    athleteTaskSnapshots[row.athleteId] = row.taskSnapshots ?? {}
    athleteConditional[row.athleteId] = row.conditional ?? {}
    athleteReviewState[row.athleteId] = row.reviewState ?? {}
    if (row.diagnostic) athleteDiagnostic[row.athleteId] = row.diagnostic
    if (row.dashboard) athleteDashboard[row.athleteId] = row.dashboard
    if (row.reonboardStatus) athleteReonboardStatus[row.athleteId] = row.reonboardStatus
  }

  return {
    athleteMastery,
    athleteReadiness,
    athleteSkillProgress,
    athleteCompletedTasks,
    athleteTaskSnapshots,
    athleteConditional,
    athleteReviewState,
    athleteDiagnostic,
    athleteDashboard,
    athleteReonboardStatus,
  }
}

export const useFrontierStore = create<FrontierState>((set, get) => ({
  hydrated: false,

  sportData: defaultSportData,
  skillById: defaultSkillById,

  selectedAthleteId: DEFAULT_ATHLETE,
  athleteMastery: {},
  athleteReadiness: {},

  athleteSkillProgress: {},
  athleteCompletedTasks: {},
  athleteTaskSnapshots: {},
  athleteConditional: {},
  athleteReviewState: {},
  athleteDiagnostic: {},
  athleteDashboard: {},
  athleteReonboardStatus: {},

  mastered: new Set<string>(),
  readinessScore: 100,
  userRole: 'coach',
  selectedSport: 'baseball',

  athleteGraphs: {},
  sportPlans: {},
  athleteGraphDeltas: {},
  athleteGraphDraftDeltas: {},
  builderTarget: null,

  hydrate: async () => {
    const bootstrap = await api.bootstrap()

    const sportPlans: Record<string, SportPlan> = {}
    for (const p of bootstrap.sportPlans) {
      sportPlans[p.sport] = {
        sport: p.sport,
        graph: p.graph,
        version: p.version,
        requirements: p.requirements,
        history: (p.history as SportPlan['history']) ?? [],
        updatedAt: p.updatedAt,
      }
    }

    const athleteGraphDeltas: Record<string, GraphDelta> = {}
    for (const d of bootstrap.athleteDeltas) {
      athleteGraphDeltas[d.athleteId] = d.delta
    }

    const athleteGraphDraftDeltas: Record<string, GraphDelta> = {}
    for (const d of bootstrap.athleteDraftDeltas) {
      athleteGraphDraftDeltas[d.athleteId] = d.delta
    }

    const athleteGraphs: Record<string, GeneratedGraph> = {}
    for (const g of bootstrap.athleteGraphsLegacy) {
      athleteGraphs[g.athleteId] = g.graph
    }

    // Seed missing training state from the initial data so every athlete has
    // something to render.
    const byId = new Map(bootstrap.athleteTrainingState.map((t) => [t.athleteId, t]))
    const fallbackMastery = buildInitialMastery(ATHLETES)
    const fallbackReadiness = buildInitialReadiness(ATHLETES)
    const hydrated: ApiTrainingState[] = []
    for (const athlete of ATHLETES) {
      const existing = byId.get(athlete.id)
      if (existing) {
        hydrated.push(existing)
      } else {
        hydrated.push({
          athleteId: athlete.id,
          mastery: Array.from(fallbackMastery[athlete.id] ?? new Set()),
          readiness: fallbackReadiness[athlete.id] ?? 100,
          skillProgress: {},
          completedTasks: [],
          conditional: {},
          reviewState: {},
          taskSnapshots: {},
          diagnostic: null,
          dashboard: null,
          reonboardStatus: null,
          updatedAt: 0,
        })
      }
    }

    const slices = trainingStateToSlices(hydrated)

    // Backfill missing reviewState entries for any mastered skill so the
    // dashboard surfaces "due" review tasks for legacy/seed-data athletes.
    // Persist anything we changed back to the server so it sticks.
    const now = Date.now()
    for (const athleteId of Object.keys(slices.athleteMastery)) {
      const mastered = slices.athleteMastery[athleteId] ?? new Set<string>()
      const existing = slices.athleteReviewState[athleteId] ?? {}
      const seeded = seedMissingReviewState(mastered, existing, now)
      if (!seeded.changed) continue
      slices.athleteReviewState[athleteId] = seeded.reviewState
      fireAndForget(
        api.patchAthleteState(athleteId, { reviewState: seeded.reviewState }),
        'hydrate.backfillReviewState',
      )
    }

    const selected = get().selectedAthleteId
    set({
      hydrated: true,
      sportPlans,
      athleteGraphDeltas,
      athleteGraphDraftDeltas,
      athleteGraphs,
      ...slices,
      mastered: new Set(slices.athleteMastery[selected] ?? []),
      readinessScore: slices.athleteReadiness[selected] ?? 100,
    })
  },

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
    fireAndForget(
      api.patchAthleteState(selectedAthleteId, { readiness: score }),
      'setReadinessScore',
    )
  },

  toggleMaster: (id) => {
    const { mastered, readinessScore, selectedAthleteId, athleteMastery, skillById } = get()
    if (!isClickableFrontier(id, mastered, readinessScore, skillById)) return

    const next = new Set(mastered)
    next.add(id)
    const nextMastery = { ...athleteMastery, [selectedAthleteId]: next }
    set({ mastered: next, athleteMastery: nextMastery })
    fireAndForget(
      api.patchAthleteState(selectedAthleteId, { mastery: [...next] }),
      'toggleMaster',
    )
  },

  resetDemo: async () => {
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
      athleteTaskSnapshots: {},
      athleteConditional: {},
      athleteReviewState: {},
      athleteDiagnostic: {},
      athleteDashboard: {},
      athleteReonboardStatus: {},
      athleteGraphDeltas: {},
      athleteGraphDraftDeltas: {},
      athleteGraphs: {},
    })
    try {
      await api.resetDemo()
    } catch (err) {
      console.error('[FrontierOS] resetDemo failed', err)
    }
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

  saveAthleteGraph: (athleteId, graph) => {
    const { athleteGraphs } = get()
    const next = { ...athleteGraphs, [athleteId]: graph }
    set({ athleteGraphs: next })
    fireAndForget(api.saveAthleteLegacyGraph(athleteId, graph), 'saveAthleteGraph')
  },

  getAthleteGraph: (athleteId) => {
    return get().athleteGraphs[athleteId] ?? null
  },

  saveSportPlan: (sport, plan) => {
    const state = get()
    const key = String(sport)
    const nextPlans = { ...state.sportPlans, [key]: plan }
    set({ sportPlans: nextPlans })

    // Server-side re-onboard fan-out: the response carries any updated
    // athlete training-state rows so we can splice them back into the store.
    ;(async () => {
      try {
        const resp = await api.saveSportPlan(key, {
          graph: plan.graph,
          version: plan.version,
          requirements: plan.requirements,
          history: plan.history,
        })
        if (resp.reonboardedAthletes.length === 0) return
        const merged = trainingStateToSlices(resp.reonboardedAthletes)
        const cur = get()
        const athleteMastery = { ...cur.athleteMastery, ...merged.athleteMastery }
        const athleteReadiness = { ...cur.athleteReadiness, ...merged.athleteReadiness }
        const athleteSkillProgress = {
          ...cur.athleteSkillProgress,
          ...merged.athleteSkillProgress,
        }
        const athleteCompletedTasks = {
          ...cur.athleteCompletedTasks,
          ...merged.athleteCompletedTasks,
        }
        const athleteConditional = { ...cur.athleteConditional, ...merged.athleteConditional }
        const athleteReviewState = { ...cur.athleteReviewState, ...merged.athleteReviewState }
        const athleteDashboard = { ...cur.athleteDashboard }
        for (const row of resp.reonboardedAthletes) {
          if (row.dashboard) athleteDashboard[row.athleteId] = row.dashboard
          else delete athleteDashboard[row.athleteId]
        }
        const athleteReonboardStatus = {
          ...cur.athleteReonboardStatus,
          ...merged.athleteReonboardStatus,
        }
        const selected = cur.selectedAthleteId
        set({
          athleteMastery,
          athleteReadiness,
          athleteSkillProgress,
          athleteCompletedTasks,
          athleteConditional,
          athleteReviewState,
          athleteDashboard,
          athleteReonboardStatus,
          ...(merged.athleteMastery[selected]
            ? { mastered: new Set(merged.athleteMastery[selected]) }
            : {}),
        })
      } catch (err) {
        console.error('[FrontierOS] saveSportPlan failed', err)
      }
    })()
  },

  getSportPlan: (sport) => {
    return get().sportPlans[String(sport)] ?? null
  },

  saveAthleteDelta: (athleteId, delta) => {
    const { athleteGraphDeltas, athleteGraphs } = get()
    const next = { ...athleteGraphDeltas, [athleteId]: delta }
    set({ athleteGraphDeltas: next })
    if (athleteGraphs[athleteId]) {
      const { [athleteId]: _removed, ...rest } = athleteGraphs
      set({ athleteGraphs: rest })
    }
    fireAndForget(api.saveAthleteDelta(athleteId, delta), 'saveAthleteDelta')
  },

  getAthleteDelta: (athleteId) => {
    return get().athleteGraphDeltas[athleteId] ?? null
  },

  saveAthleteDraftDelta: (athleteId, delta) => {
    const { athleteGraphDraftDeltas } = get()
    const next = { ...athleteGraphDraftDeltas, [athleteId]: delta }
    set({ athleteGraphDraftDeltas: next })
    fireAndForget(api.saveAthleteDraftDelta(athleteId, delta), 'saveAthleteDraftDelta')
  },

  getAthleteDraftDelta: (athleteId) => {
    return get().athleteGraphDraftDeltas[athleteId] ?? null
  },

  acceptAthleteDraft: (athleteId) => {
    const { athleteGraphDraftDeltas, athleteGraphDeltas, athleteGraphs } = get()
    const draft = athleteGraphDraftDeltas[athleteId]
    if (!draft) return
    const nextDeltas = { ...athleteGraphDeltas, [athleteId]: draft }
    const { [athleteId]: _drafted, ...restDrafts } = athleteGraphDraftDeltas
    const nextGraphs = { ...athleteGraphs }
    if (athleteId in nextGraphs) delete nextGraphs[athleteId]
    set({
      athleteGraphDeltas: nextDeltas,
      athleteGraphDraftDeltas: restDrafts,
      athleteGraphs: nextGraphs,
    })
    fireAndForget(api.acceptAthleteDraft(athleteId), 'acceptAthleteDraft')
  },

  discardAthleteDraft: (athleteId) => {
    const { athleteGraphDraftDeltas } = get()
    if (!(athleteId in athleteGraphDraftDeltas)) return
    const { [athleteId]: _removed, ...rest } = athleteGraphDraftDeltas
    set({ athleteGraphDraftDeltas: rest })
    fireAndForget(api.deleteAthleteDraftDelta(athleteId), 'discardAthleteDraft')
  },

  getResolvedAthleteGraph: (athleteId) => {
    const { sportPlans, athleteGraphDeltas, athleteGraphs, sportData } = get()
    const athlete = sportData.athletes.find((a) => a.id === athleteId)
    const sport = athlete?.sport
    const plan = sport ? (sportPlans[String(sport)] ?? null) : null
    const delta = athleteGraphDeltas[athleteId] ?? null
    const legacy = athleteGraphs[athleteId] ?? null
    return resolveAthleteGraph(plan, delta, legacy)
  },

  getDraftResolvedAthleteGraph: (athleteId) => {
    const {
      sportPlans,
      athleteGraphDeltas,
      athleteGraphDraftDeltas,
      athleteGraphs,
      sportData,
    } = get()
    const athlete = sportData.athletes.find((a) => a.id === athleteId)
    const sport = athlete?.sport
    const plan = sport ? (sportPlans[String(sport)] ?? null) : null
    const draft = athleteGraphDraftDeltas[athleteId] ?? null
    if (draft) {
      return resolveAthleteGraph(plan, draft, athleteGraphs[athleteId] ?? null)
    }
    const delta = athleteGraphDeltas[athleteId] ?? null
    return resolveAthleteGraph(plan, delta, athleteGraphs[athleteId] ?? null)
  },

  resetAthleteDelta: (athleteId) => {
    const { athleteGraphDeltas, athleteGraphDraftDeltas, athleteGraphs } = get()
    const hasDelta = athleteId in athleteGraphDeltas
    const hasDraft = athleteId in athleteGraphDraftDeltas
    const hasLegacy = athleteId in athleteGraphs
    if (!hasDelta && !hasDraft && !hasLegacy) return
    const nextDeltas = { ...athleteGraphDeltas }
    const nextDrafts = { ...athleteGraphDraftDeltas }
    const nextGraphs = { ...athleteGraphs }
    if (hasDelta) delete nextDeltas[athleteId]
    if (hasDraft) delete nextDrafts[athleteId]
    if (hasLegacy) delete nextGraphs[athleteId]
    set({
      athleteGraphDeltas: nextDeltas,
      athleteGraphDraftDeltas: nextDrafts,
      athleteGraphs: nextGraphs,
    })
    fireAndForget(api.deleteAthleteDelta(athleteId), 'resetAthleteDelta')
  },

  clearSportPlan: (sport) => {
    const key = String(sport)
    const {
      sportPlans,
      athleteGraphDeltas,
      athleteGraphDraftDeltas,
      athleteGraphs,
      sportData,
    } = get()
    const athleteIdsOnSport = new Set(
      sportData.athletes.filter((a) => a.sport === key).map((a) => a.id),
    )

    const nextPlans = { ...sportPlans }
    if (key in nextPlans) delete nextPlans[key]

    const nextDeltas: Record<string, GraphDelta> = {}
    for (const [aid, delta] of Object.entries(athleteGraphDeltas)) {
      if (!athleteIdsOnSport.has(aid)) nextDeltas[aid] = delta
    }

    const nextDrafts: Record<string, GraphDelta> = {}
    for (const [aid, delta] of Object.entries(athleteGraphDraftDeltas)) {
      if (!athleteIdsOnSport.has(aid)) nextDrafts[aid] = delta
    }

    const nextGraphs: Record<string, GeneratedGraph> = {}
    for (const [aid, graph] of Object.entries(athleteGraphs)) {
      if (!athleteIdsOnSport.has(aid)) nextGraphs[aid] = graph
    }

    set({
      sportPlans: nextPlans,
      athleteGraphDeltas: nextDeltas,
      athleteGraphDraftDeltas: nextDrafts,
      athleteGraphs: nextGraphs,
    })
    fireAndForget(api.clearSportPlan(key), 'clearSportPlan')
  },

  getSkillsForSport: (sport) => {
    const { sportData } = get()
    return sportData.skills.filter((s) => s.sport === 'universal' || s.sport === sport)
  },

  getAthletesForSport: (sport) => {
    const { sportData } = get()
    return sportData.athletes.filter((a) => a.sport === sport)
  },

  getTasksForSport: (sport) => {
    const { sportData } = get()
    return sportData.tasks.filter((t) => t.sport === 'universal' || t.sport === sport)
  },

  /* ─── Adaptive diagnostic ─── */

  runDiagnostic: (athleteId, entries, derivedStatus, escalations = []) => {
    const now = Date.now()
    const state = get()

    const nextMastered = new Set<string>()
    const nextConditional: Record<string, ConditionalState> = {}
    const nextReviewState: Record<string, ReviewSkillState> = {}

    for (const [skillId, status] of Object.entries(derivedStatus)) {
      if (status === 'known') {
        nextMastered.add(skillId)
      } else if (status === 'conditional') {
        nextMastered.add(skillId)
        nextConditional[skillId] = { confidence: 0.5, successes: 0 }
        // Surface conditional skills as due-now reviews so a freshly
        // onboarded athlete always sees something on day one.
        nextReviewState[skillId] = {
          stability: 0.5,
          lastReviewedAt: now,
          dueAt: now,
        }
      }
    }

    // Stagger reviewState for "known" skills so the dashboard surfaces a
    // steady drip of review tasks (some due now, some in 1-2 days) instead
    // of nothing on day one.
    const seededKnown = seedMissingReviewState(nextMastered, nextReviewState, now)
    Object.assign(nextReviewState, seededKnown.reviewState)

    const nextAthleteMastery = { ...state.athleteMastery, [athleteId]: nextMastered }
    const nextAthleteConditional = {
      ...state.athleteConditional,
      [athleteId]: nextConditional,
    }
    const nextAthleteReviewState = {
      ...state.athleteReviewState,
      [athleteId]: nextReviewState,
    }
    const nextAthleteDiagnostic = {
      ...state.athleteDiagnostic,
      [athleteId]: { completedAt: now, log: entries, escalations },
    }
    const nextSkillProgress = { ...state.athleteSkillProgress, [athleteId]: {} }
    const nextCompletedTasks = {
      ...state.athleteCompletedTasks,
      [athleteId]: new Set<string>(),
    }
    const nextTaskSnapshots = {
      ...state.athleteTaskSnapshots,
      [athleteId]: {},
    }
    const nextReonboardStatus = { ...state.athleteReonboardStatus }
    delete nextReonboardStatus[athleteId]

    const stagedState: FrontierState = {
      ...state,
      athleteMastery: nextAthleteMastery,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteDiagnostic: nextAthleteDiagnostic,
      athleteSkillProgress: nextSkillProgress,
      athleteCompletedTasks: nextCompletedTasks,
      athleteTaskSnapshots: nextTaskSnapshots,
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
      athleteTaskSnapshots: nextTaskSnapshots,
      athleteDashboard: nextDashboard,
      athleteReonboardStatus: nextReonboardStatus,
      ...(isSelected ? { mastered: nextMastered } : {}),
    })

    const patch: ApiStatePatch = {
      mastery: [...nextMastered],
      conditional: nextConditional,
      reviewState: nextReviewState,
      diagnostic: { completedAt: now, log: entries, escalations },
      skillProgress: {},
      completedTasks: [],
      taskSnapshots: {},
      dashboard: { taskIds: nextIds, updatedAt: now },
      reonboardStatus: null,
    }
    fireAndForget(api.patchAthleteState(athleteId, patch), 'runDiagnostic')
  },

  clearDiagnostic: (athleteId) => {
    const state = get()
    const { [athleteId]: _d, ...rest } = state.athleteDiagnostic
    set({ athleteDiagnostic: rest })
    fireAndForget(
      api.patchAthleteState(athleteId, { diagnostic: null }),
      'clearDiagnostic',
    )
  },

  seedReonboardedAthlete: ({ athleteId, mastered, conditional, rationale }) => {
    const now = Date.now()
    const state = get()
    const nextMastered = new Set(mastered)
    const nextConditional: Record<string, ConditionalState> = {}
    const nextReviewState: Record<string, ReviewSkillState> = {}

    for (const [id, v] of Object.entries(conditional)) {
      nextConditional[id] = { confidence: v.confidence, successes: 0 }
      // Match runDiagnostic: conditional skills are due immediately so the
      // dashboard never starts empty after a re-onboard.
      nextReviewState[id] = {
        stability: 0.5,
        lastReviewedAt: now,
        dueAt: now,
      }
    }
    // Stagger known-skill reviews so a portion are immediately due and the
    // rest roll in over the next two days.
    const seededKnown = seedMissingReviewState(nextMastered, nextReviewState, now)
    Object.assign(nextReviewState, seededKnown.reviewState)

    const nextAthleteMastery = { ...state.athleteMastery, [athleteId]: nextMastered }
    const nextAthleteConditional = {
      ...state.athleteConditional,
      [athleteId]: nextConditional,
    }
    const nextAthleteReviewState = {
      ...state.athleteReviewState,
      [athleteId]: nextReviewState,
    }
    const nextSkillProgress = { ...state.athleteSkillProgress, [athleteId]: {} }
    const nextCompletedTasks = {
      ...state.athleteCompletedTasks,
      [athleteId]: new Set<string>(),
    }
    const nextTaskSnapshots = {
      ...state.athleteTaskSnapshots,
      [athleteId]: {},
    }
    const reonboardStatus: ReonboardStatus = {
      aiReonboarded: true,
      at: now,
      rationale,
      confirmed: false,
    }
    const nextReonboardStatus = {
      ...state.athleteReonboardStatus,
      [athleteId]: reonboardStatus,
    }

    const stagedState: FrontierState = {
      ...state,
      athleteMastery: nextAthleteMastery,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteSkillProgress: nextSkillProgress,
      athleteCompletedTasks: nextCompletedTasks,
      athleteTaskSnapshots: nextTaskSnapshots,
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
      athleteTaskSnapshots: nextTaskSnapshots,
      athleteReonboardStatus: nextReonboardStatus,
      athleteDashboard: nextDashboard,
      ...(isSelected ? { mastered: nextMastered } : {}),
    })

    fireAndForget(
      api.patchAthleteState(athleteId, {
        mastery: [...nextMastered],
        conditional: nextConditional,
        reviewState: nextReviewState,
        skillProgress: {},
        completedTasks: [],
        taskSnapshots: {},
        reonboardStatus,
        dashboard: { taskIds: nextIds, updatedAt: now },
      }),
      'seedReonboardedAthlete',
    )
  },

  confirmReonboard: (athleteId) => {
    const state = get()
    const cur = state.athleteReonboardStatus[athleteId]
    if (!cur) return
    const updated = { ...cur, confirmed: true }
    const next = { ...state.athleteReonboardStatus, [athleteId]: updated }
    set({ athleteReonboardStatus: next })
    fireAndForget(
      api.patchAthleteState(athleteId, { reonboardStatus: updated }),
      'confirmReonboard',
    )
  },

  completeTask: (athleteId, taskId) => {
    const now = Date.now()
    const state = get()
    const ctx = buildCandidateContext(state, athleteId, now)
    if (!ctx) return
    const task = ctx.tasks.find((t) => t.id === taskId)
    if (!task) return

    if ((state.athleteCompletedTasks[athleteId] ?? new Set()).has(taskId)) return

    // Snapshot the prior training state so `uncompleteTask` can restore it.
    const priorMastery = state.athleteMastery[athleteId] ?? new Set<string>()
    const priorSkillProgress = state.athleteSkillProgress[athleteId] ?? {}
    const priorConditional = state.athleteConditional[athleteId] ?? {}
    const priorReviewState = state.athleteReviewState[athleteId] ?? {}
    const snapshot: TaskCompletionSnapshot = {
      mastered: [...priorMastery],
      skillProgress: { ...priorSkillProgress },
      conditional: { ...priorConditional },
      reviewState: { ...priorReviewState },
    }

    const result = fireCompleteTask({
      task,
      skillById: ctx.skillById,
      prereqClosure: ctx.prereqClosure,
      mastered: ctx.mastered,
      skillProgress: ctx.skillProgress,
      conditional: priorConditional,
      reviewState: ctx.reviewState,
      now,
    })

    const completedSet = new Set(state.athleteCompletedTasks[athleteId] ?? new Set<string>())
    completedSet.add(taskId)

    const nextAthleteMastery = { ...state.athleteMastery, [athleteId]: result.mastered }
    const nextAthleteSkillProgress = {
      ...state.athleteSkillProgress,
      [athleteId]: result.skillProgress,
    }
    const nextAthleteConditional = {
      ...state.athleteConditional,
      [athleteId]: result.conditional,
    }
    const nextAthleteReviewState = {
      ...state.athleteReviewState,
      [athleteId]: result.reviewState,
    }
    const nextAthleteCompletedTasks = {
      ...state.athleteCompletedTasks,
      [athleteId]: completedSet,
    }
    const nextAthleteTaskSnapshots = {
      ...state.athleteTaskSnapshots,
      [athleteId]: {
        ...(state.athleteTaskSnapshots[athleteId] ?? {}),
        [taskId]: snapshot,
      },
    }

    const stagedState: FrontierState = {
      ...state,
      athleteMastery: nextAthleteMastery,
      athleteSkillProgress: nextAthleteSkillProgress,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteCompletedTasks: nextAthleteCompletedTasks,
    }
    const refilledCtx = buildCandidateContext(stagedState, athleteId, now)
    // Keep the completed taskId in the dashboard so it stays visible (rendered
    // as "done"). The cap counts only non-completed tasks, so a fresh task
    // will still drop in alongside it.
    const currentIds = state.athleteDashboard[athleteId]?.taskIds ?? []
    const nextIds = refilledCtx
      ? computeDashboardFill(refilledCtx, currentIds, DEFAULT_DASHBOARD_CAP)
      : currentIds
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
      athleteTaskSnapshots: nextAthleteTaskSnapshots,
      athleteDashboard: nextDashboard,
      ...(isSelected ? { mastered: result.mastered } : {}),
    })

    fireAndForget(
      api.patchAthleteState(athleteId, {
        mastery: [...result.mastered],
        skillProgress: result.skillProgress,
        conditional: result.conditional,
        reviewState: result.reviewState,
        completedTasks: [...completedSet],
        taskSnapshots: nextAthleteTaskSnapshots[athleteId],
        dashboard: { taskIds: nextIds, updatedAt: now },
      }),
      'completeTask',
    )
  },

  uncompleteTask: (athleteId, taskId) => {
    const now = Date.now()
    const state = get()
    const completedSet = new Set(state.athleteCompletedTasks[athleteId] ?? new Set<string>())
    if (!completedSet.has(taskId)) return
    completedSet.delete(taskId)

    const snapshot = state.athleteTaskSnapshots[athleteId]?.[taskId] ?? null

    // Restore prior training state from the snapshot (persisted in
    // `athlete_training_state.task_snapshots`). The fallback only kicks in
    // for legacy completions recorded before snapshots were captured - in
    // that case derived state (XP/mastery/reviews) stays as-is and we just
    // flip the completed flag so the row turns back on.
    const restoredMastery = snapshot
      ? new Set(snapshot.mastered)
      : (state.athleteMastery[athleteId] ?? new Set<string>())
    const restoredSkillProgress = snapshot
      ? snapshot.skillProgress
      : (state.athleteSkillProgress[athleteId] ?? {})
    const restoredConditional = snapshot
      ? snapshot.conditional
      : (state.athleteConditional[athleteId] ?? {})
    const restoredReviewState = snapshot
      ? snapshot.reviewState
      : (state.athleteReviewState[athleteId] ?? {})

    const nextAthleteMastery = { ...state.athleteMastery, [athleteId]: restoredMastery }
    const nextAthleteSkillProgress = {
      ...state.athleteSkillProgress,
      [athleteId]: restoredSkillProgress,
    }
    const nextAthleteConditional = {
      ...state.athleteConditional,
      [athleteId]: restoredConditional,
    }
    const nextAthleteReviewState = {
      ...state.athleteReviewState,
      [athleteId]: restoredReviewState,
    }
    const nextAthleteCompletedTasks = {
      ...state.athleteCompletedTasks,
      [athleteId]: completedSet,
    }
    const nextSnapshotsForAthlete = { ...(state.athleteTaskSnapshots[athleteId] ?? {}) }
    delete nextSnapshotsForAthlete[taskId]
    const nextAthleteTaskSnapshots = {
      ...state.athleteTaskSnapshots,
      [athleteId]: nextSnapshotsForAthlete,
    }

    const isSelected = state.selectedAthleteId === athleteId
    const currentIds = state.athleteDashboard[athleteId]?.taskIds ?? []
    const nextDashboard = {
      ...state.athleteDashboard,
      [athleteId]: { taskIds: currentIds, updatedAt: now },
    }

    set({
      athleteMastery: nextAthleteMastery,
      athleteSkillProgress: nextAthleteSkillProgress,
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
      athleteCompletedTasks: nextAthleteCompletedTasks,
      athleteTaskSnapshots: nextAthleteTaskSnapshots,
      athleteDashboard: nextDashboard,
      ...(isSelected ? { mastered: restoredMastery } : {}),
    })

    fireAndForget(
      api.patchAthleteState(athleteId, {
        mastery: [...restoredMastery],
        skillProgress: restoredSkillProgress,
        conditional: restoredConditional,
        reviewState: restoredReviewState,
        completedTasks: [...completedSet],
        taskSnapshots: nextSnapshotsForAthlete,
        dashboard: { taskIds: currentIds, updatedAt: now },
      }),
      'uncompleteTask',
    )
  },

  clearCompletedTasks: (athleteId) => {
    const now = Date.now()
    const state = get()
    const completedSet = state.athleteCompletedTasks[athleteId] ?? new Set<string>()
    if (completedSet.size === 0) return
    const currentIds = state.athleteDashboard[athleteId]?.taskIds ?? []
    const remainingIds = currentIds.filter((id) => !completedSet.has(id))
    if (remainingIds.length === currentIds.length) return

    // Refill from the candidate pool now that the cleared rows freed slots.
    const ctx = buildCandidateContext(state, athleteId, now)
    const nextIds = ctx
      ? computeDashboardFill(ctx, remainingIds, DEFAULT_DASHBOARD_CAP)
      : remainingIds
    const nextDashboard = {
      ...state.athleteDashboard,
      [athleteId]: { taskIds: nextIds, updatedAt: now },
    }

    // Drop snapshots for any tasks we just removed from the dashboard so the
    // backend payload doesn't grow unbounded.
    const removedIds = new Set(currentIds.filter((id) => !nextIds.includes(id)))
    const priorSnapshots = state.athleteTaskSnapshots[athleteId] ?? {}
    const nextSnapshotsForAthlete: Record<string, TaskCompletionSnapshot> = {}
    for (const [tid, snap] of Object.entries(priorSnapshots)) {
      if (!removedIds.has(tid)) nextSnapshotsForAthlete[tid] = snap
    }
    const nextAthleteTaskSnapshots = {
      ...state.athleteTaskSnapshots,
      [athleteId]: nextSnapshotsForAthlete,
    }

    set({
      athleteDashboard: nextDashboard,
      athleteTaskSnapshots: nextAthleteTaskSnapshots,
    })

    fireAndForget(
      api.patchAthleteState(athleteId, {
        dashboard: { taskIds: nextIds, updatedAt: now },
        taskSnapshots: nextSnapshotsForAthlete,
      }),
      'clearCompletedTasks',
    )
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

    const nextAthleteConditional = {
      ...state.athleteConditional,
      [athleteId]: result.conditional,
    }
    const nextAthleteReviewState = {
      ...state.athleteReviewState,
      [athleteId]: result.reviewState,
    }
    set({
      athleteConditional: nextAthleteConditional,
      athleteReviewState: nextAthleteReviewState,
    })
    fireAndForget(
      api.patchAthleteState(athleteId, {
        conditional: result.conditional,
        reviewState: result.reviewState,
      }),
      'failTask',
    )
  },

  getDashboardTasks: (athleteId) => {
    const now = Date.now()
    const state = get()
    const ctx = buildCandidateContext(state, athleteId, now)
    if (!ctx) return []
    const currentIds = state.athleteDashboard[athleteId]?.taskIds ?? []
    const nextIds = computeDashboardFill(ctx, currentIds, DEFAULT_DASHBOARD_CAP)
    const changed =
      nextIds.length !== currentIds.length || nextIds.some((id, i) => currentIds[i] !== id)
    if (changed) {
      const dashboard = { taskIds: nextIds, updatedAt: now }
      const nextDashboard = { ...state.athleteDashboard, [athleteId]: dashboard }
      set({ athleteDashboard: nextDashboard })
      fireAndForget(
        api.patchAthleteState(athleteId, { dashboard }),
        'getDashboardTasks.persist',
      )
    }
    const tasksById = new Map(ctx.tasks.map((t) => [t.id, t]))
    const out: TodayTask[] = []
    for (const id of nextIds) {
      const t = tasksById.get(id)
      if (t) out.push(t)
    }
    return out
  },

  getAthleteSkillProgress: (athleteId) => get().athleteSkillProgress[athleteId] ?? {},
  getAthleteReviewState: (athleteId) => get().athleteReviewState[athleteId] ?? {},
  getAthleteConditional: (athleteId) => get().athleteConditional[athleteId] ?? {},
  getAthleteDiagnostic: (athleteId) => get().athleteDiagnostic[athleteId] ?? null,

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
    fireAndForget(
      api.patchAthleteState(athleteId, { mastery: [...cur] }),
      'overrideMastery',
    )
  },
}))

export { isFrontier, dueSkills }
