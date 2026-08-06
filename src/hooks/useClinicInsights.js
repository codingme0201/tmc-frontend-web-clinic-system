import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { insightsService } from '../services/insightsService'

/**
 * Static dashboard charts store (activity bars + peak hours) — once per app.
 * Backed by TanStack Query: both insight endpoints are fetched together and
 * cached under one key, so the dashboard keeps the previous chart data
 * visible during background refetches.
 */
export function useClinicInsightsStore() {
  const fetcher = useCallback(async () => {
    const [clinicActivity, peakHours] = await Promise.all([
      insightsService.fetchClinicActivity(),
      insightsService.fetchPeakHours(),
    ])
    return { clinicActivity, peakHours }
  }, [])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-insights'],
    queryFn: fetcher,
  })

  return { data, isLoading, error: error?.message ?? null, refetch, isRefetching }
}

/** Public hook — pages call this on mount (page-scoped fetch). Returns { data: { clinicActivity, peakHours }, isLoading, error, refetch, isRefetching }. */
export function useClinicInsights() {
  return useClinicInsightsStore()
}
