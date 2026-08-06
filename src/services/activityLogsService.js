// Activity/audit log data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch recent activity log entries, newest first. */
export async function fetchActivityLogs() {
  const res = await request('/activity-logs')
  return res.data
}

/** Record an activity log entry for the current user. */
export async function addActivityLog(action) {
  const res = await request('/activity-logs', { method: 'POST', body: { action } })
  return res.data
}

export const activityLogsService = {
  fetchActivityLogs,
  addActivityLog,
}
