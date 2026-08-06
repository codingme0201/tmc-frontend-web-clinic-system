// Patient registry data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch the patient registry. */
export async function fetchPatients() {
  const res = await request('/patients')
  return res.data
}

/** Register a new patient (form payload uses camelCase keys). */
export async function createPatient(payload) {
  const res = await request('/patients', { method: 'POST', body: payload })
  return res.data
}

export const patientsService = {
  fetchPatients,
  createPatient,
}
