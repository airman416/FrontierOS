import { createContext, useContext } from 'react'
import type { SkillDef } from '../../data/graph'

/**
 * Provides a scoped skill lookup (and mastery/readiness overrides) to
 * `SkillGraphNode` instances inside a `SkillTreeView`. Needed when the tree
 * renders a generated sport plan whose skill IDs aren't in the store's
 * default `skillById` (e.g. the student detail view for an onboarded athlete).
 */
export interface SkillGraphScope {
  skillById: Record<string, SkillDef>
}

export const SkillGraphScopeContext = createContext<SkillGraphScope | null>(null)

export function useSkillGraphScope(): SkillGraphScope | null {
  return useContext(SkillGraphScopeContext)
}
