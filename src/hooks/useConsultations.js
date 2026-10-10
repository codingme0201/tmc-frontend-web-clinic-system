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
export function useConsultationsStore({ onLog, enabled = true } = {}, scope = 'page') {
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
    enabled,
  })

  // Consultation changes also move the queue and the linked appointments.
  const invalidateLinked = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['consultations'] })
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
    queryClient.invalidateQueries({ queryKey: ['queue'] })
  }, [queryClient])

  const createMutation = useMutation({
    mutationFn: consultationsService.createConsultation,
    onSuccess: (created) => {
      invalidateLinked()
      onLogRef.current?.(
        `Logged clinical consultation for patient ${created.patient} - Diagnosis: ${created.diagnosis}`,
      )
    },
  })

  const startMutation = useMutation({
    mutationFn: consultationsService.startConsultation,
    onSuccess: (updated) => {
      invalidateLinked()
      onLogRef.current?.(`Started consultation ${updated.reference} for patient ${updated.patient}`)
    },
  })

  const saveMutation = useMutation({
    mutationFn: ({ id, patch }) => consultationsService.updateConsultation(id, patch),
    onSuccess: (updated) => {
      invalidateLinked()
      onLogRef.current?.(`Updated consultation ${updated.reference} for patient ${updated.patient}`)
    },
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, finalData }) => consultationsService.completeConsultation(id, finalData),
    onSuccess: (updated) => {
      invalidateLinked()
      onLogRef.current?.(
        `Completed consultation ${updated.reference} for patient ${updated.patient} - Diagnosis: ${updated.diagnosis}`,
      )
    },
  })

  const followUpMutation = useMutation({
    mutationFn: ({ id, payload }) => consultationsService.scheduleFollowUp(id, payload),
    onSuccess: (updated) => {
      invalidateLinked()
      onLogRef.current?.(
        `Scheduled follow-up ${updated.followUpAppointment?.reference ?? ''} for ${updated.patient} from ${updated.reference}`,
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (consultation) => consultationsService.deleteConsultation(consultation.id),
    onSuccess: (_, consultation) => {
      invalidateLinked()
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['medical-certificates'] })
      onLogRef.current?.(`Deleted consultation ${consultation.reference} for patient ${consultation.patient}`)
    },
  })

  const deleteConsultation = useCallback(
    async (consultation) => deleteMutation.mutateAsync(consultation),
    [deleteMutation],
  )

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

  const scheduleFollowUp = useCallback(
    async (id, payload) => followUpMutation.mutateAsync({ id, payload }),
    [followUpMutation],
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
    scheduleFollowUp,
    deleteConsultation,
  }
}

/**
 * Public hook — pages call this on mount (page-scoped fetch + app-level
 * audit log). Returns { data, isLoading, error, refetch, isRefetching,
 * addConsultation, startConsultation, saveConsultation, completeConsultation,
 * scheduleFollowUp }. Pass `{ enabled: false }` when the user cannot view consultations.
 */
export function useConsultations(scope = 'page', { enabled = true } = {}) {
  const { log } = useAppContext()
  return useConsultationsStore({ onLog: log, enabled }, scope)
}
