// Medical certificates data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch all medical certificates, newest issue date first. */
export async function fetchMedicalCertificates() {
  const res = await request('/medical-certificates')
  return res.data
}

/** Generate a new medical certificate (patient/consultation data reused). */
export async function createMedicalCertificate(payload) {
  const res = await request('/medical-certificates', { method: 'POST', body: payload })
  return res.data
}

/** Update certificate details (purpose, diagnosis, dates, status, etc.). */
export async function updateMedicalCertificate(id, patch) {
  const res = await request(`/medical-certificates/${id}`, { method: 'PATCH', body: patch })
  return res.data
}

/** Delete a medical certificate. */
export async function deleteMedicalCertificate(id) {
  const res = await request(`/medical-certificates/${id}`, { method: 'DELETE' })
  return res.data
}

export const medicalCertificatesService = {
  fetchMedicalCertificates,
  createMedicalCertificate,
  updateMedicalCertificate,
  deleteMedicalCertificate,
}
