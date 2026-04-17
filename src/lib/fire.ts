import type { SkillDef } from '../data/graph'
import type { TodayTask } from '../data/student'

export interface ReviewSkillState {
  dueAt: number
  stability: number
  lastReviewedAt: number
}

export interface ConditionalState {
  confidence: number
  successes: number
}

export const DAY_MS = 24 * 60 * 60 * 1000
export const BASE_INTERVAL_MS = DAY_MS
export const STABILITY_GROWTH = 1.3
export const STABILITY_DECAY = 0.5
export const CONDITIONAL_PROMOTE_SUCCESSES = 3
export const CONDITIONAL_PROMOTE_CONFIDENCE = 0.9
export const W_DOWNSTREAM = 0.5
export const DEFAULT_DASHBOARD_CAP = 6
export const MIN_DASHBOARD_CAP = 5
export const MAX_DASHBOARD_CAP = 7

export function buildPrereqClosure(skills: SkillDef[]): Record<string, Set<string>> {
  const byId = new Map(skills.map((s) => [s.id, s]))
  const cache: Record<string, Set<string>> = {}
  function walk(id: string, seen: Set<string>): Set<string> {
    if (cache[id]) return cache[id]
    if (seen.has(id)) return new Set()
    seen.add(id)
    const s = byId.get(id)
    const out = new Set<string>()
    if (!s) return out
    for (const p of s.prereqs) {
      if (!byId.has(p)) continue
      out.add(p)
      for (const inner of walk(p, seen)) out.add(inner)
    }
    cache[id] = out
    return out
  }
  for (const s of skills) walk(s.id, new Set())
  return cache
}

export function buildPostreqClosure(skills: SkillDef[]): Record<string, Set<string>> {
  const prereq = buildPrereqClosure(skills)
  const post: Record<string, Set<string>> = {}
  for (const s of skills) post[s.id] = new Set()
  for (const s of skills) {
    for (const p of prereq[s.id] ?? []) {
      if (!post[p]) post[p] = new Set()
      post[p].add(s.id)
    }
  }
  return post
}

export function isFrontier(
  skillId: string,
  skillById: Record<string, SkillDef>,
  mastered: Set<string>,
): boolean {
  const s = skillById[skillId]
  if (!s) return false
  if (mastered.has(skillId)) return false
  return s.prereqs.every((p) => mastered.has(p))
}

export function dueSkills(
  mastered: Set<string>,
  reviewState: Record<string, ReviewSkillState>,
  now: number,
): Set<string> {
  const out = new Set<string>()
  for (const id of mastered) {
    const r = reviewState[id]
    if (r && r.dueAt <= now) out.add(id)
  }
  return out
}

export function reviewsKnockedOut(
  primarySkillId: string,
  prereqClosure: Record<string, Set<string>>,
  due: Set<string>,
): number {
  let n = 0
  if (due.has(primarySkillId)) n += 1
  for (const p of prereqClosure[primarySkillId] ?? []) {
    if (due.has(p)) n += 1
  }
  return n
}

export function downstreamUnlocks(
  skillId: string,
  postreqClosure: Record<string, Set<string>>,
): number {
  return postreqClosure[skillId]?.size ?? 0
}

export function importance(opts: {
  task: TodayTask
  prereqClosure: Record<string, Set<string>>
  postreqClosure: Record<string, Set<string>>
  due: Set<string>
}): number {
  const skillId = opts.task.skillId
  if (!skillId) return 0
  const knocked = reviewsKnockedOut(skillId, opts.prereqClosure, opts.due)
  const unlocks = downstreamUnlocks(skillId, opts.postreqClosure)
  return knocked + W_DOWNSTREAM * unlocks
}

/** Deterministic hash so tie-breaks don't jump around between renders. */
function stringHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return h
}

export interface CandidateContext {
  athleteId: string
  skills: SkillDef[]
  tasks: TodayTask[]
  skillById: Record<string, SkillDef>
  prereqClosure: Record<string, Set<string>>
  postreqClosure: Record<string, Set<string>>
  mastered: Set<string>
  completedTaskIds: Set<string>
  skillProgress: Record<string, number>
  reviewState: Record<string, ReviewSkillState>
  now: number
}

export interface RankedCandidate {
  task: TodayTask
  importance: number
  kind: 'frontier' | 'review'
  coverage: number
  /** priority quartile: 0 (low), 1, 2, 3 (high). Computed externally after ranking. */
  priority?: number
}

/**
 * Returns a prioritized list of candidate tasks for the dashboard. The result
 * is ranked by importance but not yet sliced — callers decide how many slots
 * to fill.
 */
