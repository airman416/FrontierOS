import type { Context } from '@netlify/functions'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SkillDef {
  id: string
  label: string
  level: number
  prereqs: string[]
  sport: string
  summary: string
}

interface AthleteContext {
  name: string
  firstName?: string
  position?: string
  schoolYear?: string
  age?: number
  tagline?: string
  masteredIds?: string[]
  readiness?: number
}

type GenerateMode = 'sport' | 'athlete'

interface RequestBody {
  mode?: GenerateMode
  sport: string
  requirements: string
  history: ChatMessage[]
  currentGraph?: SkillDef[]
  baseGraph?: SkillDef[]
  athleteContext?: AthleteContext
}

const graphJsonSchema = {
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
            },
            required: ['id', 'label', 'level', 'prereqs', 'sport', 'summary'],
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
            },
            required: ['id', 'shortLabel', 'title', 'detail', 'sport', 'technique'],
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

function buildSportSystemPrompt(sport: string, requirements: string): string {
  return `You are an expert athletic development coach and knowledge-graph architect. Your job is to generate a complete team-wide knowledge graph (skill tree) for ${sport}, along with athletes and training tasks. This is the TEAM BASELINE that applies to every athlete on the ${sport} program.

## Graph Construction Framework

### Tier Structure
- **Foundation (Levels 1–2):** Universal athletic prerequisites — sleep hygiene, joint mobility, aerobic base, core stability, anaerobic capacity, macronutrient tracking.
- **Development (Levels 3–4):** Heavy resistance, plyometrics, plus sport-specific technique nodes.
- **Integration (Levels 5–6):** Game-day fueling, complex sport-specific skills, peak game performance.

### Node Rules
- Total nodes: 12–20 (universal foundation + sport-specific layer). Keep it tight — prefer fewer, high-signal nodes over exhaustive coverage.
- **Universal nodes (levels 1–5):** ~5–8 essentials covering sleep, nutrition, mobility, aerobic/anaerobic base, core stability, mental readiness. These have sport set to "universal".
- **Sport-specific nodes (levels 3–6):** ~6–12 nodes covering the sport's key progressions. These have sport set to "${sport}".
- Exactly one "Peak Game Performance" terminal node at level 6.
- Prerequisite edges must form a valid DAG (no cycles).
- Sport-specific nodes at levels 3–4 should depend on relevant universal nodes (e.g., a throwing skill depends on core stability).
- Higher-level sport nodes depend on lower-level sport nodes AND relevant universal nodes.
- Node IDs must be kebab-case (e.g., "ball-handling", "sleep-hygiene").
- Every skill must include a "summary" field: one concise sentence (~15–25 words) describing what the skill involves and why it matters to an athlete's development. Plain language, no coach-speak filler.

### Athlete Generation Rules
- Generate exactly 10 athletes, ages 14–17, school years from Freshman through Senior.
- Positions must be drawn from ${sport}'s actual position set.
- Mastery sets must be prerequisite-consistent: if an athlete has mastered node X, they must also have mastered ALL of X's prerequisites.
- Spread athletes across development stages: some early (few masteries), some mid-development, some advanced, some near peak.
- Each athlete needs an id (kebab-case of their name), displayName, firstName, age, position, schoolYear, sport (set to "${sport}"), avatarColor (a valid hex color like "#2563eb"), tagline (one sentence about their development), mastery (array of skill IDs they've mastered), and readiness (0–100 integer).

### Task/Drill Generation Rules
- Generate 10 tasks mixing universal and sport-specific drills.
- Each task must use one of these 10 pedagogy techniques exactly: "Knowledge graph", "Physical frontier", "Expert tutor / autoregulation", "Objective readiness", "Spaced repetition", "Interleaving", "Testing effect", "Non-interference", "Automaticity", "Encompassings".
- Use each technique exactly once across the 10 tasks.
- Each task needs: id (kebab-case), shortLabel (2–3 words), title (descriptive), detail (one sentence explaining the drill), sport (either "universal" or "${sport}"), technique (one of the 10 above).

### Skill Short Labels
- Provide a skillShortLabels object mapping every skill ID to a 1–2 word abbreviation for use in heatmap column headers.

## Coach Requirements (team-wide)
${requirements || 'No specific requirements provided.'}

## Iteration Behavior
When the user asks to adjust the graph, preserve unchanged portions and modify only what they asked about. Explain what changed and why in your chatReply.

## Output Format
Return a JSON object with:
- chatReply: A short 1–2 sentence summary of the plan. DO NOT include per-level bullet lists, node counts, or long explanations. Keep it under ~40 words.
- graph: The complete graph object with skills, athletes, tasks, and skillShortLabels.`
}

