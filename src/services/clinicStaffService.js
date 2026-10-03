// Medical staff directory and professional credentials — Laravel REST API.

import { request } from './api'

export async function fetchClinicStaff() {
  const res = await request('/clinic-staff')
  return res.data
}

export async function fetchClinicStaffMember(id) {
  const res = await request(`/clinic-staff/${id}`)
  return res.data
}

export async function fetchMyStaffProfile() {
  const res = await request('/me/staff-profile')
  return res.data
}

/** A doctor/nurse updates their own profile and license details. */
export async function updateMyStaffProfile(payload) {
  const res = await request('/me/staff-profile', { method: 'PUT', body: payload })
  return res.data
}

/** An administrator updates a staff member's profile and license details. */
export async function updateStaffProfile(id, payload) {
  const res = await request(`/clinic-staff/${id}/profile`, { method: 'PUT', body: payload })
  return res.data
}

/** An administrator marks the submitted credentials Verified or Rejected. */
export async function verifyCredentials(id, { status, notes = '' }) {
  const res = await request(`/clinic-staff/${id}/verify`, { method: 'POST', body: { status, notes } })
  return res.data
}

export const clinicStaffService = {
  fetchClinicStaff,
  fetchClinicStaffMember,
  fetchMyStaffProfile,
  updateMyStaffProfile,
  updateStaffProfile,
  verifyCredentials,
}
