// Campus health events & Clinic Calendar data access — backed by the Laravel REST API.

import { request } from './api'

// --- Legacy Dashboard endpoints (kept for backward compatibility) ---

/** Fetch upcoming campus health events (Dashboard widget). */
export async function fetchEvents() {
  const res = await request('/events')
  return res.data
}

/** Schedule a new campus health event (Dashboard widget). */
export async function createEvent(payload) {
  const res = await request('/events', { method: 'POST', body: payload })
  return res.data
}

// --- Clinic Calendar endpoints ---

/** Fetch aggregated calendar data for a date range. */
export async function fetchCalendarData({ start, end } = {}) {
  const params = new URLSearchParams()
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  const qs = params.toString()
  const res = await request(`/calendar${qs ? `?${qs}` : ''}`)
  return res.data
}

/** Fetch clinic events with optional filters. */
export async function fetchCalendarEvents({ search = '', type = '', status = '' } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (type && type !== 'All') params.set('type', type)
  if (status && status !== 'All') params.set('status', status)
  const qs = params.toString()
  const res = await request(`/calendar/events${qs ? `?${qs}` : ''}`)
  return res.data
}

/** Fetch a single clinic event. */
export async function fetchCalendarEvent(id) {
  const res = await request(`/calendar/events/${id}`)
  return res.data
}

/** Create a new clinic event. */
export async function createCalendarEvent(payload) {
  const res = await request('/calendar/events', { method: 'POST', body: payload })
  return res.data
}

/** Update an existing clinic event. */
export async function updateCalendarEvent(id, payload) {
  const res = await request(`/calendar/events/${id}`, { method: 'PUT', body: payload })
  return res.data
}

/** Delete a clinic event. */
export async function deleteCalendarEvent(id) {
  const res = await request(`/calendar/events/${id}`, { method: 'DELETE' })
  return res.data
}

/** Fetch blocked periods. */
export async function fetchBlockedSchedules() {
  const res = await request('/calendar/blocked')
  return res.data
}

/** Block a period as unavailable. */
export async function blockSchedule(payload) {
  const res = await request('/calendar/blocked', { method: 'POST', body: payload })
  return { ...res.data, meta: res.meta }
}

/** Remove a blocked period. */
export async function unblockSchedule(id) {
  const res = await request(`/calendar/blocked/${id}`, { method: 'DELETE' })
  return res.data
}

export const eventsService = {
  fetchEvents,
  createEvent,
  fetchCalendarData,
  fetchCalendarEvents,
  fetchCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  fetchBlockedSchedules,
  blockSchedule,
  unblockSchedule,
}
