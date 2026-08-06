import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { eventsService } from '../services/eventsService'

/**
 * Campus events store — instantiated once by AppProvider so every page
 * shares the same data. Backed by TanStack Query:
 *   - `useQuery(['events'])` loads the calendar from the Laravel API.
 *   - `addEvent` calls the API and invalidates the list so the UI
 *     refreshes from the server.
 */
export function useClinicEventsStore({ onLog } = {}) {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['events'],
    queryFn: eventsService.fetchEvents,
  })

  const createMutation = useMutation({
    mutationFn: eventsService.createEvent,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      onLogRef.current?.(`Scheduled new clinic event: ${created.title}`)
    },
  })

  const addEvent = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    addEvent,
  }
}

/** Public hook — pages call this on mount (page-scoped fetch + app-level audit log). */
export function useClinicEvents() {
  const { log } = useAppContext()
  return useClinicEventsStore({ onLog: log })
}
