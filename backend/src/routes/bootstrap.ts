import type { FastifyInstance } from 'fastify'
import { eq, inArray } from 'drizzle-orm'
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
import type { BootstrapResponse } from '../lib/apiTypes.js'

function toEpoch(d: Date): number {
  return d.getTime()
}

export async function registerBootstrapRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/bootstrap', async (): Promise<BootstrapResponse> => {
    const coachId = await getCurrentCoachId()

    const athleteRows = await db
      .select()
      .from(athletes)
      .where(eq(athletes.coachId, coachId))

    const athleteIds = athleteRows.map((a) => a.id)

    const [plans, deltas, drafts, legacy, training] = await Promise.all([
      db.select().from(sportPlans).where(eq(sportPlans.coachId, coachId)),
      athleteIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(athleteGraphDeltas)
            .where(inArray(athleteGraphDeltas.athleteId, athleteIds)),
      athleteIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(athleteGraphDraftDeltas)
            .where(inArray(athleteGraphDraftDeltas.athleteId, athleteIds)),
      athleteIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(athleteGraphsLegacy)
            .where(inArray(athleteGraphsLegacy.athleteId, athleteIds)),
      athleteIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(athleteTrainingState)
            .where(inArray(athleteTrainingState.athleteId, athleteIds)),
    ])

    return {
      coachId,
      athletes: athleteRows.map((a) => ({
        id: a.id,
        displayName: a.displayName,
        firstName: a.firstName,
        age: a.age,
        position: a.position,
        schoolYear: a.schoolYear,
        sport: a.sport,
        avatarUrl: a.avatarUrl ?? null,
        avatarColor: a.avatarColor,
        tagline: a.tagline,
        initialMastery: a.initialMastery ?? [],
        initialReadiness: a.initialReadiness,
      })),
      sportPlans: plans.map((p) => ({
        sport: p.sport,
        graph: p.graph,
        version: p.version,
        requirements: p.requirements,
        history: p.history,
        updatedAt: toEpoch(p.updatedAt),
      })),
      athleteDeltas: deltas.map((d) => ({
        athleteId: d.athleteId,
        delta: d.delta,
        updatedAt: toEpoch(d.updatedAt),
      })),
      athleteDraftDeltas: drafts.map((d) => ({
        athleteId: d.athleteId,
        delta: d.delta,
        updatedAt: toEpoch(d.updatedAt),
      })),
      athleteGraphsLegacy: legacy.map((g) => ({
        athleteId: g.athleteId,
        graph: g.graph,
        updatedAt: toEpoch(g.updatedAt),
      })),
      athleteTrainingState: training.map((t) => ({
        athleteId: t.athleteId,
        mastery: t.mastery ?? [],
        readiness: t.readiness,
        skillProgress: t.skillProgress ?? {},
        completedTasks: t.completedTasks ?? [],
        conditional: t.conditional ?? {},
        reviewState: t.reviewState ?? {},
        taskSnapshots: t.taskSnapshots ?? {},
        diagnostic: t.diagnostic ?? null,
        dashboard: t.dashboard ?? null,
        reonboardStatus: t.reonboardStatus ?? null,
        updatedAt: toEpoch(t.updatedAt),
      })),
    }
  })
}
