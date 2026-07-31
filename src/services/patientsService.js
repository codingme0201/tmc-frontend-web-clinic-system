// Patient registry data access. Mock-backed; swap for REST calls later.

import { delay } from './api'
import { mockPatients } from '../mocks/patients'

let patientsDb = mockPatients.map((p) => ({ ...p }))

export async function fetchPatients() {
  await delay()
  return patientsDb.map((p) => ({ ...p }))
}

export async function createPatient(payload) {
  await delay()
  const patient = { ...payload, status: 'Active' }
  patientsDb = [...patientsDb, patient]
  return { ...patient }
}

export const patientsService = {
  fetchPatients,
  createPatient,
}
