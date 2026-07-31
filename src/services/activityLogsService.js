// Activity/audit log data access. Mock-backed; swap for REST calls later.

import { delay } from './api'
import { mockActivityLogs } from '../mocks/activityLogs'

let activityLogsDb = mockActivityLogs.map((l) => ({ ...l }))

export async function fetchActivityLogs() {
  await delay()
  return activityLogsDb.map((l) => ({ ...l }))
}

export async function addActivityLog(action) {
  await delay(120)
  const entry = {
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    user: 'Admin User',
    action,
  }
  activityLogsDb = [entry, ...activityLogsDb]
  return { ...entry }
}

export const activityLogsService = {
  fetchActivityLogs,
  addActivityLog,
}
