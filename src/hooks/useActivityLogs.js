import { useCallback, useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppContext } from '../context/AppContext'
import { activityLogsService } from '../services/activityLogsService'

/**
 * Activity/audit log store — instantiated once by AppProvider so every page
 * shares the same data. Backed by TanStack Query:
 *   - `useQuery(['activity-logs'])` loads the audit trail from the API.
 *   - `addActivityLog` (used by every other store's `onLog`) posts the entry
 *     and invalidates the list so the trail refreshes from the server.
 */
export function useActivityLogsStore() {
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: activityLogsService.fetchActivityLogs,
  })

  const addMutation = useMutation({
    mutationFn: activityLogsService.addActivityLog,
    onSuccess: (entry) => {
      // Optimistic prepend keeps the audit trail feeling instant (the same
      // behaviour the old useResource store had), then a background
      // invalidation reconciles with the server.
      queryClient.setQueryData(['activity-logs'], (prev) => [entry, ...(prev || [])])
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] })
    },
  })

  const addActivityLog = useCallback(
    async (action) => addMutation.mutateAsync(action),
    [addMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    addActivityLog,
  }
}

/** Public hook — returns the shared activity log store. */
export function useActivityLogs() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useActivityLogs must be used within an AppProvider')
  return context.activityLogs
}
