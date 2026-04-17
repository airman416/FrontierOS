import type { FastifyInstance } from 'fastify'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client.js'
import {
  athleteGraphDeltas,
  athleteGraphDraftDeltas,
  athleteGraphsLegacy,
  athleteTrainingState,
  athletes,
} from '../db/schema.js'
import { getCurrentCoachId } from '../lib/coach.js'
import type { ApiAthleteTrainingState } from '../lib/apiTypes.js'

const reviewSkillStateSchema = z.object({
  stability: z.number(),
  lastReviewedAt: z.number(),
  dueAt: z.number(),
})

const conditionalStateSchema = z.object({
  confidence: z.number(),
  successes: z.number(),
})

const diagnosticSchema = z.object({
  completedAt: z.number(),
  log: z.array(z.object({ skillId: z.string(), verdict: z.string() }).passthrough()),
})

const dashboardSchema = z.object({
  taskIds: z.array(z.string()),
  updatedAt: z.number(),
})

const reonboardStatusSchema = z.object({
  aiReonboarded: z.boolean(),
  at: z.number(),
  rationale: z.string(),
  confirmed: z.boolean().optional(),
})

/**
 * Partial patch schema. Every field is optional; only the fields present in
 * the request body are updated. `null` for the nullable fields explicitly
 * clears them.
 */
const patchSchema = z.object({
  mastery: z.array(z.string()).optional(),
  readiness: z.number().int().min(0).max(100).optional(),
  skillProgress: z.record(z.string(), z.number()).optional(),
  completedTasks: z.array(z.string()).optional(),
  conditional: z.record(z.string(), conditionalStateSchema).optional(),
  reviewState: z.record(z.string(), reviewSkillStateSchema).optional(),
  diagnostic: diagnosticSchema.nullable().optional(),
  dashboard: dashboardSchema.nullable().optional(),
  reonboardStatus: reonboardStatusSchema.nullable().optional(),
})

function rowToApi(row: typeof athleteTrainingState.$inferSelect): ApiAthleteTrainingState {
  return {
    athleteId: row.athleteId,
    mastery: row.mastery ?? [],
    readiness: row.readiness,
    skillProgress: row.skillProgress ?? {},
    completedTasks: row.completedTasks ?? [],
    conditional: row.conditional ?? {},
    reviewState: row.reviewState ?? {},
    diagnostic: row.diagnostic ?? null,
    dashboard: row.dashboard ?? null,
    reonboardStatus: row.reonboardStatus ?? null,
    updatedAt: row.updatedAt.getTime(),
  }
}

