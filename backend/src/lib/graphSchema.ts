/**
 * OpenRouter structured-output JSON schema for graph generation.
 * Kept in sync with `src/lib/graphSchema.ts` on the frontend.
 */
export const graphJsonSchema = {
  type: 'object',
  properties: {
    chatReply: { type: 'string' },
    graph: {
      type: 'object',
      properties: {
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              level: { type: 'integer', minimum: 1, maximum: 6 },
              prereqs: { type: 'array', items: { type: 'string' } },
              sport: { type: 'string' },
              summary: { type: 'string' },
              diagnosticPrompt: { type: 'string' },
            },
            required: [
              'id', 'label', 'level', 'prereqs', 'sport', 'summary', 'diagnosticPrompt',
            ],
            additionalProperties: false,
          },
        },
        athletes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              displayName: { type: 'string' },
              firstName: { type: 'string' },
              age: { type: 'integer', minimum: 14, maximum: 17 },
              position: { type: 'string' },
              schoolYear: { type: 'string' },
              sport: { type: 'string' },
              avatarColor: { type: 'string' },
              tagline: { type: 'string' },
              mastery: { type: 'array', items: { type: 'string' } },
              readiness: { type: 'integer', minimum: 0, maximum: 100 },
            },
            required: [
              'id', 'displayName', 'firstName', 'age', 'position',
              'schoolYear', 'sport', 'avatarColor', 'tagline', 'mastery', 'readiness',
            ],
            additionalProperties: false,
          },
        },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              shortLabel: { type: 'string' },
              title: { type: 'string' },
              detail: { type: 'string' },
              sport: { type: 'string' },
              technique: {
                type: 'string',
                enum: [
                  'Knowledge graph', 'Physical frontier', 'Expert tutor / autoregulation',
                  'Objective readiness', 'Spaced repetition', 'Interleaving',
                  'Testing effect', 'Non-interference', 'Automaticity', 'Encompassings',
                ],
              },
              skillId: { type: 'string' },
              xp: { type: 'integer', minimum: 1, maximum: 100 },
              rationale: { type: 'string' },
            },
            required: [
              'id', 'shortLabel', 'title', 'detail', 'sport', 'technique',
              'skillId', 'xp', 'rationale',
            ],
            additionalProperties: false,
          },
        },
        skillShortLabels: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['skills', 'athletes', 'tasks', 'skillShortLabels'],
      additionalProperties: false,
    },
  },
  required: ['chatReply', 'graph'],
  additionalProperties: false,
}
