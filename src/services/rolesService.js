// Roles & Permissions module API access (Module 2 — Laravel backend).

import { request } from './api'

export async function fetchRoles() {
  const res = await request('/roles')
  return res.data
}

export async function fetchRole(id) {
  const res = await request(`/roles/${id}`)
  return res.data
}

export async function fetchPermissions() {
  const res = await request('/permissions')
  return res.data
}

export async function createRole(payload) {
  const res = await request('/roles', { method: 'POST', body: payload })
  return res.data
}

export async function updateRole(id, payload) {
  const res = await request(`/roles/${id}`, { method: 'PUT', body: payload })
  return res.data
}

export async function deleteRole(id) {
  await request(`/roles/${id}`, { method: 'DELETE' })
}

export async function updateRolePermissions(id, permissionIds) {
  const res = await request(`/roles/${id}/permissions`, {
    method: 'PUT',
    body: { permissions: permissionIds },
  })
  return res.data
}

export const rolesService = {
  fetchRoles,
  fetchRole,
  fetchPermissions,
  createRole,
  updateRole,
  deleteRole,
  updateRolePermissions,
}
