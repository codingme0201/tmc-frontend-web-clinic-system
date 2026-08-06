// Clinical consultation records data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch all consultations, newest first. */
export async function fetchConsultations() {
  const res = await request('/consultations')
  return res.data
}

/**
 * Log a new consultation. The backend accepts both the full shape and the
 * legacy shape submitted by the Dashboard's "Log Consultation" form
 * (symptoms/vitals.bp/temp/pulse) and normalizes it server-side.
 */
export async function createConsultation(payload) {
  const res = await request('/consultations', { method: 'POST', body: payload })
  return res.data
}

/** Moves a Scheduled consultation into In Progress. */
export async function startConsultation(id) {
  const res = await request(`/consultations/${id}/start`, { method: 'POST' })
  return res.data
}

/** Persists draft consultation information (chief complaint, vitals, etc.). */
export async function updateConsultation(id, patch) {
  const res = await request(`/consultations/${id}`, { method: 'PATCH', body: patch })
  return res.data
}

/** Marks a consultation as Completed, persisting any final recorded data. */
export async function completeConsultation(id, finalData = {}) {
  const res = await request(`/consultations/${id}/complete`, { method: 'POST', body: finalData })
  return res.data
}

export const consultationsService = {
  fetchConsultations,
  createConsultation,
  startConsultation,
  updateConsultation,
  completeConsultation,
}