export function rankCandidateTasks(ctx: CandidateContext): RankedCandidate[] {
  const due = dueSkills(ctx.mastered, ctx.reviewState, ctx.now)
  const frontierSkillIds = new Set(
    ctx.skills
      .map((s) => s.id)
      .filter((id) => isFrontier(id, ctx.skillById, ctx.mastered)),
  )

  // For each frontier skill, pick the *next* uncompleted task in that skill's pool.
  // For due review skills, pick a task whose prereq closure covers the most due.
  const candidatesByTaskId = new Map<string, RankedCandidate>()

  for (const t of ctx.tasks) {
    if (!t.skillId) continue
    if (ctx.completedTaskIds.has(t.id)) continue
    const s = ctx.skillById[t.skillId]
    if (!s) continue

    const isFrontierTask = frontierSkillIds.has(t.skillId)
    const isReviewTask = ctx.mastered.has(t.skillId) && due.has(t.skillId)
    const coversDue = reviewsKnockedOut(t.skillId, ctx.prereqClosure, due)
    const hasCoverage = coversDue > 0

    if (!isFrontierTask && !isReviewTask && !hasCoverage) continue

    const imp = importance({
      task: t,
      prereqClosure: ctx.prereqClosure,
      postreqClosure: ctx.postreqClosure,
      due,
    })
    candidatesByTaskId.set(t.id, {
      task: t,
      importance: imp,
      kind: isFrontierTask ? 'frontier' : 'review',
      coverage: coversDue,
    })
  }

  const ranked = [...candidatesByTaskId.values()].sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance
    const h = stringHash(ctx.athleteId + a.task.id) - stringHash(ctx.athleteId + b.task.id)
    return h
  })

  // Annotate priority quartile
  if (ranked.length > 0) {
    const top = ranked[0].importance
    for (const r of ranked) {
      if (top <= 0) {
        r.priority = 0
      } else {
        const frac = r.importance / top
        r.priority = frac >= 0.75 ? 3 : frac >= 0.5 ? 2 : frac >= 0.25 ? 1 : 0
      }
    }
  }

  return ranked
}

/**
 * Sticky dashboard refill: keep any task already on the dashboard (as long as
 * it's not completed), fill empty slots with top-ranked candidates, and always
 * keep ≥1 frontier task if any frontier exists.
 */
export function computeDashboardFill(
  ctx: CandidateContext,
  existingTaskIds: string[],
  cap: number = DEFAULT_DASHBOARD_CAP,
): string[] {
  const boundedCap = Math.max(MIN_DASHBOARD_CAP, Math.min(MAX_DASHBOARD_CAP, cap))
  const tasksById = new Map(ctx.tasks.map((t) => [t.id, t]))
  const current: string[] = []
  const seen = new Set<string>()
  for (const id of existingTaskIds) {
    if (seen.has(id)) continue
    if (ctx.completedTaskIds.has(id)) continue
    if (!tasksById.has(id)) continue
    current.push(id)
    seen.add(id)
  }

  if (current.length >= boundedCap) return current.slice(0, boundedCap)

  const ranked = rankCandidateTasks(ctx).filter((r) => !seen.has(r.task.id))
  const hasFrontierAvailable = ranked.some((r) => r.kind === 'frontier')
  const hasFrontierOnDashboard = current.some((id) => {
    const t = tasksById.get(id)
    if (!t?.skillId) return false
    return isFrontier(t.skillId, ctx.skillById, ctx.mastered)
  })

  const picks = [...current]
  // Ensure ≥1 frontier is present (from candidate pool) if one is available.
  if (!hasFrontierOnDashboard && hasFrontierAvailable && picks.length < boundedCap) {
    const nextFrontier = ranked.find((r) => r.kind === 'frontier')
    if (nextFrontier) {
      picks.push(nextFrontier.task.id)
      seen.add(nextFrontier.task.id)
    }
  }

  for (const r of ranked) {
    if (picks.length >= boundedCap) break
    if (seen.has(r.task.id)) continue
    picks.push(r.task.id)
    seen.add(r.task.id)
  }
  return picks
}

export interface CompleteTaskParams {
  task: TodayTask
  skillById: Record<string, SkillDef>
  prereqClosure: Record<string, Set<string>>
  mastered: Set<string>
  skillProgress: Record<string, number>
  conditional: Record<string, ConditionalState>
  reviewState: Record<string, ReviewSkillState>
  now: number
}

export interface CompleteTaskResult {
  mastered: Set<string>
  skillProgress: Record<string, number>
  conditional: Record<string, ConditionalState>
  reviewState: Record<string, ReviewSkillState>
  /** Whether the primary skill was newly promoted to mastered on this completion. */
  newlyMastered: string | null
  /** Skills whose reviews were refreshed (primary + transitive prereqs). */
  reviewsRefreshed: string[]
  /** Conditional skills that got promoted to full known on this completion. */
  conditionalsPromoted: string[]
}

