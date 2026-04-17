import { prefetchBootstrap } from './api'
import { migrateLocalStorageIfNeeded } from './migrateLocalStorage'

let inflight: Promise<void> | null = null

/**
 * Runs the one-shot legacy migration, then kicks off bootstrap fetch so it can
 * overlap React startup. Safe to call from main and StoreHydrator — shares one
 * promise (migration is not double-posted).
 */
export function ensureBootPrefetchStarted(): Promise<void> {
  if (!inflight) {
    inflight = (async () => {
      await migrateLocalStorageIfNeeded()
      prefetchBootstrap()
    })()
  }
  return inflight
}