function buildAthleteSystemPrompt(
  sport: string,
  requirements: string,
  athleteContext: AthleteContext | undefined,
): string {
  const name = athleteContext?.name ?? 'this athlete'
  const profileLines: string[] = []
  if (athleteContext?.position) profileLines.push(`- Position: ${athleteContext.position}`)
  if (athleteContext?.schoolYear) profileLines.push(`- School year: ${athleteContext.schoolYear}`)
  if (typeof athleteContext?.age === 'number') profileLines.push(`- Age: ${athleteContext.age}`)
  if (athleteContext?.tagline) profileLines.push(`- Tagline: ${athleteContext.tagline}`)
  if (typeof athleteContext?.readiness === 'number') profileLines.push(`- Readiness: ${athleteContext.readiness}/100`)
  if (athleteContext?.masteredIds && athleteContext.masteredIds.length > 0) {
    profileLines.push(`- Already mastered: ${athleteContext.masteredIds.join(', ')}`)
  }
  const profileBlock = profileLines.length > 0 ? profileLines.join('\n') : '- No profile details supplied.'

  return `You are an expert athletic development coach fine-tuning an individual ${sport} athlete's plan on top of an existing TEAM BASELINE.

## Athlete profile for ${name}
${profileBlock}

## Coach's adjustments for ${name}
${requirements || 'No specific adjustments provided; follow chat messages.'}

## Editing Rules
- You will be given the full team baseline graph ([Team baseline graph: ...]) AND the current in-progress resolved graph for this athlete ([Current athlete graph: ...]).
- Prefer MINIMAL, TARGETED changes to the team baseline. Only add, remove, or modify skills that are meaningfully different for ${name}.
- Do NOT rewrite unrelated portions of the graph. Keep team baseline nodes intact unless the coach explicitly wants them changed.
- Preserve the overall tier structure and DAG validity.
- Node IDs must remain kebab-case. New athlete-specific nodes should use descriptive, unique kebab-case ids (e.g., "elbow-reinforcement").
- Every skill must include a "summary" field: one concise sentence (~15–25 words) describing what the skill involves and why it matters. Carry existing summaries through unchanged for unchanged skills; write fresh summaries for any new athlete-specific nodes.
- Return the FULL RESOLVED graph for this athlete (team baseline + all athlete-specific adjustments merged). The client will diff against the baseline to compute the athlete's delta.

## Athletes & Tasks
- Keep the \`athletes\` array identical to the team baseline (copy it through unchanged).
- Keep the \`tasks\` array identical to the team baseline (copy it through unchanged).
- Update \`skillShortLabels\` to include entries for any new skills you add.

## Iteration Behavior
When the user iterates, preserve all unchanged portions. Explain in your chatReply what specifically diverges from the team baseline for ${name} and why.

## Output Format
Return a JSON object with:
- chatReply: A short 1–2 sentence summary of what diverges from the team baseline for ${name}. DO NOT include bullet lists or long explanations. Keep it under ~40 words.
- graph: The full resolved graph object (skills + athletes + tasks + skillShortLabels).`
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = Netlify.env.get('OPENROUTER_API_KEY')
  if (!apiKey) {
    return new Response('OPENROUTER_API_KEY not configured', { status: 500 })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const { sport, requirements, history, currentGraph, baseGraph, athleteContext } = body
  const mode: GenerateMode = body.mode ?? 'sport'
  if (!sport) {
    return new Response('Missing sport field', { status: 400 })
  }

  const systemPrompt =
    mode === 'athlete'
      ? buildAthleteSystemPrompt(sport, requirements, athleteContext)
      : buildSportSystemPrompt(sport, requirements)

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ]

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content })
  }

  const contextParts: string[] = []
  if (mode === 'athlete' && baseGraph && baseGraph.length > 0) {
    contextParts.push(`[Team baseline graph: ${JSON.stringify(baseGraph)}]`)
  }
  if (currentGraph && currentGraph.length > 0) {
    const label = mode === 'athlete' ? 'Current athlete graph' : 'Current graph state for reference'
    contextParts.push(`[${label}: ${JSON.stringify(currentGraph)}]`)
  }
  if (contextParts.length > 0) {
    const lastUserIdx = messages.length - 1
    if (lastUserIdx >= 0 && messages[lastUserIdx].role === 'user') {
      messages[lastUserIdx].content += `\n\n${contextParts.join('\n\n')}`
    }
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://frontier-os.netlify.app',
        'X-Title': 'Frontier OS',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: true,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'graph_generation',
            strict: true,
            schema: graphJsonSchema,
          },
        },
        provider: {
          require_parameters: true,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(`OpenRouter error: ${errorText}`, {
        status: response.status,
      })
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(`Generation error: ${message}`, { status: 500 })
  }
}
