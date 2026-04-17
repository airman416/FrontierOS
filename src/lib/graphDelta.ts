import type { SkillDef } from '../data/graph'
import type { GeneratedGraph, GraphDelta, SportPlan } from './graphSchema'

export type Divergence = 'added' | 'modified' | 'removed' | 'base'

export interface DeltaView {
  added: Set<string>
  modified: Set<string>
  removedIds: Set<string>
  removedGhosts: SkillDef[]
}

export function deltaViewFromGraphs(
  baseGraph: GeneratedGraph | null | undefined,
  nextGraph: GeneratedGraph | null | undefined,
): DeltaView | null {
  if (!baseGraph || !nextGraph) return null
  const { added, removed, modified } = diffSkills(baseGraph.skills, nextGraph.skills)
  const presentIds = new Set(nextGraph.skills.map((s) => s.id))
  const baseById = new Map(baseGraph.skills.map((s) => [s.id, s]))
  const removedGhosts: SkillDef[] = []
  for (const id of removed) {
    const g = baseById.get(id)
    if (!g) continue
    removedGhosts.push({
      ...g,
      prereqs: g.prereqs.filter((p) => presentIds.has(p)),
    })
  }
  return {
    added: new Set(added.map((s) => s.id)),
    modified: new Set(Object.keys(modified)),
    removedIds: new Set(removed),
    removedGhosts,
  }
}

export function emptyDelta(): GraphDelta {
  return { added: [], removed: [], modified: {} }
}

export function hasDeltaChanges(delta: GraphDelta | null | undefined): boolean {
  if (!delta) return false
  if (delta.fullOverride) return true
  if (delta.added.length > 0) return true
  if (delta.removed.length > 0) return true
  if (Object.keys(delta.modified).length > 0) return true
  return false
}

function skillsEqual(a: SkillDef, b: SkillDef): boolean {
  if (a.label !== b.label) return false
  if (a.level !== b.level) return false
  if (a.sport !== b.sport) return false
  if (a.prereqs.length !== b.prereqs.length) return false
  const ap = [...a.prereqs].sort()
  const bp = [...b.prereqs].sort()
  for (let i = 0; i < ap.length; i++) {
    if (ap[i] !== bp[i]) return false
  }
  return true
}

function partialSkillDiff(base: SkillDef, next: SkillDef): Partial<Omit<SkillDef, 'id'>> {
  const diff: Partial<Omit<SkillDef, 'id'>> = {}
  if (base.label !== next.label) diff.label = next.label
  if (base.level !== next.level) diff.level = next.level
  if (base.sport !== next.sport) diff.sport = next.sport
  const basePrereqs = [...base.prereqs].sort()
  const nextPrereqs = [...next.prereqs].sort()
  const prereqsDiffer =
    basePrereqs.length !== nextPrereqs.length ||
    basePrereqs.some((p, i) => p !== nextPrereqs[i])
  if (prereqsDiffer) diff.prereqs = next.prereqs
  return diff
}

export function diffSkills(
  baseSkills: SkillDef[],
  nextSkills: SkillDef[],
): { added: SkillDef[]; removed: string[]; modified: Record<string, Partial<Omit<SkillDef, 'id'>>> } {
  const baseById = new Map(baseSkills.map((s) => [s.id, s]))
  const nextById = new Map(nextSkills.map((s) => [s.id, s]))

  const added: SkillDef[] = []
  const modified: Record<string, Partial<Omit<SkillDef, 'id'>>> = {}
  for (const next of nextSkills) {
    const base = baseById.get(next.id)
    if (!base) {
      added.push(next)
      continue
    }
    if (!skillsEqual(base, next)) {
      modified[next.id] = partialSkillDiff(base, next)
    }
  }

  const removed: string[] = []
  for (const base of baseSkills) {
    if (!nextById.has(base.id)) removed.push(base.id)
  }

  return { added, removed, modified }
}

export function computeDelta(
  baseGraph: GeneratedGraph | null,
  nextGraph: GeneratedGraph,
): GraphDelta {
  if (!baseGraph) {
    return {
      added: [],
      removed: [],
      modified: {},
      fullOverride: nextGraph,
      updatedAt: Date.now(),
    }
  }
  const { added, removed, modified } = diffSkills(baseGraph.skills, nextGraph.skills)
  return {
    added,
    removed,
    modified,
    updatedAt: Date.now(),
  }
}

export function applyDelta(
  baseGraph: GeneratedGraph | null,
  delta: GraphDelta | null | undefined,
): GeneratedGraph | null {
  if (delta?.fullOverride) return delta.fullOverride
  if (!baseGraph) return null
  if (!delta) return baseGraph

  const skillById = new Map(baseGraph.skills.map((s) => [s.id, s]))
  for (const id of delta.removed) skillById.delete(id)
  for (const [id, patch] of Object.entries(delta.modified)) {
    const existing = skillById.get(id)
    if (existing) {
      skillById.set(id, { ...existing, ...patch, id })
    }
  }
  for (const newSkill of delta.added) {
    skillById.set(newSkill.id, newSkill)
  }

  return {
    ...baseGraph,
    skills: [...skillById.values()],
  }
}

export function resolveAthleteGraph(
  sportPlan: SportPlan | null | undefined,
  delta: GraphDelta | null | undefined,
  legacyGraph: GeneratedGraph | null | undefined,
): GeneratedGraph | null {
  if (delta?.fullOverride) return delta.fullOverride
  if (sportPlan) {
    return applyDelta(sportPlan.graph, delta)
  }
  if (legacyGraph) return legacyGraph
  return null
}

export function deltaViewFromDelta(delta: GraphDelta | null | undefined): {
  added: Set<string>
  modified: Set<string>
  removed: Set<string>
} {
  const added = new Set<string>()
  const modified = new Set<string>()
  const removed = new Set<string>()
  if (!delta || delta.fullOverride) return { added, modified, removed }
  for (const skill of delta.added) added.add(skill.id)
  for (const id of delta.removed) removed.add(id)
  for (const id of Object.keys(delta.modified)) modified.add(id)
  return { added, modified, removed }
}
