// Appointment data access.
//
// Currently backed by mock data + an in-memory DB (module scope) so
// mutations persist across components for the duration of the session.
// Swap each function body for a REST call when the backend is ready —
// hooks and pages do not need to change.

import { delay } from './api'
import { mockAppointments } from '../mocks/appointments'

let appointmentsDb = mockAppointments.map((a) => ({ ...a }))

// Next reference number is derived from the existing data so it never
// collides (mimics a server-side sequence).
let nextReference = appointmentsDb.reduce((max, a) => {
  const num = Number(a.reference.split('-').pop())
  return Number.isFinite(num) ? Math.max(max, num) : max
}, 0)

export async function fetchAppointments() {
  await delay()
  return appointmentsDb.map((a) => ({ ...a }))
}

export async function createAppointment({ patient, type, reason = '', date, time, staff = '', patientId = '' }) {
  await delay()
  nextReference += 1
  const today = new Date().toISOString().split('T')[0]
  const appointment = {
    id: Date.now(),
    reference: `APT-2026-${String(nextReference).padStart(3, '0')}`,
    patient,
    patientId,
    type,
    reason: reason || type,
    date: date || today,
    time,
    staff: staff || 'Unassigned',
    status: 'Pending',
    notes: '',
    requestedOn: today,
  }
  appointmentsDb = [appointment, ...appointmentsDb]
  return { ...appointment }
}

export async function updateAppointmentStatus(id, newStatus, note = '') {
  await delay()
  const index = appointmentsDb.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('Appointment not found')
  const current = appointmentsDb[index]
  const updated = {
    ...current,
    status: newStatus,
    notes: note ? (current.notes ? `${current.notes}\n${note}` : note) : current.notes,
  }
  appointmentsDb[index] = updated
  return { ...updated }
}

export async function rescheduleAppointment(id, { date, time, note = '' }) {
  await delay()
  const index = appointmentsDb.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('Appointment not found')
  const current = appointmentsDb[index]
  const rescheduleNote = `Rescheduled from ${current.date} ${current.time} to ${date} ${time}${note ? ` — ${note}` : ''}`
  const updated = {
    ...current,
    date,
    time,
    status: 'Rescheduled',
    notes: current.notes ? `${current.notes}\n${rescheduleNote}` : rescheduleNote,
  }
  appointmentsDb[index] = updated
  return { ...updated }
}

export const appointmentsService = {
  fetchAppointments,
  createAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
}
