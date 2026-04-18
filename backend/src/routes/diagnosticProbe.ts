import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { accessControlAllowOrigin, env } from '../env.js'
import {
  buildEscalationProbePrompt,
  type AthleteContext,
  type EscalationPriorAttempt,
  type EscalationSkill,
} from '../lib/prompts.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface EscalationProbeBody {
  sport: string
  athleteContext?: AthleteContext
  skill: EscalationSkill
  priorAttempts?: EscalationPriorAttempt[]
}

const escalationProbeSchema = {
  type: 'object',
  properties: {
    prompt: { type: 'string' },
    rationale: { type: 'string' },
  },
  required: ['prompt', 'rationale'],
  additionalProperties: false,
}

export async function registerDiagnosticProbeRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/diagnostic/probe', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!env.OPENROUTER_API_KEY) {
      reply.code(500).send('OPENROUTER_API_KEY not configured')
      return
    }

    const body = (req.body ?? {}) as EscalationProbeBody
    const { sport, skill, athleteContext } = body
    const priorAttempts = body.priorAttempts ?? []

    const reasons: string[] = []
    if (!sport || typeof sport !== 'string') reasons.push('sport missing/invalid')
    if (!skill || typeof skill !== 'object') reasons.push('skill missing')
    else {
      if (typeof skill.id !== 'string' || skill.id.length === 0) reasons.push('skill.id missing/invalid')
      if (typeof skill.label !== 'string' || skill.label.length === 0) reasons.push('skill.label missing/invalid')
    }
    if (reasons.length > 0) {
      req.log.warn(
        { reasons, sport, skillId: skill?.id, skillLabel: skill?.label, priorAttempts: priorAttempts.length },
        'Escalation probe rejected (400)',
      )
      reply.code(400).send(`Invalid escalation probe payload: ${reasons.join(', ')}`)
      return
    }

    const systemPrompt = buildEscalationProbePrompt(sport, skill, priorAttempts, athleteContext)

    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.HTTP_REFERER,
        'X-Title': env.OPENROUTER_APP_TITLE,
      },
      body: JSON.stringify({
        model: env.OPENROUTER_PROBE_MODEL,
        messages: [{ role: 'system', content: systemPrompt }],
        stream: true,
        // The drill is ~25 words and the rationale is ~15 words. Cap
        // generation tightly so we don't pay for runaway tokens and
        // the stream finishes fast.
        max_tokens: 200,
        temperature: 0.6,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'escalation_probe',
            strict: true,
            schema: escalationProbeSchema,
          },
        },
        provider: { require_parameters: true },
      }),
    }).catch((err: unknown) => {
      req.log.error({ err }, 'Upstream fetch failed (escalation probe)')
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

    const reqOrigin =
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined
    const allowOrigin = accessControlAllowOrigin(reqOrigin)

    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    }
    if (allowOrigin !== null) {
      headers['Access-Control-Allow-Origin'] = allowOrigin
      headers.Vary = 'Origin'
    }

    reply.raw.writeHead(200, headers)

    const reader = upstream.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) reply.raw.write(Buffer.from(value))
      }
    } catch (err) {
      req.log.error({ err }, 'Streaming error (escalation probe)')
    } finally {
      reply.raw.end()
    }
  })
}
