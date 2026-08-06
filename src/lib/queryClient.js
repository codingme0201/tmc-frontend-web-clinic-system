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
      // gcTime defaults to 5 minutes — cached data stays available for that
      // window, so returning to a page shows data immediately instead of
      // re-skeletoning. Navigations within the session never flash skeletons
      // for data that was already fetched.
      //
      // Retries are handled centrally in services/api.js `request()`: idempotent
      // GET fetches retry transient 502/503/504 and network failures with a
      // backoff before surfacing an error. Keeping retry disabled here avoids
      // re-running whole queries on top of that (request multiplication when
      // the single-threaded PHP dev server is under a burst of parallel loads).
      retry: false,
      // Refocusing the window background-refetches stale queries only — cached
      // data stays on screen (pages show a subtle "Refreshing…" indicator via
      // `isRefetching`), so this never interrupts the UI.
      refetchOnWindowFocus: true,
    },
  },
})
