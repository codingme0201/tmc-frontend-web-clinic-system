// Medical staff roster data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch today's duty roster (doctors/nurses with today's shifts). */
export async function fetchStaff() {
  const res = await request('/staff')
  return res.data
}

/** Update a staff member's duty status (On duty / Break / Off duty). */
export async function updateStaffStatus(name, newStatus, userId = null) {
  const res = await request('/staff/status', { method: 'PATCH', body: { name, status: newStatus, user_id: userId } })
  return res.data
}

export const staffService = {
  fetchStaff,
  updateStaffStatus,
}
