// Shared data-layer utilities.
//
// THIS MODULE IS THE SEAM between mock data and a real REST backend:
//  - Hooks call service functions and know nothing about fetch/mock data.
//  - Services currently resolve with mock data after a simulated latency.
//  - To go live, replace each service implementation with real fetch()
//    calls (or a generated client) — hooks and pages stay untouched.
//
// Authentication (Phase 1) already uses the real Laravel REST API through
// `request()` below; the domain services can be migrated the same way.

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_STORAGE_KEY = 'tmc_token'

const LATENCY_MS = 300 // simulated network round-trip

/** Simulated network latency for mock services. */
export function delay(ms = LATENCY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Error thrown by the data layer with an optional HTTP status code. */
export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// --- Auth token persistence (localStorage) --------------------------------

/** Read the persisted Sanctum bearer token, if any. */
export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

/** Persist (or clear, when `token` is null/empty) the bearer token. */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

/** Remove the persisted bearer token. */
export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

/**
 * JSON request helper for the Laravel REST API.
 *
 * Attaches the stored bearer token when present, always requests JSON, and
 * throws an `ApiError` carrying the server-provided message for non-2xx
 * responses so callers can surface useful errors (e.g. invalid credentials,
 * validation failures).
 *
 * @param {string} path API path relative to the base (e.g. '/login').
 * @param {{ method?: string, body?: Object, headers?: Object }} [options]
 * @returns {Promise<any>} Parsed JSON body.
 */
export async function request(path, { method = 'GET', body, headers } = {}) {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data?.message ??
      (data?.errors ? 'Please check the information you entered.' : `Request failed (${response.status}).`)
    const error = new ApiError(message, response.status)
    error.data = data
    throw error
  }

  return data
}
