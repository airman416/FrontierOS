import type { SkillDef } from '../data/graph'
import type { DiagnosticEntry } from './diagnostic'

/**
 * AI re-onboard (client-side heuristic).
 *
 * When a new team plan is generated, previously-onboarded athletes need
 * mastered/conditional states ported onto the new skill graph. The real product
 * calls an LLM with the prior diagnostic log + new graph and gets back a seed;
 * for the demo we fuzzy-match on skill label - lowercase + alpha-num tokens.
 *
 * The returned seed drops any skill that can't be confidently matched, biasing
 * toward conservative re-entry (coach can always promote with Override).
 */
export interface ReonboardSeed {
  mastered: string[]
  conditional: Record<string, { confidence: number }>
  rationale: string
}

function tokenize(label: string): Set<string> {
  return new Set(
    label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  )
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let hits = 0
  for (const t of a) if (b.has(t)) hits += 1
  return hits / Math.min(a.size, b.size)
}

/**
 * Map prior-graph skills (by verdict) onto the new graph. Uses label overlap
 * with a 0.5 threshold; ties go to the higher-level skill (more specific).
 */
export function seedFromPriorDiagnostic(opts: {
  priorSkills: SkillDef[]
  priorLog: DiagnosticEntry[]
  newSkills: SkillDef[]
}): ReonboardSeed {
  const { priorSkills, priorLog, newSkills } = opts
  const priorById = new Map(priorSkills.map((s) => [s.id, s]))
  const newTokens = newSkills.map((s) => ({ s, tokens: tokenize(s.label) }))

  const matchedMastered = new Set<string>()
  const matchedConditional: Record<string, number> = {}

  for (const entry of priorLog) {
    const src = priorById.get(entry.skillId)
    if (!src) continue
    const srcTokens = tokenize(src.label)
    let best: { id: string; level: number; score: number } | null = null
    for (const cand of newTokens) {
      const score = overlap(srcTokens, cand.tokens)
      if (score < 0.5) continue
      if (
        !best ||
        score > best.score ||
        (score === best.score && cand.s.level > best.level)
      ) {
        best = { id: cand.s.id, level: cand.s.level, score }
      }
    }
    if (!best) continue

    if (entry.verdict === 'pass') {
      matchedMastered.add(best.id)
    } else if (entry.verdict === 'conditional') {
      const prev = matchedConditional[best.id] ?? 0
      matchedConditional[best.id] = Math.max(prev, 0.6)
    }
  }

  const mastered = Array.from(matchedMastered)
  const conditional: Record<string, { confidence: number }> = {}
  for (const [id, confidence] of Object.entries(matchedConditional)) {
    if (matchedMastered.has(id)) continue
    conditional[id] = { confidence }
  }

  const rationale =
    mastered.length + Object.keys(conditional).length > 0
      ? `Ported ${mastered.length} mastered + ${Object.keys(conditional).length} conditional from prior diagnostic via label match.`
      : 'No skills could be reliably ported from the prior diagnostic - coach may want to re-run it.'

  return { mastered, conditional, rationale }
}
