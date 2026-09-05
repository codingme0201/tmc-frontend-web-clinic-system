// User management data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch all users, with optional search, role, and status filters. */
export async function fetchUsers({ search = '', role = '', status = '' } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (role && role !== 'All') params.set('role', role)
  if (status && status !== 'All') params.set('status', status)
  const qs = params.toString()
  const res = await request(`/users${qs ? `?${qs}` : ''}`)
  return res.data
}

/** Fetch a single user by ID. */
export async function fetchUser(id) {
  const res = await request(`/users/${id}`)
  return res.data
}

/** Create a new user account. */
export async function createUser(payload) {
  const res = await request('/users', { method: 'POST', body: payload })
  return res.data
}

/** Update a user's account information. */
export async function updateUser(id, payload) {
  const res = await request(`/users/${id}`, { method: 'PUT', body: payload })
  return res.data
}

/** Activate or deactivate a user account. */
export async function updateUserStatus(id, status) {
  const res = await request(`/users/${id}/status`, { method: 'PATCH', body: { status } })
  return res.data
}

/** Assign a role to a user. */
export async function updateUserRole(id, roleId) {
  const res = await request(`/users/${id}/role`, { method: 'PATCH', body: { role_id: roleId } })
  return res.data
}

/** Reset a user's password. */
export async function resetPassword(id, password) {
  const res = await request(`/users/${id}/reset-password`, {
    method: 'POST',
    body: { password, password_confirmation: password },
  })
  return res.data
}

export const usersService = {
  fetchUsers,
  fetchUser,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserRole,
  resetPassword,
}
