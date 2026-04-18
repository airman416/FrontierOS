import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { coaches } from '../db/schema.js'
import { env } from '../env.js'

/**
 * Return the current coach id. Single-tenant for now - always the
 * `DEFAULT_COACH_ID` seeded row. When auth is added this reads from the
 * authenticated request instead.
 */
export async function getCurrentCoachId(): Promise<string> {
  const id = env.DEFAULT_COACH_ID
  const existing = await db.select({ id: coaches.id }).from(coaches).where(eq(coaches.id, id))
  if (existing.length === 0) {
    await db
      .insert(coaches)
      .values({ id, displayName: 'Demo Coach' })
      .onConflictDoNothing()
  }
  return id
}
