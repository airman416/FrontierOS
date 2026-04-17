import { parse } from 'partial-json'
import type { GenerateRequest, GenerateResponse } from './graphSchema'

// Default to the same-origin Netlify redirect (`/api/generate` -> the Netlify
// function). Override via `VITE_GENERATE_URL` to point at a standalone
// backend (e.g. the FastAPI service in `backend/` deployed to Fly.io).
const GENERATE_URL = import.meta.env.VITE_GENERATE_URL || '/api/generate'

export interface GeneratePartial {
  /** Best-effort `chatReply` text parsed from the incomplete JSON stream. */
  chatReply: string
  /** True once the stream has begun the `graph` field but the document is not yet valid JSON. */
  graphBuilding: boolean
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
  try {
    const partial = parse(content) as { chatReply?: unknown }
    if (typeof partial?.chatReply === 'string') chatReply = partial.chatReply
  } catch {
    // Still mid-token or malformed until more chunks arrive.
  }

  const graphBuilding =
    content.length > 0 &&
    !isCompleteJsonObject(content) &&
    /"graph"\s*:/.test(content)

  return { chatReply, graphBuilding }
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
