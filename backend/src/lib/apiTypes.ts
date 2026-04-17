/**
 * Shared API payload types. These mirror what the frontend Zustand store
 * consumes. Kept deliberately loose around graph/delta blobs so schema
 * drift between client and server doesn't require coordinated deploys.
 */

export interface ApiAthlete {
  id: string
  displayName: string
  firstName: string
  age: number
  position: string
  schoolYear: string
  sport: string
  avatarUrl: string | null
  avatarColor: string
  tagline: string
  initialMastery: string[]
  initialReadiness: number
}

export interface ApiSportPlan {
  sport: string
  graph: unknown
  version: string
  requirements: string
  history: unknown
  updatedAt: number
}

export interface ApiAthleteDelta {
  athleteId: string
  delta: unknown
  updatedAt: number
}

export interface ApiAthleteLegacyGraph {
  athleteId: string
  graph: unknown
  updatedAt: number
}

export interface ApiAthleteTrainingState {
  athleteId: string
  mastery: string[]
  readiness: number
  skillProgress: Record<string, number>
  completedTasks: string[]
  conditional: Record<string, { confidence: number; successes: number }>
  reviewState: Record<string, { stability: number; lastReviewedAt: number; dueAt: number }>
  diagnostic: { completedAt: number; log: Array<{ skillId: string; verdict: string }> } | null
  dashboard: { taskIds: string[]; updatedAt: number } | null
  reonboardStatus: {
    aiReonboarded: boolean
    at: number
    rationale: string
    confirmed?: boolean
  } | null
  updatedAt: number
}

export interface BootstrapResponse {
  coachId: string
  athletes: ApiAthlete[]
  sportPlans: ApiSportPlan[]
  athleteDeltas: ApiAthleteDelta[]
  athleteDraftDeltas: ApiAthleteDelta[]
  athleteGraphsLegacy: ApiAthleteLegacyGraph[]
  athleteTrainingState: ApiAthleteTrainingState[]
}
