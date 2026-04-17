/**
 * Server-side port of `src/lib/reonboard.ts`. Given the prior team plan's
 * skills + an athlete's prior diagnostic log, fuzzy-match onto the new team
 * plan's skills and return the mastered / conditional seed for that athlete.
 */

export interface SkillShape {
  id: string
  label: string
  level: number
  prereqs?: string[]
}

export interface DiagnosticEntryShape {
  skillId: string
  verdict: 'pass' | 'fail' | 'conditional' | string
}

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

export function seedFromPriorDiagnostic(opts: {
  priorSkills: SkillShape[]
  priorLog: DiagnosticEntryShape[]
  newSkills: SkillShape[]
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
      : 'No skills could be reliably ported from the prior diagnostic — coach may want to re-run it.'

  return { mastered, conditional, rationale }
}
