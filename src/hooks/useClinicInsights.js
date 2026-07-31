import { useCallback, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { insightsService } from '../services/insightsService'
import { useResource } from './useResource'

/** Static dashboard charts store (activity bars + peak hours) — once per app. */
export function useClinicInsightsStore() {
  const fetcher = useCallback(async () => {
    const [clinicActivity, peakHours] = await Promise.all([
      insightsService.fetchClinicActivity(),
      insightsService.fetchPeakHours(),
    ])
    return { clinicActivity, peakHours }
  }, [])

  const { data, isLoading, error, refetch } = useResource(fetcher)
  return { data, isLoading, error, refetch }
}

/** Public hook — returns { data: { clinicActivity, peakHours }, isLoading, error, refetch }. */
export function useClinicInsights() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useClinicInsights must be used within an AppProvider')
  return context.clinicInsights
}
