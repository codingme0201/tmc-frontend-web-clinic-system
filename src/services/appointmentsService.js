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

/** Book a new appointment (assigned doctor by user ID, visit type, follow-up source). */
export async function createAppointment({
  patient,
  type,
  reason = '',
  date,
  time,
  staffId = null,
  patientId = '',
  visitType = '',
  previousConsultationId = null,
}) {
  const { data } = await request('/appointments', {
    method: 'POST',
    body: {
      patient,
      type,
      reason: reason || type,
      date,
      time,
      staff_id: staffId || null,
      patient_id: patientId || null,
      visit_type: visitType || null,
      previous_consultation_id: previousConsultationId || null,
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

/** Assign (staffId) or unassign (null) the doctor/nurse for an appointment. */
export async function assignAppointmentStaff(id, staffId) {
  const { data } = await request(`/appointments/${id}/assign`, {
    method: 'PATCH',
    body: { staff_id: staffId || null },
  })
  return data
}

/** A patient's completed consultations, to link a follow-up visit. */
export async function fetchFollowUpOptions(patientId) {
  const res = await request(`/appointments/follow-up-options?patient_id=${encodeURIComponent(patientId)}`)
  return res.data
}

export const appointmentsService = {
  fetchAppointments,
  createAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  assignAppointmentStaff,
  fetchFollowUpOptions,
}
