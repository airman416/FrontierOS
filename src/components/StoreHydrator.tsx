import { useEffect, useState, type ReactNode } from 'react'
import { useFrontierStore } from '../store/useFrontierStore'
import { migrateLocalStorageIfNeeded } from '../lib/migrateLocalStorage'

interface Props {
  children: ReactNode
}

/**
 * Blocks the app from rendering until the initial `/api/bootstrap` call
 * resolves. Also runs the one-shot localStorage → Postgres migration before
 * hydration so pre-existing coaches don't lose their demo state.
 */
export function StoreHydrator({ children }: Props) {
  const hydrated = useFrontierStore((s) => s.hydrated)
  const hydrate = useFrontierStore((s) => s.hydrate)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        await migrateLocalStorageIfNeeded()
        await hydrate()
      } catch (err) {
        if (cancelled) return
        console.error('[FrontierOS] hydration failed', err)
        setError(err instanceof Error ? err.message : String(err))
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [hydrate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base p-6">
        <div className="max-w-md border border-border-subtle bg-surface-raised p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
            Startup error
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            Couldn't reach the FrontierOS API.
          </p>
          <p className="mt-2 text-xs text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 bg-alpha px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-alpha-light"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
            Frontier OS
          </p>
          <p className="mt-2 text-sm text-slate-400">Loading coach state…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
