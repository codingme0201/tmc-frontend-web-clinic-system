import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { appointmentsService } from '../services/appointmentsService'

/**
 * Appointment store — instantiated once by AppProvider so every page shares
 * the same data. Backed by TanStack Query:
 *   - `useQuery(['appointments'])` loads the list from the Laravel API.
 *   - Each mutation (create / status / reschedule) calls the API, logs the
 *     action, and invalidates the list so the UI refreshes from the server.
 * `onLog` keeps the shared activity/audit log in sync (mirrors a
 * server-side audit trail).
 */
export function useAppointmentsStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  // Scoped query key: the dashboard and the module page keep separate views
  // of the same data, so opening the module is a fresh fetch (its skeleton
  // shows) instead of reading the dashboard's warmed cache. Mutations
  // invalidate the `['appointments']` prefix, which refreshes both copies.
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['appointments', scope],
    queryFn: appointmentsService.fetchAppointments,
  })

  const createMutation = useMutation({
    mutationFn: appointmentsService.createAppointment,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onLogRef.current?.(`Booked new ${created.type} appointment for ${created.patient} at ${created.time}`)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, note }) => appointmentsService.updateAppointmentStatus(id, status, note),
    onSuccess: (updated, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onLogRef.current?.(`Updated appointment ${updated.reference} (${updated.patient}) to: ${status}`)
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, date, time, note }) =>
      appointmentsService.rescheduleAppointment(id, { date, time, note }),
    onSuccess: (updated, { date, time }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onLogRef.current?.(`Rescheduled appointment ${updated.reference} (${updated.patient}) to ${date} ${time}`)
    },
  })

  const createAppointment = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  const updateStatus = useCallback(
    async (id, status, note = '') => statusMutation.mutateAsync({ id, status, note }),
    [statusMutation],
  )

  const reschedule = useCallback(
    async (id, { date, time, note = '' }) => rescheduleMutation.mutateAsync({ id, date, time, note }),
    [rescheduleMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    createAppointment,
    updateStatus,
    reschedule,
  }
}

/**
 * Public hook — pages call this on mount. The query is page-scoped (data
 * fetches when the page opens, so its skeleton shows on first load, exactly
 * like the Roles & Permissions page), while the shared React Query cache
 * keeps revisits instant. Mutations route their audit activity through the
 * app-level `log`.
 * Returns { data, isLoading, error, refetch, isRefetching, createAppointment, updateStatus, reschedule }.
 */
export function useAppointments(scope = 'page') {
  const { log } = useAppContext()
  return useAppointmentsStore({ onLog: log }, scope)
}
