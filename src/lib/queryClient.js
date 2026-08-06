import { QueryClient } from '@tanstack/react-query'

/**
 * Single shared TanStack Query client (server-state/data-fetching layer).
 *
 * Module-level singleton so every hook shares one cache and one set of
 * defaults. `staleTime` keeps freshly-fetched data cached for a short
 * window so page switches don't re-hit the API; mutations invalidate the
 * relevant keys to refetch on demand.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retries are handled centrally in services/api.js `request()`: idempotent
      // GET fetches retry transient 502/503/504 and network failures with a
      // backoff before surfacing an error. Keeping retry disabled here avoids
      // re-running whole queries on top of that (request multiplication when
      // the single-threaded PHP dev server is under a burst of parallel loads).
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})
