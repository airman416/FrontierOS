/**
 * HTTP client for the FrontierOS backend. Every mutation in the Zustand
 * store writes through one of these helpers. All shapes match the backend
 * contract in `backend/src/lib/apiTypes.ts`.
 */

import type { ChatMessage, GeneratedGraph, GraphDelta, SportPlan } from './graphSchema'
import type {
  ConditionalState,
  ReviewSkillState,
} from './fire'
import type { DashboardState, DiagnosticRecord, ReonboardStatus } from '../store/useFrontierStore'

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

interface ApiAthlete {
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

interface ApiSportPlan {
  sport: string
  graph: GeneratedGraph
  version: string
  requirements: string
  history: ChatMessage[]
  updatedAt: number
}

interface ApiDelta {
  athleteId: string
  delta: GraphDelta
  updatedAt: number
}

interface ApiLegacyGraph {
  athleteId: string
  graph: GeneratedGraph
  updatedAt: number
}

export interface ApiTrainingState {
  athleteId: string
  mastery: string[]
  readiness: number
  skillProgress: Record<string, number>
  completedTasks: string[]
  conditional: Record<string, ConditionalState>
  reviewState: Record<string, ReviewSkillState>
  diagnostic: DiagnosticRecord | null
  dashboard: DashboardState | null
  reonboardStatus: ReonboardStatus | null
  updatedAt: number
}

export interface BootstrapResponse {
  coachId: string
  athletes: ApiAthlete[]
  sportPlans: ApiSportPlan[]
  athleteDeltas: ApiDelta[]
  athleteDraftDeltas: ApiDelta[]
  athleteGraphsLegacy: ApiLegacyGraph[]
  athleteTrainingState: ApiTrainingState[]
}

export interface LegacyImportPayload {
  sportPlans: Array<{
    sport: string
    graph: unknown
    version: string
    requirements: string
    history: unknown
    updatedAt?: number
  }>
  athleteDeltas: Array<{ athleteId: string; delta: unknown; updatedAt?: number }>
  athleteDraftDeltas: Array<{ athleteId: string; delta: unknown; updatedAt?: number }>
  athleteGraphsLegacy: Array<{ athleteId: string; graph: unknown; updatedAt?: number }>
  athleteTrainingState: Array<{
    athleteId: string
    mastery?: string[]
    readiness?: number
    skillProgress?: Record<string, number>
    completedTasks?: string[]
    conditional?: Record<string, ConditionalState>
    reviewState?: Record<string, ReviewSkillState>
    diagnostic?: DiagnosticRecord | null
    dashboard?: DashboardState | null
    reonboardStatus?: ReonboardStatus | null
  }>
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body == null ? undefined : { 'Content-Type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`)
  }
  if (res.status === 204) return undefined as T
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) return undefined as T
  return (await res.json()) as T
}

export const api = {
  bootstrap: () => request<BootstrapResponse>('GET', '/bootstrap'),

  saveSportPlan: (sport: string, plan: Omit<SportPlan, 'sport' | 'updatedAt'>) =>
    request<{
      sportPlan: ApiSportPlan
      reonboardedAthletes: ApiTrainingState[]
    }>('PUT', `/sport-plans/${encodeURIComponent(sport)}`, {
      graph: plan.graph,
      version: plan.version,
      requirements: plan.requirements,
      history: plan.history,
    }),

  clearSportPlan: (sport: string) =>
    request<{ ok: true; clearedAthleteIds: string[] }>(
      'DELETE',
      `/sport-plans/${encodeURIComponent(sport)}`,
    ),

  saveAthleteDelta: (athleteId: string, delta: GraphDelta) =>
    request<{ ok: true }>('PUT', `/athletes/${encodeURIComponent(athleteId)}/delta`, { delta }),

  deleteAthleteDelta: (athleteId: string) =>
    request<{ ok: true }>('DELETE', `/athletes/${encodeURIComponent(athleteId)}/delta`),

  saveAthleteDraftDelta: (athleteId: string, delta: GraphDelta) =>
    request<{ ok: true }>('PUT', `/athletes/${encodeURIComponent(athleteId)}/draft-delta`, {
      delta,
    }),

  deleteAthleteDraftDelta: (athleteId: string) =>
    request<{ ok: true }>('DELETE', `/athletes/${encodeURIComponent(athleteId)}/draft-delta`),

  acceptAthleteDraft: (athleteId: string) =>
    request<{ ok: true; delta: GraphDelta; updatedAt: number }>(
      'POST',
      `/athletes/${encodeURIComponent(athleteId)}/accept-draft`,
    ),

  saveAthleteLegacyGraph: (athleteId: string, graph: GeneratedGraph) =>
    request<{ ok: true }>('PUT', `/athletes/${encodeURIComponent(athleteId)}/legacy-graph`, {
      graph,
    }),

  patchAthleteState: (
    athleteId: string,
    patch: Partial<
      Omit<ApiTrainingState, 'athleteId' | 'updatedAt'> & {
        diagnostic: DiagnosticRecord | null
        dashboard: DashboardState | null
        reonboardStatus: ReonboardStatus | null
      }
    >,
  ) =>
    request<ApiTrainingState>(
      'PATCH',
      `/athletes/${encodeURIComponent(athleteId)}/state`,
      patch,
    ),

  resetAthlete: (athleteId: string) =>
    request<ApiTrainingState>('POST', `/athletes/${encodeURIComponent(athleteId)}/reset`),

  resetDemo: () => request<{ ok: true; athleteCount: number }>('POST', '/reset-demo'),

  importLegacy: (payload: LegacyImportPayload) =>
    request<{ ok: true; imported: Record<string, number> }>('POST', '/import-legacy', payload),
}

export type {
  ApiAthlete,
  ApiDelta as ApiAthleteDelta,
  ApiLegacyGraph,
  ApiSportPlan,
}
