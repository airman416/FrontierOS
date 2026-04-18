import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Single-tenant demo today, but every data row carries a `coachId` so auth
 * can be layered on later without a schema migration.
 */
export const coaches = pgTable('coaches', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
})

/**
 * Persistent athlete roster. Initial mastery / readiness mirror the seed data
 * in `src/data/athletes.ts` so the demo reset (`resetDemo`) can rebuild a
 * clean starting state per athlete.
 */
export const athletes = pgTable('athletes', {
  id: text('id').primaryKey(),
  coachId: uuid('coach_id')
    .notNull()
    .references(() => coaches.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  firstName: text('first_name').notNull(),
  age: integer('age').notNull(),
  position: text('position').notNull(),
  schoolYear: text('school_year').notNull(),
  sport: text('sport').notNull(),
  avatarUrl: text('avatar_url'),
  avatarColor: text('avatar_color').notNull(),
  tagline: text('tagline').notNull(),
  initialMastery: jsonb('initial_mastery').$type<string[]>().notNull().default([]),
  initialReadiness: integer('initial_readiness').notNull().default(100),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
})

/**
 * Team baseline plan per (coach, sport). Stored as one jsonb blob plus a
 * small amount of relational metadata.
 */
export const sportPlans = pgTable(
  'sport_plans',
  {
    coachId: uuid('coach_id')
      .notNull()
      .references(() => coaches.id, { onDelete: 'cascade' }),
    sport: text('sport').notNull(),
    graph: jsonb('graph').$type<unknown>().notNull(),
    version: text('version').notNull(),
    requirements: text('requirements').notNull().default(''),
    history: jsonb('history').$type<unknown>().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.coachId, t.sport] }),
  }),
)

/** Per-athlete delta against the team baseline (committed). */
export const athleteGraphDeltas = pgTable('athlete_graph_deltas', {
  athleteId: text('athlete_id')
    .primaryKey()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  delta: jsonb('delta').$type<unknown>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
})

/** Draft delta that the athlete fine-tune builder writes in-place. */
export const athleteGraphDraftDeltas = pgTable('athlete_graph_draft_deltas', {
  athleteId: text('athlete_id')
    .primaryKey()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  delta: jsonb('delta').$type<unknown>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
})

/**
 * Legacy full-graph storage - the resolver still falls back to this when
 * there's no sport plan or athlete delta. Kept so older saved graphs keep
 * loading cleanly.
 */
export const athleteGraphsLegacy = pgTable('athlete_graphs_legacy', {
  athleteId: text('athlete_id')
    .primaryKey()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  graph: jsonb('graph').$type<unknown>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
})

/**
 * One row per athlete holding all the training / dashboard state. We collapse
 * this into a single table because every mutation on the client (complete
 * task, diagnostic, readiness tweak) touches several of these fields together.
 */
export const athleteTrainingState = pgTable('athlete_training_state', {
  athleteId: text('athlete_id')
    .primaryKey()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  mastery: jsonb('mastery').$type<string[]>().notNull().default([]),
  readiness: integer('readiness').notNull().default(100),
  skillProgress: jsonb('skill_progress')
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  completedTasks: jsonb('completed_tasks').$type<string[]>().notNull().default([]),
  conditional: jsonb('conditional')
    .$type<Record<string, { confidence: number; successes: number }>>()
    .notNull()
    .default({}),
  reviewState: jsonb('review_state')
    .$type<Record<string, { stability: number; lastReviewedAt: number; dueAt: number }>>()
    .notNull()
    .default({}),
  diagnostic: jsonb('diagnostic').$type<{
    completedAt: number
    log: Array<{ skillId: string; verdict: string }>
  } | null>(),
  dashboard: jsonb('dashboard').$type<{
    taskIds: string[]
    updatedAt: number
  } | null>(),
  reonboardStatus: jsonb('reonboard_status').$type<{
    aiReonboarded: boolean
    at: number
    rationale: string
    confirmed?: boolean
  } | null>(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
})

export type Coach = typeof coaches.$inferSelect
export type AthleteRow = typeof athletes.$inferSelect
export type SportPlanRow = typeof sportPlans.$inferSelect
export type AthleteGraphDeltaRow = typeof athleteGraphDeltas.$inferSelect
export type AthleteGraphDraftDeltaRow = typeof athleteGraphDraftDeltas.$inferSelect
export type AthleteGraphLegacyRow = typeof athleteGraphsLegacy.$inferSelect
export type AthleteTrainingStateRow = typeof athleteTrainingState.$inferSelect
