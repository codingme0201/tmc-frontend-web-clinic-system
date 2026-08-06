// Campus health events data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch upcoming campus health events. */
export async function fetchEvents() {
  const res = await request('/events')
  return res.data
}

/** Schedule a new campus health event. */
export async function createEvent(payload) {
  const res = await request('/events', { method: 'POST', body: payload })
  return res.data
}

export const eventsService = {
  fetchEvents,
  createEvent,
}
