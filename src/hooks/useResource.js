import { useCallback, useEffect, useState } from 'react'

/**
 * Generic async-data hook.
 *
 * Loads from a `fetcher` function (typically a service call) on mount and
 * tracks loading/error state. Domain hooks (useAppointments, usePatients,
 * etc.) build on this, so swapping a service implementation never touches
 * the hook consumers.
 *
 * @param {() => Promise<any>} fetcher Stable async function that returns data.
 * @returns {{ data, setData, isLoading, error, refetch }}
 */
export function useResource(fetcher) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)

  // Fetches inside an async IIFE (setState only after `await`), so the
  // effect body never calls setState synchronously. `active` guards against
  // updating state after unmount or a stale StrictMode mount.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const result = await fetcher()
        if (!active) return
        setData(result)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err?.message || 'Something went wrong while loading data.')
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [fetcher, version])

  // Manual reload (e.g. from a retry button) shows the loading state and
  // re-runs the effect above.
  const refetch = useCallback(() => {
    setIsLoading(true)
    setVersion((v) => v + 1)
  }, [])

  return { data, setData, isLoading, error, refetch }
}
