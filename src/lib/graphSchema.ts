import type { SkillDef, Sport } from '../data/graph'
import type { Athlete } from '../data/athletes'
import type { TodayTask } from '../data/student'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type GenerateMode = 'sport' | 'athlete'

export interface AthleteContext {
  name: string
  firstName?: string
  position?: string
  schoolYear?: string
  age?: number
  tagline?: string
  masteredIds?: string[]
  readiness?: number
}

export interface GenerateRequest {
  mode: GenerateMode
  sport: string
  requirements: string
  history: ChatMessage[]
  currentGraph?: SkillDef[]
  baseGraph?: SkillDef[]
  athleteContext?: AthleteContext
}

export interface GraphDelta {
  baseVersion?: string
  added: SkillDef[]
  removed: string[]
  modified: Record<string, Partial<Omit<SkillDef, 'id'>>>
  requirements?: string
  history?: ChatMessage[]
  fullOverride?: GeneratedGraph
  updatedAt?: number
}

export interface SportPlan {
  sport: Sport | string
  graph: GeneratedGraph
  version: string
  requirements: string
  history: ChatMessage[]
  updatedAt: number
}

export interface GeneratedGraph {
  skills: SkillDef[]
  athletes: GeneratedAthlete[]
  tasks: TodayTask[]
  skillShortLabels: Record<string, string>
}

export interface GeneratedAthlete extends Omit<Athlete, 'avatarColor'> {
  avatarColor: string
  mastery: string[]
  readiness: number
}

export interface GenerateResponse {
  chatReply: string
  graph: GeneratedGraph
}

export const graphJsonSchema = {
  type: 'object' as const,
  properties: {
    chatReply: { type: 'string' as const },
    graph: {
      type: 'object' as const,
      properties: {
        skills: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const },
              label: { type: 'string' as const },
              level: { type: 'integer' as const, minimum: 1, maximum: 6 },
              prereqs: { type: 'array' as const, items: { type: 'string' as const } },
              sport: { type: 'string' as const },
              summary: { type: 'string' as const },
              diagnosticPrompt: { type: 'string' as const },
            },
            required: ['id', 'label', 'level', 'prereqs', 'sport', 'summary', 'diagnosticPrompt'] as const,
            additionalProperties: false,
          },
        },
        athletes: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const },
              displayName: { type: 'string' as const },
              firstName: { type: 'string' as const },
              age: { type: 'integer' as const, minimum: 14, maximum: 17 },
              position: { type: 'string' as const },
              schoolYear: { type: 'string' as const },
              sport: { type: 'string' as const },
              avatarColor: { type: 'string' as const },
              tagline: { type: 'string' as const },
              mastery: { type: 'array' as const, items: { type: 'string' as const } },
              readiness: { type: 'integer' as const, minimum: 0, maximum: 100 },
            },
            required: [
              'id', 'displayName', 'firstName', 'age', 'position',
              'schoolYear', 'sport', 'avatarColor', 'tagline', 'mastery', 'readiness',
            ] as const,
            additionalProperties: false,
          },
        },
        tasks: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const },
              shortLabel: { type: 'string' as const },
              title: { type: 'string' as const },
              detail: { type: 'string' as const },
              sport: { type: 'string' as const },
              technique: {
                type: 'string' as const,
                enum: [
                  'Knowledge graph', 'Physical frontier', 'Expert tutor / autoregulation',
                  'Objective readiness', 'Spaced repetition', 'Interleaving',
                  'Testing effect', 'Non-interference', 'Automaticity', 'Encompassings',
                ] as const,
              },
              skillId: { type: 'string' as const },
              xp: { type: 'integer' as const, minimum: 1, maximum: 100 },
              rationale: { type: 'string' as const },
            },
            required: [
              'id', 'shortLabel', 'title', 'detail', 'sport', 'technique',
              'skillId', 'xp', 'rationale',
            ] as const,
            additionalProperties: false,
          },
        },
        skillShortLabels: {
          type: 'object' as const,
          additionalProperties: { type: 'string' as const },
        },
      },
      required: ['skills', 'athletes', 'tasks', 'skillShortLabels'] as const,
      additionalProperties: false,
    },
  },
  required: ['chatReply', 'graph'] as const,
  additionalProperties: false,
}
