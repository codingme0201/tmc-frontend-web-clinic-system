import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { patientsService } from '../services/patientsService'

/**
 * Patient registry store — instantiated once by AppProvider so every page
 * shares the same data. Backed by TanStack Query:
 *   - `useQuery(['patients'])` loads the registry from the Laravel API.
 *   - `addPatient` calls the API and invalidates the list so the UI
 *     refreshes from the server.
 */
export function usePatientsStore({ onLog } = {}) {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsService.fetchPatients,
  })

  const createMutation = useMutation({
    mutationFn: patientsService.createPatient,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      onLogRef.current?.(`Created new patient profile for ${created.name} (${created.type})`)
    },
  })

  const addPatient = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    addPatient,
  }
}

/** Public hook — pages call this on mount (page-scoped fetch + app-level audit log). */
export function usePatients() {
  const { log } = useAppContext()
  return usePatientsStore({ onLog: log })
}