async function loadOrInitState(athleteId: string) {
  const existing = await db
    .select()
    .from(athleteTrainingState)
    .where(eq(athleteTrainingState.athleteId, athleteId))
  if (existing[0]) return existing[0]

  // Seed from athlete roster defaults.
  const rosterRows = await db
    .select()
    .from(athletes)
    .where(eq(athletes.id, athleteId))
  const roster = rosterRows[0]

  const inserted = await db
    .insert(athleteTrainingState)
    .values({
      athleteId,
      mastery: roster?.initialMastery ?? [],
      readiness: roster?.initialReadiness ?? 100,
      skillProgress: {},
      completedTasks: [],
      conditional: {},
      reviewState: {},
      diagnostic: null,
      dashboard: null,
      reonboardStatus: null,
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning()

  if (inserted[0]) return inserted[0]
  const again = await db
    .select()
    .from(athleteTrainingState)
    .where(eq(athleteTrainingState.athleteId, athleteId))
  return again[0]
}

export async function registerAthleteStateRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/athletes/:id/state', async (req, reply) => {
    const { id } = req.params as { id: string }
    const row = await loadOrInitState(id)
    if (!row) {
      reply.code(404).send({ error: 'Athlete not found' })
      return
    }
    reply.send(rowToApi(row))
  })

  app.patch('/api/athletes/:id/state', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() })
      return
    }

    await loadOrInitState(id)

    const updates: Partial<typeof athleteTrainingState.$inferInsert> = {
      updatedAt: new Date(),
    }
    const p = parsed.data
    if (p.mastery !== undefined) updates.mastery = p.mastery
    if (p.readiness !== undefined) updates.readiness = p.readiness
    if (p.skillProgress !== undefined) updates.skillProgress = p.skillProgress
    if (p.completedTasks !== undefined) updates.completedTasks = p.completedTasks
    if (p.conditional !== undefined) updates.conditional = p.conditional
    if (p.reviewState !== undefined) updates.reviewState = p.reviewState
    if (p.diagnostic !== undefined) updates.diagnostic = p.diagnostic
    if (p.dashboard !== undefined) updates.dashboard = p.dashboard
    if (p.reonboardStatus !== undefined) updates.reonboardStatus = p.reonboardStatus

    const updated = await db
      .update(athleteTrainingState)
      .set(updates)
      .where(eq(athleteTrainingState.athleteId, id))
      .returning()
    if (!updated[0]) {
      reply.code(500).send({ error: 'Failed to update training state' })
      return
    }
    reply.send(rowToApi(updated[0]))
  })

  /**
   * Reset a single athlete's training state back to their seeded defaults and
   * drop any per-athlete graph overrides. Used by the "reset" affordance in
   * the coach UI.
   */
  app.post('/api/athletes/:id/reset', async (req, reply) => {
    const { id } = req.params as { id: string }
    const rosterRows = await db
      .select()
      .from(athletes)
      .where(eq(athletes.id, id))
    const roster = rosterRows[0]
    if (!roster) {
      reply.code(404).send({ error: 'Athlete not found' })
      return
    }

    const now = new Date()
    await db
      .insert(athleteTrainingState)
      .values({
        athleteId: id,
        mastery: roster.initialMastery ?? [],
        readiness: roster.initialReadiness,
        skillProgress: {},
        completedTasks: [],
        conditional: {},
        reviewState: {},
        diagnostic: null,
        dashboard: null,
        reonboardStatus: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: athleteTrainingState.athleteId,
        set: {
          mastery: roster.initialMastery ?? [],
          readiness: roster.initialReadiness,
          skillProgress: {},
          completedTasks: [],
          conditional: {},
          reviewState: {},
          diagnostic: null,
          dashboard: null,
          reonboardStatus: null,
          updatedAt: now,
        },
      })

    await db.delete(athleteGraphDeltas).where(eq(athleteGraphDeltas.athleteId, id))
    await db
      .delete(athleteGraphDraftDeltas)
      .where(eq(athleteGraphDraftDeltas.athleteId, id))
    await db.delete(athleteGraphsLegacy).where(eq(athleteGraphsLegacy.athleteId, id))

    const freshRow = await db
      .select()
      .from(athleteTrainingState)
      .where(eq(athleteTrainingState.athleteId, id))
    reply.send(rowToApi(freshRow[0]))
  })

  /**
   * Full demo reset: wipe all per-athlete training-state / graph overrides
   * back to seeded defaults for this coach. Mirrors `resetDemo` on the
   * frontend store.
   */
  app.post('/api/reset-demo', async (_req, reply) => {
    const coachId = await getCurrentCoachId()
    const rosterRows = await db
      .select()
      .from(athletes)
      .where(eq(athletes.coachId, coachId))
    const now = new Date()

    for (const roster of rosterRows) {
      await db
        .insert(athleteTrainingState)
        .values({
          athleteId: roster.id,
          mastery: roster.initialMastery ?? [],
          readiness: roster.initialReadiness,
          skillProgress: {},
          completedTasks: [],
          conditional: {},
          reviewState: {},
          diagnostic: null,
          dashboard: null,
          reonboardStatus: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: athleteTrainingState.athleteId,
          set: {
            mastery: roster.initialMastery ?? [],
            readiness: roster.initialReadiness,
            skillProgress: {},
            completedTasks: [],
            conditional: {},
            reviewState: {},
            diagnostic: null,
            dashboard: null,
            reonboardStatus: null,
            updatedAt: now,
          },
        })
    }

    const ids = rosterRows.map((r) => r.id)
    if (ids.length > 0) {
      await db.delete(athleteGraphDeltas).where(inArray(athleteGraphDeltas.athleteId, ids))
      await db
        .delete(athleteGraphDraftDeltas)
        .where(inArray(athleteGraphDraftDeltas.athleteId, ids))
      await db.delete(athleteGraphsLegacy).where(inArray(athleteGraphsLegacy.athleteId, ids))
    }

    reply.send({ ok: true, athleteCount: rosterRows.length, coachId })
  })
}
