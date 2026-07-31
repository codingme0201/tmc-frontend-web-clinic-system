// Clinical consultation records data access. Mock-backed; swap for REST calls later.

import { delay, ApiError } from './api'
import { mockConsultations } from '../mocks/consultations'

let consultationsDb = mockConsultations.map((c) => ({ ...c }))

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function nextReference() {
  const max = consultationsDb.reduce((m, c) => {
    const num = Number(String(c.id).split('-').pop())
    return Number.isFinite(num) ? Math.max(m, num) : m
  }, 0)
  const next = String(max + 1).padStart(3, '0')
  return { id: `C-2026-${next}`, reference: `CONS-2026-${next}` }
}

function findIndex(id) {
  const index = consultationsDb.findIndex((c) => c.id === id)
  if (index === -1) throw new ApiError('Consultation not found.', 404)
  return index
}

export async function fetchConsultations() {
  await delay()
  return consultationsDb.map((c) => ({ ...c }))
}

/**
 * Creates a consultation record. Accepts both the full shape used by the
 * Consultations module and the legacy shape submitted by the Dashboard's
 * "Log Consultation" form (symptoms/vitals.bp/temp/pulse), normalizing the
 * latter into the full model.
 */
export async function createConsultation(payload) {
  await delay()
  const { id, reference } = nextReference()
  const now = `${todayISO()} ${nowTime()}`
  const consultation = {
    id,
    reference,
    date: todayISO(),
    time: nowTime(),
    status: 'Completed',
    patient: payload.patient || '',
    patientId: payload.patientId || '',
    staff: payload.staff || '',
    chiefComplaint: payload.chiefComplaint || payload.symptoms || '',
    vitals: {
      temperature: payload.vitals?.temperature || payload.vitals?.temp || '',
      bloodPressure: payload.vitals?.bloodPressure || payload.vitals?.bp || '',
      pulseRate: payload.vitals?.pulseRate || payload.vitals?.pulse || '',
      respiratoryRate: payload.vitals?.respiratoryRate || '',
      height: payload.vitals?.height || '',
      weight: payload.vitals?.weight || '',
    },
    clinicalFindings: payload.clinicalFindings || '',
    diagnosis: payload.diagnosis || '',
    treatment: payload.treatment || '',
    disposition: payload.disposition || '',
    startedAt: payload.startedAt || now,
    completedAt: payload.completedAt || now,
  }
  consultationsDb = [consultation, ...consultationsDb]
  return { ...consultation }
}

/** Moves a Scheduled consultation into In Progress. */
export async function startConsultation(id) {
  await delay()
  const index = findIndex(id)
  const current = consultationsDb[index]
  if (current.status === 'Completed') {
    throw new ApiError('Completed consultations cannot be started again.', 409)
  }
  const updated = {
    ...current,
    status: 'In Progress',
    startedAt: `${todayISO()} ${nowTime()}`,
  }
  consultationsDb[index] = updated
  return { ...updated }
}

/** Persists draft consultation information (chief complaint, vitals, etc.). */
export async function updateConsultation(id, patch) {
  await delay()
  const index = findIndex(id)
  const current = consultationsDb[index]
  if (current.status === 'Completed') {
    throw new ApiError('Completed consultations are read-only.', 409)
  }
  const updated = { ...current, ...patch }
  consultationsDb[index] = updated
  return { ...updated }
}

/** Marks a consultation as Completed, persisting any final recorded data. */
export async function completeConsultation(id, finalData = {}) {
  await delay()
  const index = findIndex(id)
  const current = consultationsDb[index]
  if (current.status === 'Completed') {
    throw new ApiError('This consultation is already completed.', 409)
  }
  const updated = {
    ...current,
    ...finalData,
    status: 'Completed',
    completedAt: `${todayISO()} ${nowTime()}`,
  }
  consultationsDb[index] = updated
  return { ...updated }
}

export const consultationsService = {
  fetchConsultations,
  createConsultation,
  startConsultation,
  updateConsultation,
  completeConsultation,
}
