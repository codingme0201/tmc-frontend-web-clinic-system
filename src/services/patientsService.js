import { request } from './api'

export async function fetchPatients({ search = '', status = '' } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status && status !== 'All') params.set('status', status)
  const qs = params.toString()
  const res = await request(`/patients${qs ? '?' + qs : ''}`)
  return res.data
}

export async function fetchPatient(id) {
  const res = await request(`/patients/${id}`)
  return res.data
}

export async function fetchPatientMedicalInfo(id) {
  const res = await request(`/patients/${id}/medical-information`)
  return res.data
}

export async function fetchPatientRecordHistory(id) {
  const res = await request(`/patients/${id}/record-history`)
  return res.data
}

export async function updatePatientStatus(id, status) {
  const res = await request(`/patients/${id}/status`, { method: 'PATCH', body: { status } })
  return res.data
}

export async function createPatient(payload) {
  const res = await request('/patients', { method: 'POST', body: payload })
  return res.data
}

export const patientsService = {
  fetchPatients,
  fetchPatient,
  fetchPatientMedicalInfo,
  fetchPatientRecordHistory,
  updatePatientStatus,
  createPatient,
}
