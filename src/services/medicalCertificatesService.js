// Medical certificates data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch all medical certificates, newest issue date first. */
export async function fetchMedicalCertificates() {
  const res = await request('/medical-certificates')
  return res.data
}

/** Submit a new medical certificate request (created as Pending). */
export async function createMedicalCertificate(payload) {
  const res = await request('/medical-certificates', { method: 'POST', body: payload })
  return res.data
}

/** Approve a pending certificate request. */
export async function approveMedicalCertificate(id) {
  const res = await request(`/medical-certificates/${id}/approve`, { method: 'POST' })
  return res.data
}

/** Reject a pending certificate request with an optional reason. */
export async function rejectMedicalCertificate(id, reason = '') {
  const res = await request(`/medical-certificates/${id}/reject`, { method: 'POST', body: { rejection_reason: reason } })
  return res.data
}

/** Issue an approved certificate (optionally finalizing issuer/date). */
export async function issueMedicalCertificate(id, payload = {}) {
  const res = await request(`/medical-certificates/${id}/issue`, { method: 'POST', body: payload })
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
  approveMedicalCertificate,
  rejectMedicalCertificate,
  issueMedicalCertificate,
  updateMedicalCertificate,
  deleteMedicalCertificate,
}
