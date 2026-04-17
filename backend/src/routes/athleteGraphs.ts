import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client.js'
import {
  athleteGraphDeltas,
  athleteGraphDraftDeltas,
  athleteGraphsLegacy,
} from '../db/schema.js'

const deltaSchema = z.object({ delta: z.unknown() })
const graphSchema = z.object({ graph: z.unknown() })

export async function registerAthleteGraphRoutes(app: FastifyInstance): Promise<void> {
  // ── Committed delta ─────────────────────────────────────────────────────
  app.put('/api/athletes/:id/delta', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = deltaSchema.safeParse(req.body)
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() })
      return
    }
    const now = new Date()
    await db
      .insert(athleteGraphDeltas)
      .values({ athleteId: id, delta: parsed.data.delta, updatedAt: now })
      .onConflictDoUpdate({
        target: athleteGraphDeltas.athleteId,
        set: { delta: parsed.data.delta, updatedAt: now },
      })
    // Saving a delta supersedes any legacy full-graph blob for this athlete.
    await db.delete(athleteGraphsLegacy).where(eq(athleteGraphsLegacy.athleteId, id))
    reply.send({ ok: true })
  })

  app.delete('/api/athletes/:id/delta', async (req, reply) => {
    const { id } = req.params as { id: string }
    await db.delete(athleteGraphDeltas).where(eq(athleteGraphDeltas.athleteId, id))
    await db
      .delete(athleteGraphDraftDeltas)
      .where(eq(athleteGraphDraftDeltas.athleteId, id))
    await db.delete(athleteGraphsLegacy).where(eq(athleteGraphsLegacy.athleteId, id))
    reply.send({ ok: true })
  })

  // ── Draft delta ─────────────────────────────────────────────────────────
  app.put('/api/athletes/:id/draft-delta', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = deltaSchema.safeParse(req.body)
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() })
      return
    }
    const now = new Date()
    await db
      .insert(athleteGraphDraftDeltas)
      .values({ athleteId: id, delta: parsed.data.delta, updatedAt: now })
      .onConflictDoUpdate({
        target: athleteGraphDraftDeltas.athleteId,
        set: { delta: parsed.data.delta, updatedAt: now },
      })
    reply.send({ ok: true })
  })

  app.delete('/api/athletes/:id/draft-delta', async (req, reply) => {
    const { id } = req.params as { id: string }
    await db
      .delete(athleteGraphDraftDeltas)
      .where(eq(athleteGraphDraftDeltas.athleteId, id))
    reply.send({ ok: true })
  })

  app.post('/api/athletes/:id/accept-draft', async (req, reply) => {
    const { id } = req.params as { id: string }
    const draft = await db
      .select()
      .from(athleteGraphDraftDeltas)
      .where(eq(athleteGraphDraftDeltas.athleteId, id))
    const row = draft[0]
    if (!row) {
      reply.code(404).send({ error: 'No draft delta to accept' })
      return
    }
    const now = new Date()
    await db
      .insert(athleteGraphDeltas)
      .values({ athleteId: id, delta: row.delta, updatedAt: now })
      .onConflictDoUpdate({
        target: athleteGraphDeltas.athleteId,
        set: { delta: row.delta, updatedAt: now },
      })
    await db
      .delete(athleteGraphDraftDeltas)
      .where(eq(athleteGraphDraftDeltas.athleteId, id))
    await db.delete(athleteGraphsLegacy).where(eq(athleteGraphsLegacy.athleteId, id))
    reply.send({ ok: true, delta: row.delta, updatedAt: now.getTime() })
  })

  // ── Legacy full graph (fallback for resolver) ───────────────────────────
  app.put('/api/athletes/:id/legacy-graph', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = graphSchema.safeParse(req.body)
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() })
      return
    }
    const now = new Date()
    await db
      .insert(athleteGraphsLegacy)
      .values({ athleteId: id, graph: parsed.data.graph, updatedAt: now })
      .onConflictDoUpdate({
        target: athleteGraphsLegacy.athleteId,
        set: { graph: parsed.data.graph, updatedAt: now },
      })
    reply.send({ ok: true })
  })
}
