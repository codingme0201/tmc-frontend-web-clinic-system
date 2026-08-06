import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { consultationsService } from '../services/consultationsService'

/**
 * Consultation store — instantiated once by AppProvider so every page shares
 * the same data. Backed by TanStack Query (same pattern as useAppointments):
 *   - `useQuery(['consultations'])` loads the list from the Laravel API.
 *   - Each mutation (create / start / save / complete) calls the API, logs
 *     the action, and invalidates the list so the UI refreshes from the
 *     server.
 * `onLog` keeps the shared activity/audit log in sync (mirrors a
 * server-side audit trail).
 */
export function useConsultationsStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  // Scoped query key (see useAppointments): the dashboard keeps its own view
  // so module pages fetch fresh on open and show their skeleton.
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['consultations', scope],
    queryFn: consultationsService.fetchConsultations,
  })

  const createMutation = useMutation({
    mutationFn: consultationsService.createConsultation,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] })
      onLogRef.current?.(
        `Logged clinical consultation for patient ${created.patient} - Diagnosis: ${created.diagnosis}`,
      )
    },
  })

  const startMutation = useMutation({
    mutationFn: consultationsService.startConsultation,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] })
      onLogRef.current?.(`Started consultation ${updated.reference} for patient ${updated.patient}`)
    },
  })

  const saveMutation = useMutation({
    mutationFn: ({ id, patch }) => consultationsService.updateConsultation(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, finalData }) => consultationsService.completeConsultation(id, finalData),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] })
      onLogRef.current?.(
        `Completed consultation ${updated.reference} for patient ${updated.patient} - Diagnosis: ${updated.diagnosis}`,
      )
    },
  })

  const addConsultation = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  const startConsultation = useCallback(
    async (id) => startMutation.mutateAsync(id),
    [startMutation],
  )

  const saveConsultation = useCallback(
    async (id, patch) => saveMutation.mutateAsync({ id, patch }),
    [saveMutation],
  )

  const completeConsultation = useCallback(
    async (id, finalData) => completeMutation.mutateAsync({ id, finalData }),
    [completeMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    addConsultation,
    startConsultation,
    saveConsultation,
    completeConsultation,
  }
}

/**
 * Public hook — pages call this on mount (page-scoped fetch + app-level
 * audit log). Returns { data, isLoading, error, refetch, isRefetching,
 * addConsultation, startConsultation, saveConsultation, completeConsultation }.
 */
export function useConsultations(scope = 'page') {
  const { log } = useAppContext()
  return useConsultationsStore({ onLog: log }, scope)
}
