/**
 * One-shot migration from the legacy localStorage keys to the Postgres
 * backend. Reads every key, POSTs them to `/api/import-legacy`, then clears
 * the keys so subsequent loads skip this path.
 *
 * Safe to delete this file (and the import-legacy endpoint) one release
 * after the migration has rolled out.
 */

import { api, type LegacyImportPayload } from './api'
import type { ConditionalState, ReviewSkillState } from './fire'
import type {
  DashboardState,
  DiagnosticRecord,
  ReonboardStatus,
} from '../store/useFrontierStore'

const LEGACY_KEYS = [
  'frontier-athlete-graphs',
  'frontier-sport-plans',
  'frontier-athlete-deltas',
  'frontier-athlete-draft-deltas',
  'frontier-athlete-mastery',
  'frontier-athlete-readiness',
  'frontier-athlete-skill-progress',
  'frontier-athlete-completed-tasks',
  'frontier-athlete-conditional',
  'frontier-athlete-review-state',
  'frontier-athlete-diagnostic',
  'frontier-athlete-dashboard',
  'frontier-athlete-reonboard-status',
] as const

const MIGRATION_FLAG = 'frontier-migrated-to-postgres-v1'

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function hasAnyLegacyData(): boolean {
  for (const key of LEGACY_KEYS) {
    if (localStorage.getItem(key) != null) return true
  }
  return false
}

export async function migrateLocalStorageIfNeeded(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return
    if (!hasAnyLegacyData()) {
      localStorage.setItem(MIGRATION_FLAG, '1')
      return
    }

    const payload = buildPayload()
    const totalCount =
      payload.sportPlans.length +
      payload.athleteDeltas.length +
      payload.athleteDraftDeltas.length +
      payload.athleteGraphsLegacy.length +
      payload.athleteTrainingState.length

    if (totalCount === 0) {
      localStorage.setItem(MIGRATION_FLAG, '1')
      return
    }

    await api.importLegacy(payload)

    for (const key of LEGACY_KEYS) localStorage.removeItem(key)
    localStorage.setItem(MIGRATION_FLAG, '1')
    console.info(`[FrontierOS] Migrated ${totalCount} legacy records to Postgres.`)
  } catch (err) {
    // Don't flip the flag on failure — we'll retry next load.
    console.warn('[FrontierOS] localStorage migration failed, will retry next load', err)
  }
}

function buildPayload(): LegacyImportPayload {
  const sportPlansRaw =
    readJson<Record<string, { graph: unknown; version: string; requirements?: string; history?: unknown; updatedAt?: number }>>('frontier-sport-plans') ?? {}
  const deltasRaw = readJson<Record<string, unknown>>('frontier-athlete-deltas') ?? {}
  const draftsRaw = readJson<Record<string, unknown>>('frontier-athlete-draft-deltas') ?? {}
  const legacyGraphsRaw = readJson<Record<string, unknown>>('frontier-athlete-graphs') ?? {}

  const mastery = readJson<Record<string, string[]>>('frontier-athlete-mastery') ?? {}
  const readiness = readJson<Record<string, number>>('frontier-athlete-readiness') ?? {}
  const skillProgress =
    readJson<Record<string, Record<string, number>>>('frontier-athlete-skill-progress') ?? {}
  const completedTasks =
    readJson<Record<string, string[]>>('frontier-athlete-completed-tasks') ?? {}
  const conditional =
    readJson<Record<string, Record<string, ConditionalState>>>('frontier-athlete-conditional') ?? {}
  const reviewState =
    readJson<Record<string, Record<string, ReviewSkillState>>>(
      'frontier-athlete-review-state',
    ) ?? {}
  const diagnostic =
    readJson<Record<string, DiagnosticRecord>>('frontier-athlete-diagnostic') ?? {}
  const dashboard =
    readJson<Record<string, DashboardState>>('frontier-athlete-dashboard') ?? {}
  const reonboardStatus =
    readJson<Record<string, ReonboardStatus>>('frontier-athlete-reonboard-status') ?? {}

  const sportPlans: LegacyImportPayload['sportPlans'] = Object.entries(sportPlansRaw).map(
    ([sport, plan]) => ({
      sport,
      graph: plan.graph,
      version: plan.version,
      requirements: plan.requirements ?? '',
      history: plan.history ?? [],
      updatedAt: plan.updatedAt,
    }),
  )

  const athleteDeltas: LegacyImportPayload['athleteDeltas'] = Object.entries(deltasRaw).map(
    ([athleteId, delta]) => ({ athleteId, delta }),
  )
  const athleteDraftDeltas: LegacyImportPayload['athleteDraftDeltas'] = Object.entries(
    draftsRaw,
  ).map(([athleteId, delta]) => ({ athleteId, delta }))
  const athleteGraphsLegacy: LegacyImportPayload['athleteGraphsLegacy'] = Object.entries(
    legacyGraphsRaw,
  ).map(([athleteId, graph]) => ({ athleteId, graph }))

  const ids = new Set<string>([
    ...Object.keys(mastery),
    ...Object.keys(readiness),
    ...Object.keys(skillProgress),
    ...Object.keys(completedTasks),
    ...Object.keys(conditional),
    ...Object.keys(reviewState),
    ...Object.keys(diagnostic),
    ...Object.keys(dashboard),
    ...Object.keys(reonboardStatus),
  ])

  const athleteTrainingState: LegacyImportPayload['athleteTrainingState'] = Array.from(
    ids,
  ).map((athleteId) => ({
    athleteId,
    mastery: mastery[athleteId],
    readiness: readiness[athleteId],
    skillProgress: skillProgress[athleteId],
    completedTasks: completedTasks[athleteId],
    conditional: conditional[athleteId],
    reviewState: reviewState[athleteId],
    diagnostic: diagnostic[athleteId] ?? null,
    dashboard: dashboard[athleteId] ?? null,
    reonboardStatus: reonboardStatus[athleteId] ?? null,
  }))

  return {
    sportPlans,
    athleteDeltas,
    athleteDraftDeltas,
    athleteGraphsLegacy,
    athleteTrainingState,
  }
}
