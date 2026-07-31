// Shared data-layer utilities.
//
// THIS MODULE IS THE SEAM between mock data and a real REST backend:
//  - Hooks call service functions and know nothing about fetch/mock data.
//  - Services currently resolve with mock data after a simulated latency.
//  - To go live, replace each service implementation with real fetch()
//    calls (or a generated client) — hooks and pages stay untouched.

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

// ---------------------------------------------------------------------------
// When a backend is ready, add a request helper here and switch the
// individual services to use it, e.g.:
//
// export async function request(path, { method = 'GET', body, headers } = {}) {
//   const response = await fetch(`/api${path}`, {
//     method,
//     headers: { 'Content-Type': 'application/json', ...headers },
//     body: body ? JSON.stringify(body) : undefined,
//   })
//   if (!response.ok) {
//     throw new ApiError(`Request failed (${response.status})`, response.status)
//   }
//   return response.json()
// }
// ---------------------------------------------------------------------------
