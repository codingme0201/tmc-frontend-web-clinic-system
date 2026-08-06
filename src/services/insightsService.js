// Dashboard insight charts (activity bars + peak hours) — Laravel REST API.

import { request } from './api'

/** Clinic activity bars: [{ label, percent }]. */
export async function fetchClinicActivity() {
  return request('/insights/activity')
}

/** Peak visit hours: [{ label, count, percent }]. */
export async function fetchPeakHours() {
  return request('/insights/peak-hours')
}

export const insightsService = {
  fetchClinicActivity,
  fetchPeakHours,
}
