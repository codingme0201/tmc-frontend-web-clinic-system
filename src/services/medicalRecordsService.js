// Patient medical records data access — backed by the Laravel REST API.
//
// Every mutation returns the full updated record (children included), which
// is exactly what the medical records store hook expects to apply back.

import { request } from './api'

/** Fetches all medical records with their clinical child sections. */
export async function fetchMedicalRecords() {
  const res = await request('/medical-records')
  return res.data
}

// ---------- Medical conditions ----------

export async function addCondition(recordId, payload) {
  const res = await request(`/medical-records/${recordId}/conditions`, {
    method: 'POST',
    body: payload,
  })
  return res.data
}

export async function updateCondition(recordId, conditionId, patch) {
  const res = await request(`/medical-records/${recordId}/conditions/${conditionId}`, {
    method: 'PATCH',
    body: patch,
  })
  return res.data
}

export async function removeCondition(recordId, conditionId) {
  const res = await request(`/medical-records/${recordId}/conditions/${conditionId}`, {
    method: 'DELETE',
  })
  return res.data
}

// ---------- Allergies ----------

export async function addAllergy(recordId, payload) {
  const res = await request(`/medical-records/${recordId}/allergies`, {
    method: 'POST',
    body: payload,
  })
  return res.data
}

export async function updateAllergy(recordId, allergyId, patch) {
  const res = await request(`/medical-records/${recordId}/allergies/${allergyId}`, {
    method: 'PATCH',
    body: patch,
  })
  return res.data
}

export async function removeAllergy(recordId, allergyId) {
  const res = await request(`/medical-records/${recordId}/allergies/${allergyId}`, {
    method: 'DELETE',
  })
  return res.data
}

export const medicalRecordsService = {
  fetchMedicalRecords,
  addCondition,
  updateCondition,
  removeCondition,
  addAllergy,
  updateAllergy,
  removeAllergy,
}
