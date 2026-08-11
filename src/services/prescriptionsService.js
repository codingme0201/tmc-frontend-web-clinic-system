// Prescriptions data access — backed by the Laravel REST API.

import { request } from './api'
//
// The index endpoint is server-side searched, filtered, and paginated: every
// supported query param (search text, patient filter, date filter, page, page
// size) is reflected in the request so search and pagination state survive
// refetches. It returns Laravel's paginated payload ({ data, meta }), which
// the store splits into rows + pagination metadata.

const DEFAULT_PAGE_SIZE = 8

/**
 * Fetch one page of prescriptions.
 *
 * @param {{ search?: string, patient?: string, date?: string, page?: number, perPage?: number }} [query]
 * @returns {Promise<{ data: Array<Object>, meta: Object|null }>}
 */
export async function fetchPrescriptions({
  search = '',
  patient = '',
  date = '',
  page = 1,
  perPage = DEFAULT_PAGE_SIZE,
} = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (patient) params.set('patient', patient)
  if (date) params.set('date', date)
  params.set('page', String(page))
  params.set('per_page', String(perPage))

  const qs = params.toString()
  const res = await request(`/prescriptions${qs ? `?${qs}` : ''}`)
  return { data: res.data ?? [], meta: res.meta ?? null }
}

/** Fetch a single prescription with its medication lines and consultation. */
export async function fetchPrescription(id) {
  const res = await request(`/prescriptions/${id}`)
  return res.data
}

/**
 * Create a prescription record. The payload uses the backend's field names
 * (patient_id, consultation_id, prescribed_by, medications[].medicine_name…)
 * so the Form Request validation and persistence actually receive the data.
 */
export async function createPrescription(payload) {
  const res = await request('/prescriptions', { method: 'POST', body: payload })
  return res.data
}

/** Update prescription information (partial update; medications replace the list). */
export async function updatePrescription(id, patch) {
  const res = await request(`/prescriptions/${id}`, { method: 'PATCH', body: patch })
  return res.data
}

export const prescriptionsService = {
  fetchPrescriptions,
  fetchPrescription,
  createPrescription,
  updatePrescription,
}
