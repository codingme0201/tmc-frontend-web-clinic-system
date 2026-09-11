import { request } from './api'

function buildQueryString(params) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      qs.set(key, value)
    }
  })
  const str = qs.toString()
  return str ? `?${str}` : ''
}

export async function fetchAppointmentReport(filters = {}) {
  const data = await request(`/reports/appointments${buildQueryString(filters)}`)
  return data
}

export async function fetchConsultationReport(filters = {}) {
  const data = await request(`/reports/consultations${buildQueryString(filters)}`)
  return data
}

export async function fetchPatientReport(filters = {}) {
  const data = await request(`/reports/patients${buildQueryString(filters)}`)
  return data
}

export async function fetchMedicalCertificateReport(filters = {}) {
  const data = await request(`/reports/medical-certificates${buildQueryString(filters)}`)
  return data
}

export async function fetchPrescriptionReport(filters = {}) {
  const data = await request(`/reports/prescriptions${buildQueryString(filters)}`)
  return data
}

export async function fetchStatistics(filters = {}) {
  const data = await request(`/reports/statistics${buildQueryString(filters)}`)
  return data
}

export async function exportReport(type, filters = {}) {
  const data = await request(`/reports/export/${type}${buildQueryString(filters)}`)
  return data
}

export const reportsService = {
  fetchAppointmentReport,
  fetchConsultationReport,
  fetchPatientReport,
  fetchMedicalCertificateReport,
  fetchPrescriptionReport,
  fetchStatistics,
  exportReport,
}
