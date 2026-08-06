// Shared data-layer utilities.
//
// All domain services talk to the Laravel REST API through `request()`
// below; hooks and pages only know the service function signatures.

import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_STORAGE_KEY = 'tmc_token'

/** Error thrown by the data layer with an optional HTTP status code. */
export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// --- Axios instance (the single HTTP client) ------------------------------

/**
 * Shared axios instance for the Laravel REST API.
 *
 * Centralises the base URL and the bearer-token header (see the request
 * interceptor below), so services only describe the path, method and body.
 * `request()` unwraps `response.data` for callers.
 */
export const http = axios.create({
  baseURL: API_BASE,
  headers: { Accept: 'application/json' },
})

// Attach the persisted Sanctum bearer token to every outgoing request.
http.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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
 * Connectivity probe against the Laravel backend (GET /api/health).
 *
 * Resolves when the API answers; rejects on network failure or proxy errors
 * so callers can surface a clear "backend offline" message. Uses a short
 * timeout and deliberately bypasses the `request()` retry loop — this is a
 * quick status probe, not a data fetch.
 */
export async function checkHealth() {
  const response = await http.get('/health', { timeout: 4000 })
  return response.data
}

/**
 * JSON request helper for the Laravel REST API.
 *
 * Built on the shared axios instance: the stored bearer token is attached by
 * an interceptor, requests always ask for JSON, and non-2xx responses are
 * thrown as an `ApiError` carrying the server-provided message so callers can
 * surface useful errors (e.g. invalid credentials, validation failures).
 *
 * @param {string} path API path relative to the base (e.g. '/login').
 * @param {{ method?: string, body?: Object, headers?: Object }} [options]
 * @returns {Promise<any>} Parsed JSON body.
 */
// Upstream failures that are safe to retry silently: 502/503/504 (the Vite
// proxy surfaces these when PHP's single-threaded dev server briefly drops a
// connection under a burst of parallel requests) and network errors (status 0,
// e.g. ECONNRESET) which carry no server response at all.
const RETRYABLE_STATUS = new Set([502, 503, 504])

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * JSON request helper for the Laravel REST API.
 *
 * Built on the shared axios instance: the stored bearer token is attached by
 * an interceptor, requests always ask for JSON, and non-2xx responses are
 * thrown as an `ApiError` carrying the server-provided message so callers can
 * surface useful errors (e.g. invalid credentials, validation failures).
 *
 * Idempotent requests (GET/HEAD/OPTIONS — the page-load data fetches) retry
 * transient 502/503/504 and network failures twice with a short backoff, so
 * a momentary backend hiccup resolves without the user having to retry
 * manually. Mutations are never retried (a duplicate side effect is worse
 * than a surfaced error).
 *
 * @param {string} path API path relative to the base (e.g. '/login').
 * @param {{ method?: string, body?: Object, headers?: Object }} [options]
 * @returns {Promise<any>} Parsed JSON body.
 */
export async function request(path, { method = 'GET', body, headers } = {}) {
  const isIdempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
  const maxRetries = isIdempotent ? 2 : 0

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await http.request({ url: path, method, data: body, headers })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 0
        const retryable = status === 0 || RETRYABLE_STATUS.has(status)
        if (attempt < maxRetries && retryable) {
          await delay(attempt === 0 ? 400 : 900)
          continue
        }

        const data = error.response?.data
        // Network failures have no response; surface axios's own message
        // (e.g. "Network Error") instead of a cryptic status code.
        const message =
          data?.message ??
          (data?.errors
            ? 'Please check the information you entered.'
            : status > 0
              ? `Request failed (${status}).`
              : error.message)
        const apiError = new ApiError(message, status)
        apiError.data = data
        throw apiError
      }
      throw error
    }
  }
}
