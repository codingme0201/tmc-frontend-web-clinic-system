// Authentication API access (Phase 1 — Laravel + Sanctum).

import { request } from './api'

/** Authenticate with email/password; resolves to `{ token, user }`. */
export async function login(credentials) {
  return request('/login', { method: 'POST', body: credentials })
}

/** Revoke the current token on the server. */
export async function logout() {
  return request('/logout', { method: 'POST' })
}

/** Fetch the currently authenticated user. */
export async function fetchCurrentUser() {
  return request('/user')
}

export const authService = {
  login,
  logout,
  fetchCurrentUser,
}
