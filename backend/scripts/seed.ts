import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import { coaches, athletes } from '../src/db/schema.js'
import {
  ATHLETES,
  INITIAL_ATHLETE_MASTERY,
  INITIAL_ATHLETE_READINESS,
} from '../../src/data/athletes.ts'

const url = process.env.DATABASE_URL_MIGRATION ?? process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL(_MIGRATION) is required')
  process.exit(1)
}
const DEFAULT_COACH_ID =
  process.env.DEFAULT_COACH_ID ?? '00000000-0000-0000-0000-000000000001'

const client = postgres(url, { max: 1, prepare: false })
const db = drizzle(client)

async function main() {
  console.log('Seeding coach...')
  await db
    .insert(coaches)
    .values({ id: DEFAULT_COACH_ID, displayName: 'Demo Coach' })
    .onConflictDoNothing()

  const existing = await db
    .select({ id: coaches.id })
    .from(coaches)
    .where(eq(coaches.id, DEFAULT_COACH_ID))
  if (existing.length === 0) {
    throw new Error(
      'Default coach row not found after insert — check DEFAULT_COACH_ID format',
    )
  }

  console.log(`Seeding ${ATHLETES.length} athletes...`)
  for (const a of ATHLETES) {
    await db
      .insert(athletes)
      .values({
        id: a.id,
        coachId: DEFAULT_COACH_ID,
        displayName: a.displayName,
        firstName: a.firstName,
        age: a.age,
        position: a.position,
        schoolYear: a.schoolYear,
        sport: a.sport,
        avatarUrl: a.avatarUrl ?? null,
        avatarColor: a.avatarColor,
        tagline: a.tagline,
        initialMastery: INITIAL_ATHLETE_MASTERY[a.id] ?? [],
        initialReadiness: INITIAL_ATHLETE_READINESS[a.id] ?? 100,
      })
      .onConflictDoUpdate({
        target: athletes.id,
        set: {
          coachId: DEFAULT_COACH_ID,
          displayName: a.displayName,
          firstName: a.firstName,
          age: a.age,
          position: a.position,
          schoolYear: a.schoolYear,
          sport: a.sport,
          avatarUrl: a.avatarUrl ?? null,
          avatarColor: a.avatarColor,
          tagline: a.tagline,
          initialMastery: INITIAL_ATHLETE_MASTERY[a.id] ?? [],
          initialReadiness: INITIAL_ATHLETE_READINESS[a.id] ?? 100,
        },
      })
  }

  console.log('Done.')
}

try {
  await main()
} finally {
  await client.end()
}
