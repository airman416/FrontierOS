import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import {
  athleteGraphDeltas,
  athleteGraphDraftDeltas,
  athleteGraphsLegacy,
  athleteTrainingState,
  athletes,
  sportPlans,
} from '../db/schema.js'
import { getCurrentCoachId } from '../lib/coach.js'

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const sportPlanSchema = z.object({
  sport: z.string(),
  graph: z.unknown(),
  version: z.string(),
  requirements: z.string().default(''),
  history: z.array(chatMessageSchema).default([]),
  updatedAt: z.number().optional(),
})

const deltaSchema = z.object({
  athleteId: z.string(),
  delta: z.unknown(),
  updatedAt: z.number().optional(),
})

const legacyGraphSchema = z.object({
  athleteId: z.string(),
  graph: z.unknown(),
  updatedAt: z.number().optional(),
})

const reviewSkillStateSchema = z.object({
  stability: z.number(),
  lastReviewedAt: z.number(),
  dueAt: z.number(),
})

const conditionalStateSchema = z.object({
  confidence: z.number(),
  successes: z.number(),
})

const trainingStateSchema = z.object({
  athleteId: z.string(),
  mastery: z.array(z.string()).optional(),
  readiness: z.number().int().min(0).max(100).optional(),
  skillProgress: z.record(z.string(), z.number()).optional(),
  completedTasks: z.array(z.string()).optional(),
  conditional: z.record(z.string(), conditionalStateSchema).optional(),
  reviewState: z.record(z.string(), reviewSkillStateSchema).optional(),
  diagnostic: z
    .object({
      completedAt: z.number(),
      log: z.array(z.object({ skillId: z.string(), verdict: z.string() }).passthrough()),
    })
    .nullable()
    .optional(),
  dashboard: z
    .object({
      taskIds: z.array(z.string()),
      updatedAt: z.number(),
    })
    .nullable()
    .optional(),
  reonboardStatus: z
    .object({
      aiReonboarded: z.boolean(),
      at: z.number(),
      rationale: z.string(),
      confirmed: z.boolean().optional(),
    })
    .nullable()
    .optional(),
})

const importPayloadSchema = z.object({
  sportPlans: z.array(sportPlanSchema).default([]),
  athleteDeltas: z.array(deltaSchema).default([]),
  athleteDraftDeltas: z.array(deltaSchema).default([]),
  athleteGraphsLegacy: z.array(legacyGraphSchema).default([]),
  athleteTrainingState: z.array(trainingStateSchema).default([]),
})

/**
 * One-shot migration endpoint: takes the full contents of the old localStorage
 * keys, validates them, and upserts everything. Safe to call repeatedly
 * (uses upsert semantics), but the frontend should call it once and clear
 * localStorage afterwards.
 */
export async function registerImportLegacyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/import-legacy', async (req, reply) => {
    const coachId = await getCurrentCoachId()
    const parsed = importPayloadSchema.safeParse(req.body)
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() })
      return
    }

    const knownAthletes = await db
      .select({ id: athletes.id })
      .from(athletes)
    const knownAthleteIds = new Set(knownAthletes.map((a) => a.id))

    // Sport plans
    for (const p of parsed.data.sportPlans) {
      const updatedAt = p.updatedAt ? new Date(p.updatedAt) : new Date()
      await db
        .insert(sportPlans)
        .values({
          coachId,
          sport: p.sport,
          graph: p.graph,
          version: p.version,
          requirements: p.requirements,
          history: p.history,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: [sportPlans.coachId, sportPlans.sport],
          set: {
            graph: p.graph,
            version: p.version,
            requirements: p.requirements,
            history: p.history,
            updatedAt,
          },
        })
    }

    // Deltas (committed)
    for (const d of parsed.data.athleteDeltas) {
      if (!knownAthleteIds.has(d.athleteId)) continue
      const updatedAt = d.updatedAt ? new Date(d.updatedAt) : new Date()
      await db
        .insert(athleteGraphDeltas)
        .values({ athleteId: d.athleteId, delta: d.delta, updatedAt })
        .onConflictDoUpdate({
          target: athleteGraphDeltas.athleteId,
          set: { delta: d.delta, updatedAt },
        })
    }

    // Draft deltas
    for (const d of parsed.data.athleteDraftDeltas) {
      if (!knownAthleteIds.has(d.athleteId)) continue
      const updatedAt = d.updatedAt ? new Date(d.updatedAt) : new Date()
      await db
        .insert(athleteGraphDraftDeltas)
        .values({ athleteId: d.athleteId, delta: d.delta, updatedAt })
        .onConflictDoUpdate({
          target: athleteGraphDraftDeltas.athleteId,
          set: { delta: d.delta, updatedAt },
        })
    }

    // Legacy graphs
    for (const g of parsed.data.athleteGraphsLegacy) {
      if (!knownAthleteIds.has(g.athleteId)) continue
      const updatedAt = g.updatedAt ? new Date(g.updatedAt) : new Date()
      await db
        .insert(athleteGraphsLegacy)
        .values({ athleteId: g.athleteId, graph: g.graph, updatedAt })
        .onConflictDoUpdate({
          target: athleteGraphsLegacy.athleteId,
          set: { graph: g.graph, updatedAt },
        })
    }

    // Training state
    for (const t of parsed.data.athleteTrainingState) {
      if (!knownAthleteIds.has(t.athleteId)) continue
      const updatedAt = new Date()
      await db
        .insert(athleteTrainingState)
        .values({
          athleteId: t.athleteId,
          mastery: t.mastery ?? [],
          readiness: t.readiness ?? 100,
          skillProgress: t.skillProgress ?? {},
          completedTasks: t.completedTasks ?? [],
          conditional: t.conditional ?? {},
          reviewState: t.reviewState ?? {},
          diagnostic: t.diagnostic ?? null,
          dashboard: t.dashboard ?? null,
          reonboardStatus: t.reonboardStatus ?? null,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: athleteTrainingState.athleteId,
          set: {
            mastery: t.mastery ?? [],
            readiness: t.readiness ?? 100,
            skillProgress: t.skillProgress ?? {},
            completedTasks: t.completedTasks ?? [],
            conditional: t.conditional ?? {},
            reviewState: t.reviewState ?? {},
            diagnostic: t.diagnostic ?? null,
            dashboard: t.dashboard ?? null,
            reonboardStatus: t.reonboardStatus ?? null,
            updatedAt,
          },
        })
    }

    reply.send({
      ok: true,
      imported: {
        sportPlans: parsed.data.sportPlans.length,
        athleteDeltas: parsed.data.athleteDeltas.length,
        athleteDraftDeltas: parsed.data.athleteDraftDeltas.length,
        athleteGraphsLegacy: parsed.data.athleteGraphsLegacy.length,
        athleteTrainingState: parsed.data.athleteTrainingState.length,
      },
    })
  })
}
