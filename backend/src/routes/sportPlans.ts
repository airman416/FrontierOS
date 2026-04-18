import type { FastifyInstance } from 'fastify'
import { and, eq, inArray } from 'drizzle-orm'
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
import { seedFromPriorDiagnostic } from '../lib/reonboard.js'
import type { ApiAthleteTrainingState } from '../lib/apiTypes.js'

const BASE_INTERVAL_MS = 24 * 60 * 60 * 1000

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const savePlanSchema = z.object({
  graph: z.unknown(),
  version: z.string(),
  requirements: z.string().default(''),
  history: z.array(chatMessageSchema).default([]),
})

export async function registerSportPlanRoutes(app: FastifyInstance): Promise<void> {
  app.put('/api/sport-plans/:sport', async (req, reply) => {
    const coachId = await getCurrentCoachId()
    const { sport } = req.params as { sport: string }
    const parsed = savePlanSchema.safeParse(req.body)
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() })
      return
    }

    const now = new Date()
    const prior = await db
      .select()
      .from(sportPlans)
      .where(and(eq(sportPlans.coachId, coachId), eq(sportPlans.sport, sport)))
    const priorPlan = prior[0] ?? null

    await db
      .insert(sportPlans)
      .values({
        coachId,
        sport,
        graph: parsed.data.graph,
        version: parsed.data.version,
        requirements: parsed.data.requirements,
        history: parsed.data.history,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [sportPlans.coachId, sportPlans.sport],
        set: {
          graph: parsed.data.graph,
          version: parsed.data.version,
          requirements: parsed.data.requirements,
          history: parsed.data.history,
          updatedAt: now,
        },
      })

    const updatedTrainingRows: ApiAthleteTrainingState[] = []

    // Re-onboard fan-out: only when a prior plan existed (regeneration).
    if (priorPlan) {
      const priorGraph = priorPlan.graph as { skills?: Array<{ id: string; label: string; level: number }> } | null
      const priorSkills = Array.isArray(priorGraph?.skills) ? priorGraph.skills : []
      const newGraph = parsed.data.graph as { skills?: Array<{ id: string; label: string; level: number }> } | null
      const newSkills = Array.isArray(newGraph?.skills) ? newGraph.skills : []

      if (priorSkills.length > 0 && newSkills.length > 0) {
        const sportAthletes = await db
          .select({ id: athletes.id })
          .from(athletes)
          .where(and(eq(athletes.coachId, coachId), eq(athletes.sport, sport)))

        if (sportAthletes.length > 0) {
          const athleteIds = sportAthletes.map((a) => a.id)
          const states = await db
            .select()
            .from(athleteTrainingState)
            .where(inArray(athleteTrainingState.athleteId, athleteIds))

          for (const state of states) {
            if (!state.diagnostic) continue
            const log = state.diagnostic.log ?? []
            const seed = seedFromPriorDiagnostic({
              priorSkills,
              priorLog: log,
              newSkills,
            })

            const nowMs = now.getTime()
            const mastery = Array.from(new Set(seed.mastered))
            const conditional: Record<string, { confidence: number; successes: number }> = {}
            const reviewState: Record<
              string,
              { stability: number; lastReviewedAt: number; dueAt: number }
            > = {}
            for (const id of mastery) {
              reviewState[id] = {
                stability: 1.0,
                lastReviewedAt: nowMs,
                dueAt: nowMs + 1.0 * BASE_INTERVAL_MS,
              }
            }
            for (const [id, v] of Object.entries(seed.conditional)) {
              conditional[id] = { confidence: v.confidence, successes: 0 }
              // Match the frontend: conditional skills are due immediately
              // so the dashboard never starts empty after a re-onboard.
              reviewState[id] = {
                stability: 0.5,
                lastReviewedAt: nowMs,
                dueAt: nowMs,
              }
            }

            const reonboardStatus = {
              aiReonboarded: true,
              at: nowMs,
              rationale: seed.rationale,
              confirmed: false,
            }

            const updated = await db
              .update(athleteTrainingState)
              .set({
                mastery,
                conditional,
                reviewState,
                skillProgress: {},
                completedTasks: [],
                taskSnapshots: {},
                reonboardStatus,
                dashboard: null,
                updatedAt: now,
              })
              .where(eq(athleteTrainingState.athleteId, state.athleteId))
              .returning()

            if (updated[0]) {
              const u = updated[0]
              updatedTrainingRows.push({
                athleteId: u.athleteId,
                mastery: u.mastery ?? [],
                readiness: u.readiness,
                skillProgress: u.skillProgress ?? {},
                completedTasks: u.completedTasks ?? [],
                conditional: u.conditional ?? {},
                reviewState: u.reviewState ?? {},
                taskSnapshots: u.taskSnapshots ?? {},
                diagnostic: u.diagnostic ?? null,
                dashboard: u.dashboard ?? null,
                reonboardStatus: u.reonboardStatus ?? null,
                updatedAt: u.updatedAt.getTime(),
              })
            }
          }
        }
      }
    }

    reply.send({
      sportPlan: {
        sport,
        graph: parsed.data.graph,
        version: parsed.data.version,
        requirements: parsed.data.requirements,
        history: parsed.data.history,
        updatedAt: now.getTime(),
      },
      reonboardedAthletes: updatedTrainingRows,
    })
  })

  app.delete('/api/sport-plans/:sport', async (req, reply) => {
    const coachId = await getCurrentCoachId()
    const { sport } = req.params as { sport: string }

    // Collect affected athletes on this sport before cleanup.
    const sportAthletes = await db
      .select({ id: athletes.id })
      .from(athletes)
      .where(and(eq(athletes.coachId, coachId), eq(athletes.sport, sport)))
    const athleteIds = sportAthletes.map((a) => a.id)

    await db
      .delete(sportPlans)
      .where(and(eq(sportPlans.coachId, coachId), eq(sportPlans.sport, sport)))

    if (athleteIds.length > 0) {
      await db
        .delete(athleteGraphDeltas)
        .where(inArray(athleteGraphDeltas.athleteId, athleteIds))
      await db
        .delete(athleteGraphDraftDeltas)
        .where(inArray(athleteGraphDraftDeltas.athleteId, athleteIds))
      await db
        .delete(athleteGraphsLegacy)
        .where(inArray(athleteGraphsLegacy.athleteId, athleteIds))
    }

    reply.send({ ok: true, clearedAthleteIds: athleteIds })
  })
}
