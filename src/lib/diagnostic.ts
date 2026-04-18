import type { SkillDef } from '../data/graph'

export type DiagnosticVerdict = 'pass' | 'fail' | 'conditional'
export type DiagnosticStatus = 'unknown' | 'known' | 'not-known' | 'conditional'

export interface DiagnosticEntry {
  skillId: string
  verdict: DiagnosticVerdict
  note?: string
  at: number
  /**
   * How this verdict arrived at its state:
   * - 'probed': coach explicitly graded this skill
   * - 'propagated-up': pass on postreq implied prereq known
   * - 'propagated-down': fail on prereq implied postreq not-known
   * - 'inferred-up': never probed; all direct prereqs known → inferred known
   * - 'inferred-down': never probed; a direct prereq not-known → inferred not-known
   * - 'inferred-mixed': never probed; prereq coverage is mixed → conditional
   * - 'escalation': coach graded an AI-generated harder probe for this skill
   * - 'escalation-propagated-up': pass on an escalation implied prereq known
   * - 'escalation-propagated-down': fail on an escalation implied postreq not-known
   */
  source:
    | 'probed'
    | 'propagated-up'
    | 'propagated-down'
    | 'inferred-up'
    | 'inferred-down'
    | 'inferred-mixed'
    | 'escalation'
    | 'escalation-propagated-up'
    | 'escalation-propagated-down'
}

/**
 * One AI-generated harder probe that the coach has graded. Kept in a
 * parallel log on `DiagnosticState` so the summary panel and downstream
 * persistence can replay the escalation chain branch-by-branch.
 */
export interface EscalationEntry {
  skillId: string
  prompt: string
  rationale?: string
  verdict: DiagnosticVerdict
  note?: string
  at: number
}

export interface DiagnosticState {
  /** Ordered log of every committed result, including propagated ones. */
  log: DiagnosticEntry[]
  /** skillId → current derived status. */
  status: Record<string, DiagnosticStatus>
  /** Ordered log of AI-generated harder probes the coach graded. */
  escalations: EscalationEntry[]
}

export function createInitialDiagnosticState(skills: SkillDef[]): DiagnosticState {
  const status: Record<string, DiagnosticStatus> = {}
  for (const s of skills) status[s.id] = 'unknown'
  return { log: [], status, escalations: [] }
}

