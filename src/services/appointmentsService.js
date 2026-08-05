// Appointment data access — backed by the Laravel REST API.
//
// The hook (useAppointments) and pages depend only on these function
// signatures, so swapping the mock data layer for real API calls needed no
// changes outside this file.

import { request } from './api'

/** Fetch all appointments (optionally filtered server-side). */
export async function fetchAppointments() {
  const data = await request('/appointments')
  return data.data
}

/** Book a new appointment. */
export async function createAppointment({ patient, type, reason = '', date, time, staff = '', patientId = '' }) {
  const { data } = await request('/appointments', {
    method: 'POST',
    body: {
      patient,
      type,
      reason: reason || type,
      date,
      time,
      staff: staff || null,
      patient_id: patientId || null,
    },
  })
  return data
}

/** Move an appointment to a new status (Review/Approve/Reject/Cancel/Complete). */
export async function updateAppointmentStatus(id, newStatus, note = '') {
  const { data } = await request(`/appointments/${id}/status`, {
    method: 'PATCH',
    body: { status: newStatus, note },
  })
  return data
}

/** Reschedule an appointment to a new date/time slot. */
export async function rescheduleAppointment(id, { date, time, note = '' }) {
  const { data } = await request(`/appointments/${id}/reschedule`, {
    method: 'POST',
    body: { date, time, note },
  })
  return data
}

export const appointmentsService = {
  fetchAppointments,
  createAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
}
