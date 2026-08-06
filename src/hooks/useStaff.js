import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { staffService } from '../services/staffService'

/**
 * Medical staff store — instantiated once by AppProvider so every page
 * shares the same data. Backed by TanStack Query (same pattern as the
 * appointments store):
 *   - `useQuery(['staff'])` loads the roster from the Laravel API.
 *   - `updateStaffStatus` calls the API and invalidates the list so the
 *     UI refreshes from the server.
 * `isRefetching` lets pages show a subtle indicator when a background
 * refetch runs without hiding the existing content.
 */
export function useStaffStore({ onLog } = {}) {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['staff'],
    queryFn: staffService.fetchStaff,
  })

  const statusMutation = useMutation({
    mutationFn: ({ name, status }) => staffService.updateStaffStatus(name, status),
    onSuccess: (updated, { name, status }) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      onLogRef.current?.(`Updated status of ${name} to: ${status}`)
    },
  })

  const updateStaffStatus = useCallback(
    async (name, newStatus) => statusMutation.mutateAsync({ name, status: newStatus }),
    [statusMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    updateStaffStatus,
  }
}

/** Public hook — pages call this on mount (page-scoped fetch + app-level audit log). */
export function useStaff() {
  const { log } = useAppContext()
  return useStaffStore({ onLog: log })
}
