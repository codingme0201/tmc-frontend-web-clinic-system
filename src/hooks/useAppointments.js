import { useCallback, useContext, useEffect, useRef } from 'react'
import { AppContext } from '../context/AppContext'
import { appointmentsService } from '../services/appointmentsService'
import { useResource } from './useResource'

/**
 * Appointment store — instantiated once by AppProvider so every page shares
 * the same data. `onLog` is called after successful mutations so the shared
 * activity/audit log stays in sync (mirrors a server-side audit trail).
 */
export function useAppointmentsStore({ onLog } = {}) {
  const { data, setData, isLoading, error, refetch } = useResource(appointmentsService.fetchAppointments)

  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const createAppointment = useCallback(
    async (payload) => {
      const created = await appointmentsService.createAppointment(payload)
      setData((prev) => [created, ...(prev || [])])
      onLogRef.current?.(`Booked new ${created.type} appointment for ${created.patient} at ${created.time}`)
      return created
    },
    [setData],
  )

  const updateStatus = useCallback(
    async (id, newStatus, note = '') => {
      const updated = await appointmentsService.updateAppointmentStatus(id, newStatus, note)
      setData((prev) => (prev || []).map((a) => (a.id === id ? updated : a)))
      onLogRef.current?.(`Updated appointment ${updated.reference} (${updated.patient}) to: ${newStatus}`)
      return updated
    },
    [setData],
  )

  const reschedule = useCallback(
    async (id, { date, time, note = '' }) => {
      const updated = await appointmentsService.rescheduleAppointment(id, { date, time, note })
      setData((prev) => (prev || []).map((a) => (a.id === id ? updated : a)))
      onLogRef.current?.(`Rescheduled appointment ${updated.reference} (${updated.patient}) to ${date} ${time}`)
      return updated
    },
    [setData],
  )

  return { data: data || [], isLoading, error, refetch, createAppointment, updateStatus, reschedule }
}

/**
 * Public hook — pages consume the shared appointment store through context.
 * Returns { data, isLoading, error, refetch, createAppointment, updateStatus, reschedule }.
 */
export function useAppointments() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppointments must be used within an AppProvider')
  return context.appointments
}
