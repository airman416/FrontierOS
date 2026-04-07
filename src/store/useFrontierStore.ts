import { create } from 'zustand'
import {
  readinessBand,
  SKILL_BY_ID,
  type ReadinessBand,
} from '../data/graph'
import {
  ATHLETES,
  INITIAL_ATHLETE_MASTERY,
  INITIAL_ATHLETE_READINESS,
} from '../data/athletes'

export type VisualRole = 'locked' | 'frontier' | 'mastered' | 'highRisk'

function basePrereqsMet(id: string, mastered: Set<string>): boolean {
  const s = SKILL_BY_ID[id]
  return s.prereqs.every((p) => mastered.has(p))
}

function computeBaseLocked(id: string, mastered: Set<string>): boolean {
  const s = SKILL_BY_ID[id]
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
): VisualRole {
  const s = SKILL_BY_ID[id]
  const band = readinessBand(readinessScore)
  const baseLocked = computeBaseLocked(id, mastered)
  const isMastered = mastered.has(id)
  const prereqsMet = basePrereqsMet(id, mastered)
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
): boolean {
  return computeVisualRole(id, mastered, readinessScore) === 'frontier'
}

interface FrontierState {
  selectedAthleteId: string
  athleteMastery: Record<string, Set<string>>
  athleteReadiness: Record<string, number>

  /** Active athlete state — mirrors selected athlete for backward compat */
  mastered: Set<string>
  readinessScore: number

  selectAthlete: (id: string) => void
  setReadinessScore: (n: number) => void
  toggleMaster: (id: string) => void
  resetDemo: () => void
  getVisualRole: (id: string) => VisualRole
}

function buildInitialMastery(): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {}
  for (const athlete of ATHLETES) {
    result[athlete.id] = new Set(INITIAL_ATHLETE_MASTERY[athlete.id] ?? [])
  }
  return result
}

function buildInitialReadiness(): Record<string, number> {
  const result: Record<string, number> = {}
  for (const athlete of ATHLETES) {
    result[athlete.id] = INITIAL_ATHLETE_READINESS[athlete.id] ?? 100
  }
  return result
}

const DEFAULT_ATHLETE = ATHLETES[0].id

export const useFrontierStore = create<FrontierState>((set, get) => ({
  selectedAthleteId: DEFAULT_ATHLETE,
  athleteMastery: buildInitialMastery(),
  athleteReadiness: buildInitialReadiness(),
  mastered: new Set(INITIAL_ATHLETE_MASTERY[DEFAULT_ATHLETE]),
  readinessScore: INITIAL_ATHLETE_READINESS[DEFAULT_ATHLETE],

  selectAthlete: (id) => {
    const { athleteMastery, athleteReadiness } = get()
    set({
      selectedAthleteId: id,
      mastered: new Set(athleteMastery[id] ?? []),
      readinessScore: athleteReadiness[id] ?? 100,
    })
  },

  setReadinessScore: (n) => {
    const { selectedAthleteId, athleteReadiness } = get()
    const score = Math.max(0, Math.min(100, Math.round(n)))
    set({
      readinessScore: score,
      athleteReadiness: { ...athleteReadiness, [selectedAthleteId]: score },
    })
  },

  toggleMaster: (id) => {
    const { mastered, readinessScore, selectedAthleteId, athleteMastery } =
      get()
    if (!isClickableFrontier(id, mastered, readinessScore)) return

    const next = new Set(mastered)
    next.add(id)
    set({
      mastered: next,
      athleteMastery: { ...athleteMastery, [selectedAthleteId]: next },
    })
  },

  resetDemo: () => {
    const initial = buildInitialMastery()
    const initialReadiness = buildInitialReadiness()
    const { selectedAthleteId } = get()
    set({
      athleteMastery: initial,
      athleteReadiness: initialReadiness,
      mastered: new Set(initial[selectedAthleteId]),
      readinessScore: initialReadiness[selectedAthleteId],
    })
  },

  getVisualRole: (id) =>
    computeVisualRole(id, get().mastered, get().readinessScore),
}))
