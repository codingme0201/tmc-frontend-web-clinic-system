// Daily patient queue (first in, first out) — backed by the Laravel REST API.

import { request } from './api'

/** Queue entries for a date (today by default) with status + FIFO position. */
export async function fetchQueue(date = '') {
  const res = await request(`/queue${date ? `?date=${date}` : ''}`)
  return { entries: res.data, meta: res.meta }
}

/** Check a patient in — they join the end of the waiting line. */
export async function checkIn(appointmentId) {
  const res = await request(`/queue/${appointmentId}/check-in`, { method: 'POST' })
  return res.data
}

/** Undo a check-in made by mistake. */
export async function undoCheckIn(appointmentId) {
  const res = await request(`/queue/${appointmentId}/check-in`, { method: 'DELETE' })
  return res.data
}

/** Call the next patient in: starts their consultation (FIFO enforced by the API). */
export async function serve(appointmentId) {
  const res = await request(`/queue/${appointmentId}/serve`, { method: 'POST' })
  return res.data
}

export const queueService = { fetchQueue, checkIn, undoCheckIn, serve }
