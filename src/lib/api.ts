/**
 * HTTP client for the FrontierOS backend. Every mutation in the Zustand
 * store writes through one of these helpers. All shapes match the backend
 * contract in `backend/src/lib/apiTypes.ts`.
 */

import { parse as parsePartialJson } from 'partial-json'
import type { ChatMessage, GeneratedGraph, GraphDelta, SportPlan } from './graphSchema'
import type {
  ConditionalState,
  ReviewSkillState,
} from './fire'
import type {
  DashboardState,
  DiagnosticRecord,
  ReonboardStatus,
  TaskCompletionSnapshot,
} from '../store/useFrontierStore'

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
  taskSnapshots: Record<string, TaskCompletionSnapshot>
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
    taskSnapshots?: Record<string, TaskCompletionSnapshot>
    diagnostic?: DiagnosticRecord | null
    dashboard?: DashboardState | null
    reonboardStatus?: ReonboardStatus | null
  }>
}

let bootstrapInflight: Promise<BootstrapResponse> | null = null

/** Starts GET /bootstrap once; later callers share the same promise (faster cold load). */
export function prefetchBootstrap(): Promise<BootstrapResponse> {
  if (!bootstrapInflight) {
    bootstrapInflight = request<BootstrapResponse>('GET', '/bootstrap')
  }
  return bootstrapInflight
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
  bootstrap: () => prefetchBootstrap(),

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

/* ─── Streaming: escalation probe ────────────────────────────────────── */

export interface EscalationProbeAthleteContext {
  name: string
  firstName?: string
  position?: string
  schoolYear?: string
  age?: number
  tagline?: string
  readiness?: number
}

export interface EscalationProbeSkill {
  id: string
  label: string
  summary?: string
  level: number
  prereqs: string[]
  prereqLabels?: string[]
}

export interface EscalationProbeAttempt {
  prompt: string
  verdict: 'pass' | 'fail' | 'conditional'
  skillLabel?: string
}

export interface EscalationProbeRequest {
  sport: string
  skill: EscalationProbeSkill
  priorAttempts?: EscalationProbeAttempt[]
  athleteContext?: EscalationProbeAthleteContext
}

export interface EscalationProbeResult {
  prompt: string
  rationale: string
}

export interface EscalationProbePartial {
  /** Best-effort `prompt` parsed from the in-progress JSON stream. */
  prompt: string
  /** Best-effort `rationale` parsed from the in-progress JSON stream. */
  rationale: string
  /** True once the JSON object has fully closed and both fields are non-empty. */
  complete: boolean
}

export interface StreamEscalationProbeOptions {
  onPartial?: (partial: EscalationProbePartial) => void
  signal?: AbortSignal
}

function partialFromContent(content: string): EscalationProbePartial {
  let prompt = ''
  let rationale = ''
  try {
    const parsed = parsePartialJson(content) as { prompt?: unknown; rationale?: unknown } | null
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.prompt === 'string') prompt = parsed.prompt
      if (typeof parsed.rationale === 'string') rationale = parsed.rationale
    }
  } catch {
    // not parseable yet
  }
  let complete = false
  try {
    const finalParsed = JSON.parse(content) as { prompt?: unknown; rationale?: unknown }
    complete =
      typeof finalParsed.prompt === 'string' &&
      finalParsed.prompt.length > 0 &&
      typeof finalParsed.rationale === 'string'
  } catch {
    complete = false
  }
  return { prompt, rationale, complete }
}

/** Hard cap on a single escalation probe round-trip. The endpoint
 *  normally answers in ~1s; if a proxy (Netlify edge, Vite dev, etc.)
 *  silently buffers or drops the SSE stream we want to surface a real
 *  error in the UI instead of leaving the coach staring at a spinner. */
const ESCALATION_PROBE_TIMEOUT_MS = 25_000

/** Combine a caller-provided AbortSignal with our own timeout signal so
 *  whichever fires first cancels the in-flight fetch. */
function mergeSignals(signals: (AbortSignal | undefined)[]): {
  signal: AbortSignal
  cleanup: () => void
} {
  const controller = new AbortController()
  const live = signals.filter((s): s is AbortSignal => !!s)
  const onAbort = (sig: AbortSignal) => () => {
    if (!controller.signal.aborted) controller.abort(sig.reason)
  }
  const handlers = live.map((s) => {
    const h = onAbort(s)
    if (s.aborted) controller.abort(s.reason)
    else s.addEventListener('abort', h, { once: true })
    return [s, h] as const
  })
  return {
    signal: controller.signal,
    cleanup: () => {
      for (const [s, h] of handlers) s.removeEventListener('abort', h)
    },
  }
}

/**
 * Stream a single AI-generated harder probe over SSE. Mirrors the reader
 * pattern in `generateApi.ts` so partial chunks render live in the UI.
 *
 * Wraps the fetch in a 25s timeout so a buffering proxy (Netlify edge,
 * Vite dev, misconfigured CDN) can't hang the diagnostic forever.
 */
export async function streamEscalationProbe(
  req: EscalationProbeRequest,
  options?: StreamEscalationProbeOptions,
): Promise<EscalationProbeResult> {
  const startedAt = performance.now()
  const timeoutSignal = AbortSignal.timeout(ESCALATION_PROBE_TIMEOUT_MS)
  const merged = mergeSignals([options?.signal, timeoutSignal])
  // eslint-disable-next-line no-console
  console.info('[probe] →', req.skill?.label ?? req.skill?.id, {
    sport: req.sport,
    priorAttempts: req.priorAttempts?.length ?? 0,
  })

  let res: Response
  try {
    res = await fetch(`${API_BASE}/diagnostic/probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: merged.signal,
    })
  } catch (err) {
    merged.cleanup()
    if (timeoutSignal.aborted) {
      throw new Error(`Escalation probe timed out after ${Math.round((performance.now() - startedAt) / 1000)}s — the network or proxy is buffering. Retry or skip this branch.`)
    }
    throw err
  }

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    merged.cleanup()
    throw new Error(`Escalation probe failed (${res.status}): ${text}`)
  }
  if (!res.body) {
    merged.cleanup()
    throw new Error('Escalation probe response missing body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let content = ''
  let buffer = ''
  const onPartial = options?.onPartial

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const payload = trimmed.slice(6)
        if (payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            content += delta
            onPartial?.(partialFromContent(content))
          }
        } catch {
          // partial SSE line, ignore
        }
      }
    }
  } catch (err) {
    merged.cleanup()
    if (timeoutSignal.aborted) {
      throw new Error(`Escalation probe timed out after ${Math.round((performance.now() - startedAt) / 1000)}s — the stream stalled mid-response.`)
    }
    throw err
  }

  merged.cleanup()

  let parsed: EscalationProbeResult
  try {
    parsed = JSON.parse(content) as EscalationProbeResult
  } catch (err) {
    throw new Error(`Escalation probe returned non-JSON content: ${err}`)
  }
  if (typeof parsed.prompt !== 'string' || parsed.prompt.length === 0) {
    throw new Error('Escalation probe returned empty prompt')
  }
  if (typeof parsed.rationale !== 'string') {
    parsed.rationale = ''
  }
  // eslint-disable-next-line no-console
  console.info('[probe] ✓', req.skill?.label ?? req.skill?.id, {
    elapsedMs: Math.round(performance.now() - startedAt),
  })
  return parsed
}

export type {
  ApiAthlete,
  ApiDelta as ApiAthleteDelta,
  ApiLegacyGraph,
  ApiSportPlan,
}