export function completeTask(p: CompleteTaskParams): CompleteTaskResult {
  const skillId = p.task.skillId
  const xp = p.task.xp ?? 0

  let mastered = new Set(p.mastered)
  const skillProgress = { ...p.skillProgress }
  const conditional: Record<string, ConditionalState> = { ...p.conditional }
  const reviewState: Record<string, ReviewSkillState> = { ...p.reviewState }
  let newlyMastered: string | null = null
  const reviewsRefreshed: string[] = []
  const conditionalsPromoted: string[] = []

  if (!skillId) {
    return {
      mastered,
      skillProgress,
      conditional,
      reviewState,
      newlyMastered,
      reviewsRefreshed,
      conditionalsPromoted,
    }
  }

  const skill = p.skillById[skillId]

  // 1) Primary XP
  if (skill && !mastered.has(skillId)) {
    const prev = skillProgress[skillId] ?? 0
    const next = Math.max(prev, Math.min(100, prev + xp))
    skillProgress[skillId] = next
    if (next >= 100) {
      mastered = new Set(mastered)
      mastered.add(skillId)
      newlyMastered = skillId
      reviewState[skillId] = {
        stability: 1.0,
        lastReviewedAt: p.now,
        dueAt: p.now + 1.0 * BASE_INTERVAL_MS,
      }
      skillProgress[skillId] = 100
    }
  }

  // 2) Trickle-down: primary skill + every mastered transitive prereq gets a
  // review-refresh.
  const closure = new Set<string>()
  closure.add(skillId)
  for (const p2 of p.prereqClosure[skillId] ?? []) closure.add(p2)

  for (const cid of closure) {
    if (!mastered.has(cid)) continue
    const r = reviewState[cid]
    if (!r) continue
    const nextStability = Math.min(64, r.stability * STABILITY_GROWTH)
    reviewState[cid] = {
      stability: nextStability,
      lastReviewedAt: p.now,
      dueAt: p.now + nextStability * BASE_INTERVAL_MS,
    }
    reviewsRefreshed.push(cid)
  }

  // 3) Conditional confidence bump
  for (const cid of closure) {
    const c = conditional[cid]
    if (!c) continue
    const successes = c.successes + 1
    const confidence = Math.min(1, c.confidence + 0.15)
    if (
      successes >= CONDITIONAL_PROMOTE_SUCCESSES ||
      confidence >= CONDITIONAL_PROMOTE_CONFIDENCE
    ) {
      delete conditional[cid]
      conditionalsPromoted.push(cid)
    } else {
      conditional[cid] = { successes, confidence }
    }
  }

  return {
    mastered,
    skillProgress,
    conditional,
    reviewState,
    newlyMastered,
    reviewsRefreshed,
    conditionalsPromoted,
  }
}

export interface FailTaskParams {
  task: TodayTask
  prereqClosure: Record<string, Set<string>>
  mastered: Set<string>
  conditional: Record<string, ConditionalState>
  reviewState: Record<string, ReviewSkillState>
  now: number
}

export interface FailTaskResult {
  conditional: Record<string, ConditionalState>
  reviewState: Record<string, ReviewSkillState>
  remedialFlagged: string[]
}

export function failTask(p: FailTaskParams): FailTaskResult {
  const skillId = p.task.skillId
  const conditional: Record<string, ConditionalState> = { ...p.conditional }
  const reviewState: Record<string, ReviewSkillState> = { ...p.reviewState }
  const remedialFlagged: string[] = []

  if (!skillId) return { conditional, reviewState, remedialFlagged }

  const r = reviewState[skillId]
  if (r) {
    const nextStability = Math.max(0.25, r.stability * STABILITY_DECAY)
    reviewState[skillId] = {
      stability: nextStability,
      lastReviewedAt: p.now,
      dueAt: p.now + nextStability * BASE_INTERVAL_MS,
    }
  }

  const closure = new Set<string>()
  closure.add(skillId)
  for (const p2 of p.prereqClosure[skillId] ?? []) closure.add(p2)

  for (const cid of closure) {
    const c = conditional[cid]
    if (!c) continue
    conditional[cid] = { successes: 0, confidence: Math.max(0.2, c.confidence - 0.25) }
    remedialFlagged.push(cid)
  }

  return { conditional, reviewState, remedialFlagged }
}

export function formatDueRelative(dueAt: number, now: number = Date.now()): string {
  const diff = dueAt - now
  if (diff <= 0) {
    const ago = -diff
    const d = Math.max(1, Math.round(ago / DAY_MS))
    return `overdue ${d}d`
  }
  const d = Math.round(diff / DAY_MS)
  if (d <= 0) return 'due today'
  if (d === 1) return 'due tomorrow'
  return `due in ${d}d`
}
