// Campus health events data access. Mock-backed; swap for REST calls later.

import { delay } from './api'
import { mockUpcomingEvents } from '../mocks/events'

let eventsDb = mockUpcomingEvents.map((e) => ({ ...e }))

export async function fetchEvents() {
  await delay()
  return eventsDb.map((e) => ({ ...e }))
}

export async function createEvent(payload) {
  await delay()
  const event = { ...payload }
  eventsDb = [...eventsDb, event]
  return { ...event }
}

export const eventsService = {
  fetchEvents,
  createEvent,
}
