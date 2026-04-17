import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from '../../lib/graphSchema'

export function ChatPanel({
  messages,
  onSend,
  isLoading,
  streamingText,
  streamingStatus,
  placeholder = 'Ask AI to adjust the graph...',
}: {
  messages: ChatMessage[]
  onSend: (message: string) => void
  isLoading: boolean
  streamingText?: string
  streamingStatus?: string | null
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isLoading, streamingText, streamingStatus])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = input.trim()
      if (!trimmed || isLoading) return
      onSend(trimmed)
      setInput('')
    },
    [input, isLoading, onSend],
  )

  const showingStream = Boolean(isLoading && streamingText && streamingText.length > 0)

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-alpha text-white'
                  : 'border border-border-subtle bg-surface-elevated text-slate-300'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose-builder">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && showingStream && (
          <div className="flex justify-start">
            <div className="max-w-[85%] border border-border-subtle bg-surface-elevated px-3 py-2 text-[13px] leading-relaxed text-slate-300">
              <div className="prose-builder">
                <ReactMarkdown>{streamingText ?? ''}</ReactMarkdown>
              </div>
              {streamingStatus ? (
                <p className="mt-2 border-t border-border-subtle pt-2 text-[11px] text-slate-500">
                  {streamingStatus}
                </p>
              ) : (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="inline-block h-3.5 w-0.5 animate-pulse bg-alpha" aria-hidden />
                  Writing…
                </p>
              )}
            </div>
          </div>
        )}

        {isLoading && !showingStream && (
          <div className="flex justify-start">
            <div className="border border-border-subtle bg-surface-elevated px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse bg-alpha" />
                <span className="h-1.5 w-1.5 animate-pulse bg-alpha [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse bg-alpha [animation-delay:300ms]" />
                <span className="ml-2 text-[11px] text-slate-500">
                  Starting…
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 gap-2 border-t border-border-subtle bg-surface p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition focus:border-alpha disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="shrink-0 bg-alpha px-4 py-2 text-xs font-bold text-white transition hover:bg-alpha-light disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
