import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { activityLogsService } from '../services/activityLogsService'

/**
 * Audit logs store — fetches filtered audit log data from the API.
 * Used by the dedicated Audit Logs page.
 */
export function useAuditLogsStore() {
  const [filters, setFilters] = useState({ search: '', module: '', user: '', from: '', to: '', clinical: false })

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => activityLogsService.fetchAuditLogs(filters),
  })

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ search: '', module: '', user: '', from: '', to: '', clinical: false })
  }, [])

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    filters,
    updateFilter,
    resetFilters,
  }
}

/** Public hook — returns the audit logs store. */
export function useAuditLogs() {
  return useAuditLogsStore()
}
