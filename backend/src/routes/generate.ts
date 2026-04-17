import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../env.js'
import {
  buildAthleteSystemPrompt,
  buildSportSystemPrompt,
  type AthleteContext,
} from '../lib/prompts.js'
import { graphJsonSchema } from '../lib/graphSchema.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface GenerateBody {
  mode?: 'sport' | 'athlete'
  sport: string
  requirements?: string
  history?: ChatMessage[]
  currentGraph?: unknown[]
  baseGraph?: unknown[]
  athleteContext?: AthleteContext
}

export async function registerGenerateRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/generate', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!env.OPENROUTER_API_KEY) {
      reply.code(500).send('OPENROUTER_API_KEY not configured')
      return
    }

    const body = (req.body ?? {}) as GenerateBody
    const { sport, athleteContext, baseGraph, currentGraph } = body
    const requirements = body.requirements ?? ''
    const history = body.history ?? []
    const mode = body.mode ?? 'sport'

    if (!sport) {
      reply.code(400).send('Missing sport field')
      return
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
      const lastIdx = messages.length - 1
      if (lastIdx >= 0 && messages[lastIdx].role === 'user') {
        messages[lastIdx].content += `\n\n${contextParts.join('\n\n')}`
      }
    }

    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.HTTP_REFERER,
        'X-Title': env.OPENROUTER_APP_TITLE,
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
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
        provider: { require_parameters: true },
      }),
    }).catch((err: unknown) => {
      req.log.error({ err }, 'Upstream fetch failed')
      return null
    })

    if (!upstream) {
      reply.code(502).send('Upstream error')
      return
    }
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => 'Unknown upstream error')
      reply.code(upstream.status).send(`OpenRouter error: ${text}`)
      return
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      // Disable proxy buffering (nginx/Cloudflare) so SSE chunks flush live.
      'X-Accel-Buffering': 'no',
    })

    const reader = upstream.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) reply.raw.write(Buffer.from(value))
      }
    } catch (err) {
      req.log.error({ err }, 'Streaming error')
    } finally {
      reply.raw.end()
    }
  })
}
