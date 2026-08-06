import { useCallback, useEffect, useState } from 'react'
import { checkHealth } from '../services/api'

/**
 * Monitors backend connectivity via the public GET /api/health probe.
 *
 * `status` is one of:
 *   - 'checking' — first probe (or a manual re-probe) is in flight
 *   - 'online'   — the backend answered
 *   - 'offline'  — the backend could not be reached
 *
 * `check()` re-runs the probe (from a retry button) and returns whether the
 * backend is reachable. The mount probe uses an async IIFE with an `active`
 * guard so it never calls setState synchronously (or after unmount).
 */
export function useBackendHealth() {
  const [status, setStatus] = useState('checking')

  const probe = useCallback(async () => {
    try {
      await checkHealth()
      setStatus('online')
      return true
    } catch {
      setStatus('offline')
      return false
    }
  }, [])

  // Initial connectivity probe on mount.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await checkHealth()
        if (active) setStatus('online')
      } catch {
        if (active) setStatus('offline')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Manual re-probe from the retry button — shows the checking state.
  const check = useCallback(async () => {
    setStatus('checking')
    return probe()
  }, [probe])

  return { status, check }
}
