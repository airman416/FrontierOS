import { parse } from 'partial-json'
import type { SkillDef } from '../data/graph'
import type { GeneratedAthlete, GenerateRequest, GeneratedGraph, GenerateResponse } from './graphSchema'
import type { TaskTechnique, TodayTask } from '../data/student'

// Default to the same-origin Netlify redirect (`/api/generate` -> the Netlify
// function). Override via `VITE_GENERATE_URL` to point at a standalone
// backend (e.g. the FastAPI service in `backend/` deployed to Fly.io).
const GENERATE_URL = import.meta.env.VITE_GENERATE_URL || '/api/generate'

const TASK_TECHNIQUES = new Set<TaskTechnique>([
  'Knowledge graph',
  'Physical frontier',
  'Expert tutor / autoregulation',
  'Objective readiness',
  'Spaced repetition',
  'Interleaving',
  'Testing effect',
  'Non-interference',
  'Automaticity',
  'Encompassings',
])

function isLevel(n: unknown): n is SkillDef['level'] {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 6
}

function isCompleteSkillRow(x: unknown): x is SkillDef {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.label !== 'string') return false
  if (!isLevel(o.level)) return false
  if (!Array.isArray(o.prereqs) || !o.prereqs.every((p) => typeof p === 'string')) return false
  if (typeof o.sport !== 'string') return false
  if (typeof o.summary !== 'string') return false
  if (typeof o.diagnosticPrompt !== 'string') return false
  return true
}

function isCompleteAthleteRow(x: unknown): x is GeneratedAthlete {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (typeof o.id !== 'string') return false
  if (typeof o.displayName !== 'string') return false
  if (typeof o.firstName !== 'string') return false
  if (typeof o.age !== 'number' || !Number.isInteger(o.age)) return false
  if (o.age < 14 || o.age > 17) return false
  if (typeof o.position !== 'string') return false
  if (typeof o.schoolYear !== 'string') return false
  if (typeof o.sport !== 'string') return false
  if (typeof o.avatarColor !== 'string') return false
  if (typeof o.tagline !== 'string') return false
  if (!Array.isArray(o.mastery) || !o.mastery.every((m) => typeof m === 'string')) return false
  if (typeof o.readiness !== 'number' || !Number.isInteger(o.readiness)) return false
  if (o.readiness < 0 || o.readiness > 100) return false
  return true
}

function isCompleteTaskRow(x: unknown): x is TodayTask {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (typeof o.id !== 'string') return false
  if (typeof o.shortLabel !== 'string') return false
  if (typeof o.title !== 'string') return false
  if (typeof o.detail !== 'string') return false
  if (typeof o.sport !== 'string') return false
  if (typeof o.technique !== 'string' || !TASK_TECHNIQUES.has(o.technique as TaskTechnique)) return false
  if (typeof o.skillId !== 'string') return false
  if (typeof o.xp !== 'number' || !Number.isInteger(o.xp) || o.xp < 1 || o.xp > 100) return false
  if (typeof o.rationale !== 'string') return false
  return true
}

/** Best-effort graph from an incomplete JSON stream (complete rows only). */
export function previewGraphFromPartialRoot(parsedRoot: unknown): GeneratedGraph | null {
  if (!parsedRoot || typeof parsedRoot !== 'object') return null
  const root = parsedRoot as { graph?: unknown }
  const g = root.graph
  if (!g || typeof g !== 'object') return null
  const graph = g as Record<string, unknown>

  const skillsRaw = graph.skills
  if (!Array.isArray(skillsRaw)) return null
  const skills = skillsRaw.filter(isCompleteSkillRow)
  if (skills.length === 0) return null

  const athletesRaw = graph.athletes
  const athletes = Array.isArray(athletesRaw) ? athletesRaw.filter(isCompleteAthleteRow) : []

  const tasksRaw = graph.tasks
  const tasks = Array.isArray(tasksRaw) ? tasksRaw.filter(isCompleteTaskRow) : []

  let skillShortLabels: Record<string, string> = {}
  const labels = graph.skillShortLabels
  if (labels && typeof labels === 'object' && !Array.isArray(labels)) {
    skillShortLabels = Object.fromEntries(
      Object.entries(labels).filter((e): e is [string, string] => typeof e[1] === 'string'),
    )
  }

  return {
    skills,
    athletes,
    tasks,
    skillShortLabels,
  }
}

export interface GeneratePartial {
  /** Best-effort `chatReply` text parsed from the incomplete JSON stream. */
  chatReply: string
  /** True once the stream has begun the `graph` field but the document is not yet valid JSON. */
  graphBuilding: boolean
  /** Incremental preview: complete skills/tasks/athletes parsed so far (updates as the stream grows). */
  previewGraph: GeneratedGraph | null
}

export interface GenerateGraphOptions {
  onPartial?: (partial: GeneratePartial) => void
}

function isCompleteJsonObject(s: string): boolean {
  try {
    JSON.parse(s)
    return true
  } catch {
    return false
  }
}

/** Derive streaming UI state from accumulated structured-output tokens. */
export function partialStateFromContent(content: string): GeneratePartial {
  let chatReply = ''
  let parsedRoot: unknown = null
  try {
    parsedRoot = parse(content)
    const partial = parsedRoot as { chatReply?: unknown }
    if (typeof partial?.chatReply === 'string') chatReply = partial.chatReply
  } catch {
    parsedRoot = null
  }

  const graphBuilding =
    content.length > 0 &&
    !isCompleteJsonObject(content) &&
    /"graph"\s*:/.test(content)

  const previewGraph =
    parsedRoot !== null ? previewGraphFromPartialRoot(parsedRoot) : null

  return { chatReply, graphBuilding, previewGraph }
}

export async function generateGraph(
  req: GenerateRequest,
  options?: GenerateGraphOptions,
): Promise<GenerateResponse> {
  const res = await fetch(GENERATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Generation failed (${res.status}): ${text}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let content = ''
  let buffer = ''
  const onPartial = options?.onPartial

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice(6)
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) {
          content += delta
          onPartial?.(partialStateFromContent(content))
        }
      } catch {
        // partial JSON line, skip
      }
    }
  }

  return JSON.parse(content) as GenerateResponse
}