function buildPrereqClosure(skills: SkillDef[]): Record<string, Set<string>> {
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

function buildPostreqClosure(skills: SkillDef[]): Record<string, Set<string>> {
  const prereqClosure = buildPrereqClosure(skills)
  const post: Record<string, Set<string>> = {}
  for (const s of skills) post[s.id] = new Set()
  for (const s of skills) {
    for (const p of prereqClosure[s.id] ?? []) {
      if (!post[p]) post[p] = new Set()
      post[p].add(s.id)
    }
  }
  return post
}

export interface DiagnosticEngine {
  skills: SkillDef[]
  skillById: Record<string, SkillDef>
  prereqClosure: Record<string, Set<string>>
  postreqClosure: Record<string, Set<string>>
}

export function buildDiagnosticEngine(skills: SkillDef[]): DiagnosticEngine {
  const skillById: Record<string, SkillDef> = {}
  for (const s of skills) skillById[s.id] = s
  return {
    skills,
    skillById,
    prereqClosure: buildPrereqClosure(skills),
    postreqClosure: buildPostreqClosure(skills),
  }
}

/**
 * A skill is probeable on-the-spot iff it's level ≤ 4 AND carries a
 * non-empty diagnosticPrompt. Levels 5–6 are integration skills that cannot
 * be graded in a single ≤60s drill during onboarding - they get inferred
 * from prereq coverage at commit time.
 */
export function isProbeable(skill: SkillDef): boolean {
  if (skill.level > 4) return false
  const p = skill.diagnosticPrompt?.trim()
  return !!p && p.length > 0
}

function countUnknown(ids: Set<string> | undefined, state: DiagnosticState): number {
  if (!ids) return 0
  let n = 0
  for (const id of ids) if (state.status[id] === 'unknown') n += 1
  return n
}

/**
 * Pick the next skill to probe. Strategy: among probeable (level ≤ 4 with a
 * diagnostic prompt) unknown skills, pick the one whose still-unknown prereqs
 * and still-unknown postreqs are most balanced - a real binary search that
 * maximizes information per probe. Ties break toward mid-tier (level 2–3).
 */
export function selectNextProbe(
  engine: DiagnosticEngine,
  state: DiagnosticState,
): SkillDef | null {
  let best: SkillDef | null = null
  let bestScore = -Infinity
  for (const s of engine.skills) {
    if (state.status[s.id] !== 'unknown') continue
    if (!isProbeable(s)) continue
    const a = countUnknown(engine.prereqClosure[s.id], state)
    const b = countUnknown(engine.postreqClosure[s.id], state)
    const balance = Math.min(a, b)
    const tieBreak = s.level === 2 || s.level === 3 ? 1 : 0
    const score = balance * 10 + tieBreak
    if (score > bestScore) {
      bestScore = score
      best = s
    }
  }
  return best
}

export function remainingUnknownCount(state: DiagnosticState): number {
  let n = 0
  for (const st of Object.values(state.status)) if (st === 'unknown') n += 1
  return n
}

/**
 * Count of skills that still need a coach-graded probe - i.e. unknown AND
 * probeable on-the-spot. This is the true "are we done?" signal; anything
 * remaining `unknown` after this hits zero falls to the inference pass.
 */
export function remainingProbeableCount(
  engine: DiagnosticEngine,
  state: DiagnosticState,
): number {
  let n = 0
  for (const s of engine.skills) {
    if (state.status[s.id] !== 'unknown') continue
    if (!isProbeable(s)) continue
    n += 1
  }
  return n
}

/**
 * Count of skills the engine will probe across a full diagnostic (modulo
 * propagation) - i.e. all level-≤4 skills with prompts. Used by the UI to
 * show a realistic "~N probes expected" number.
 */
export function totalProbeableCount(engine: DiagnosticEngine): number {
  let n = 0
  for (const s of engine.skills) if (isProbeable(s)) n += 1
  return n
}

/**
 * Apply a coach verdict on a skill, propagating credit:
 * - Pass: every transitive prereq still `unknown` becomes `known` (propagated-up).
 * - Fail: every transitive postreq still `unknown` becomes `not-known` (propagated-down).
 * - Conditional: only the probed skill is marked conditional; no propagation.
 * Returns a new state (immutable).
 */
export function applyVerdict(
  engine: DiagnosticEngine,
  state: DiagnosticState,
  skillId: string,
  verdict: DiagnosticVerdict,
  note?: string,
  at: number = Date.now(),
): DiagnosticState {
  const status = { ...state.status }
  const log = [...state.log]

  const targetStatus: DiagnosticStatus =
    verdict === 'pass' ? 'known' : verdict === 'fail' ? 'not-known' : 'conditional'
  status[skillId] = targetStatus
  log.push({ skillId, verdict, note, at, source: 'probed' })

  if (verdict === 'pass') {
    const prereqs = engine.prereqClosure[skillId] ?? new Set()
    for (const p of prereqs) {
      if (status[p] === 'unknown') {
        status[p] = 'known'
        log.push({ skillId: p, verdict: 'pass', at, source: 'propagated-up' })
      }
    }
  } else if (verdict === 'fail') {
    const post = engine.postreqClosure[skillId] ?? new Set()
    for (const q of post) {
      if (status[q] === 'unknown') {
        status[q] = 'not-known'
        log.push({ skillId: q, verdict: 'fail', at, source: 'propagated-down' })
      }
    }
  }

  return { log, status, escalations: state.escalations }
}

export interface DiagnosticCommitResult {
  mastered: string[]
  conditional: Record<string, { confidence: number; successes: number }>
  reviewState: Record<string, { dueAt: number; stability: number; lastReviewedAt: number }>
  log: DiagnosticEntry[]
  /** Final derived status per skill, post-inference. */
  finalStatus: Record<string, DiagnosticStatus>
}

/**
 * Build a topological order of skills (prereqs first). Skills with cycles or
 * missing prereqs get pushed to the end; missing prereqs are treated as if
 * they were resolved. Stable-ish w.r.t. the input order.
 */
function topoOrder(skills: SkillDef[]): SkillDef[] {
  const byId = new Map(skills.map((s) => [s.id, s]))
  const visited = new Set<string>()
  const order: SkillDef[] = []
  function visit(id: string, stack: Set<string>) {
    if (visited.has(id) || stack.has(id)) return
    const s = byId.get(id)
    if (!s) return
    stack.add(id)
    for (const p of s.prereqs) visit(p, stack)
    stack.delete(id)
    visited.add(id)
    order.push(s)
  }
  for (const s of skills) visit(s.id, new Set())
  return order
}

/**
 * Derive a status for every still-`unknown` skill from its DIRECT prereqs:
 * - all direct prereqs `known` → `known` (inferred-up)
 * - any direct prereq `not-known` → `not-known` (inferred-down)
 * - otherwise (mix of conditional / still-unknown) → `conditional` (inferred-mixed)
 *
 * Runs in topological order so inferred values cascade up correctly. Appends
 * new entries to the log and returns the updated state.
 */
export function runInferencePass(
  engine: DiagnosticEngine,
  state: DiagnosticState,
  now: number = Date.now(),
): DiagnosticState {
  const status = { ...state.status }
  const log = [...state.log]
  const ordered = topoOrder(engine.skills)

  for (const s of ordered) {
    if (status[s.id] !== 'unknown') continue
    const prereqs = s.prereqs.filter((p) => engine.skillById[p])
    if (prereqs.length === 0) {
      status[s.id] = 'not-known'
      log.push({ skillId: s.id, verdict: 'fail', at: now, source: 'inferred-down' })
      continue
    }
    let allKnown = true
    let anyNotKnown = false
    for (const p of prereqs) {
      const st = status[p]
      if (st === 'not-known') anyNotKnown = true
      if (st !== 'known') allKnown = false
    }
    if (anyNotKnown) {
      status[s.id] = 'not-known'
      log.push({ skillId: s.id, verdict: 'fail', at: now, source: 'inferred-down' })
    } else if (allKnown) {
      status[s.id] = 'known'
      log.push({ skillId: s.id, verdict: 'pass', at: now, source: 'inferred-up' })
    } else {
      status[s.id] = 'conditional'
      log.push({ skillId: s.id, verdict: 'conditional', at: now, source: 'inferred-mixed' })
    }
  }

  return { log, status, escalations: state.escalations }
}

/**
 * Turn a finished diagnostic into the seed payload for the store. Runs the
 * inference pass first so level 5–6 skills (never directly probed) get a
 * derived status from their prereq coverage.
 */
export function commitDiagnostic(
  state: DiagnosticState,
  engine: DiagnosticEngine,
  now: number = Date.now(),
  baseIntervalMs: number = DAY_MS,
): DiagnosticCommitResult {
  const inferred = runInferencePass(engine, state, now)

  const mastered: string[] = []
  const conditional: Record<string, { confidence: number; successes: number }> = {}
  const reviewState: Record<string, { dueAt: number; stability: number; lastReviewedAt: number }> = {}

  for (const [id, st] of Object.entries(inferred.status)) {
    if (st === 'known') {
      mastered.push(id)
      reviewState[id] = {
        stability: 1.0,
        lastReviewedAt: now,
        dueAt: now + 1.0 * baseIntervalMs,
      }
    } else if (st === 'conditional') {
      mastered.push(id)
      conditional[id] = { confidence: 0.5, successes: 0 }
      // Surface conditional skills as due-now review tasks so a freshly
      // onboarded athlete always sees something on day one - even if a
      // branch ended at "partial" without a fail.
      reviewState[id] = {
        stability: 0.5,
        lastReviewedAt: now,
        dueAt: now,
      }
    }
  }

  return {
    mastered,
    conditional,
    reviewState,
    log: inferred.log,
    finalStatus: inferred.status,
  }
}

/* ─── Escalation phase ───────────────────────────────────────────── */

/**
 * Top skills in the resolved graph (no postreqs depend on them). These
 * are the "branch tips" we want to seal with a fail. Cached per engine.
 */
export function topSkills(engine: DiagnosticEngine): SkillDef[] {
  const tops: SkillDef[] = []
  for (const s of engine.skills) {
    const post = engine.postreqClosure[s.id]
    if (!post || post.size === 0) tops.push(s)
  }
  return tops
}

/** Membership of a branch: the top skill and its entire prereq closure. */
function branchSkillIds(engine: DiagnosticEngine, topId: string): Set<string> {
  const ids = new Set<string>()
  ids.add(topId)
  for (const p of engine.prereqClosure[topId] ?? []) ids.add(p)
  return ids
}

/**
 * Find every top-level branch that has no `not-known` skill anywhere in
 * its lineage (probed or inferred). These are the branches that need an
 * escalation pass: every probe came back pass/partial, so we never
 * actually found the athlete's ceiling on this thread.
 */
export function findUnsealedBranchTops(
  engine: DiagnosticEngine,
  state: DiagnosticState,
): SkillDef[] {
  const tops = topSkills(engine)
  const unsealed: SkillDef[] = []
  for (const top of tops) {
    const ids = branchSkillIds(engine, top.id)
    let sealed = false
    for (const id of ids) {
      if (state.status[id] === 'not-known') {
        sealed = true
        break
      }
    }
    if (!sealed) unsealed.push(top)
  }
  return unsealed
}

/**
 * Pick the next skill in this branch to escalate against. Strategy:
 * walk the branch from the highest-level skill downward and pick the
 * highest-level skill that:
 *   - has not yet been graded `not-known` (otherwise the branch is sealed),
 *   - has not yet had an escalation probe applied this run (no entry in
 *     `state.escalations` for this skill),
 *   - has at least one prereq in this branch graded `known` or `conditional`
 *     (so we know we're climbing past something the athlete already showed),
 *     OR is the branch top itself.
 *
 * Returns null when the branch is exhausted - i.e. we've already escalated
 * against the top skill and got pass/partial. Caller should accept the
 * branch as the ceiling and move on.
 */
export function nextEscalationTarget(
  engine: DiagnosticEngine,
  state: DiagnosticState,
  branchTopId: string,
): SkillDef | null {
  const top = engine.skillById[branchTopId]
  if (!top) return null
  const branchIds = branchSkillIds(engine, branchTopId)

  const escalated = new Set(state.escalations.map((e) => e.skillId))

  const branchSkills = [...branchIds]
    .map((id) => engine.skillById[id])
    .filter((s): s is SkillDef => !!s)
    .sort((a, b) => b.level - a.level)

  for (const candidate of branchSkills) {
    if (state.status[candidate.id] === 'not-known') return null
    if (escalated.has(candidate.id)) continue
    if (candidate.id === branchTopId) return candidate
    const prereqsHaveSignal = candidate.prereqs.some((pid) => {
      const st = state.status[pid]
      return st === 'known' || st === 'conditional'
    })
    if (prereqsHaveSignal) return candidate
  }

  return null
}

/**
 * Apply a coach verdict on an AI-generated harder probe. Mirrors
 * `applyVerdict` semantics but logs into the parallel `escalations` array
 * AND propagates through the same prereq/postreq closures so the rest of
 * the engine (inference pass, dashboard fill) sees consistent state.
 */
export function applyEscalationVerdict(
  engine: DiagnosticEngine,
  state: DiagnosticState,
  skillId: string,
  verdict: DiagnosticVerdict,
  prompt: string,
  rationale?: string,
  note?: string,
  at: number = Date.now(),
): DiagnosticState {
  const status = { ...state.status }
  const log = [...state.log]
  const escalations = [...state.escalations]

  const targetStatus: DiagnosticStatus =
    verdict === 'pass' ? 'known' : verdict === 'fail' ? 'not-known' : 'conditional'
  status[skillId] = targetStatus

  escalations.push({ skillId, prompt, rationale, verdict, note, at })
  log.push({ skillId, verdict, note, at, source: 'escalation' })

  if (verdict === 'pass') {
    const prereqs = engine.prereqClosure[skillId] ?? new Set()
    for (const p of prereqs) {
      const cur = status[p]
      if (cur === 'unknown' || cur === 'conditional') {
        status[p] = 'known'
        log.push({ skillId: p, verdict: 'pass', at, source: 'escalation-propagated-up' })
      }
    }
  } else if (verdict === 'fail') {
    const post = engine.postreqClosure[skillId] ?? new Set()
    for (const q of post) {
      const cur = status[q]
      if (cur === 'unknown' || cur === 'conditional') {
        status[q] = 'not-known'
        log.push({ skillId: q, verdict: 'fail', at, source: 'escalation-propagated-down' })
      }
    }
  }

  return { log, status, escalations }
}

export const DAY_MS = 24 * 60 * 60 * 1000
