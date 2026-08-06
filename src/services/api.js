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
export async function request(path, { method = 'GET', body, headers } = {}) {
  try {
    const response = await http.request({ url: path, method, data: body, headers })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0
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
