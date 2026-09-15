// Activity/audit log data access — backed by the Laravel REST API.

import { request } from './api'

/** Fetch recent activity log entries, newest first (Dashboard). */
export async function fetchActivityLogs() {
  const res = await request('/activity-logs')
  return res.data
}

/** Fetch audit logs with filters (Audit Logs page). */
export async function fetchAuditLogs(params = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.module) query.set('module', params.module)
  if (params.user) query.set('user', params.user)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  const qs = query.toString()
  const res = await request(`/activity-logs${qs ? '?' + qs : ''}`)
  return res.data
}

/** Record an activity log entry for the current user. */
export async function addActivityLog(action, module = null) {
  const res = await request('/activity-logs', { method: 'POST', body: { action, module } })
  return res.data
}

export const activityLogsService = {
  fetchActivityLogs,
  fetchAuditLogs,
  addActivityLog,
}
