// Medical staff roster data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch today's staff roster. */
export async function fetchStaff() {
  const res = await request('/staff')
  return res.data
}

/** Update a staff member's duty status (On duty / Break / Off duty). */
export async function updateStaffStatus(name, newStatus) {
  const res = await request('/staff/status', { method: 'PATCH', body: { name, status: newStatus } })
  return res.data
}

export const staffService = {
  fetchStaff,
  updateStaffStatus,
}
