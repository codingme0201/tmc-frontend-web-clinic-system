// Staff schedule data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch staff schedules with optional filters. */
export async function fetchStaffSchedules({ search = '', role = '', status = '', date = '', userId = '' } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (role && role !== 'All') params.set('role', role)
  if (status && status !== 'All') params.set('status', status)
  if (date) params.set('date', date)
  if (userId) params.set('user_id', userId)
  const qs = params.toString()
  const res = await request(`/staff-schedules${qs ? `?${qs}` : ''}`)
  return res.data
}

/** Fetch a single staff schedule by ID. */
export async function fetchStaffSchedule(id) {
  const res = await request(`/staff-schedules/${id}`)
  return res.data
}

/** Create a new staff schedule. */
export async function createStaffSchedule(payload) {
  const res = await request('/staff-schedules', { method: 'POST', body: payload })
  return res.data
}

/** Update an existing staff schedule. */
export async function updateStaffSchedule(id, payload) {
  const res = await request(`/staff-schedules/${id}`, { method: 'PUT', body: payload })
  return res.data
}

/** Delete a staff schedule. */
export async function deleteStaffSchedule(id) {
  const res = await request(`/staff-schedules/${id}`, { method: 'DELETE' })
  return res.data
}

/** Update a schedule's availability status. */
export async function updateStaffAvailability(id, status) {
  const res = await request(`/staff-schedules/${id}/availability`, { method: 'PATCH', body: { status } })
  return res.data
}

/** Fetch eligible staff members (doctors and nurses) for schedule assignment. */
export async function fetchEligibleStaff() {
  const res = await request('/staff-schedules/eligible-staff')
  return res.data
}

export const staffSchedulesService = {
  fetchStaffSchedules,
  fetchStaffSchedule,
  createStaffSchedule,
  updateStaffSchedule,
  deleteStaffSchedule,
  updateStaffAvailability,
  fetchEligibleStaff,
}
