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
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
