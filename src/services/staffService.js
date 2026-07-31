// Medical staff roster data access. Mock-backed; swap for REST calls later.

import { delay } from './api'
import { medicalStaffToday } from '../mocks/staff'

let staffDb = medicalStaffToday.map((m) => ({ ...m }))

export async function fetchStaff() {
  await delay()
  return staffDb.map((m) => ({ ...m }))
}

export async function updateStaffStatus(name, newStatus) {
  await delay()
  const index = staffDb.findIndex((m) => m.name === name)
  if (index === -1) throw new Error('Staff member not found')
  const updated = { ...staffDb[index], status: newStatus }
  staffDb[index] = updated
  return { ...updated }
}

export const staffService = {
  fetchStaff,
  updateStaffStatus,
}
