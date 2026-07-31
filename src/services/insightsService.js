// Dashboard static insight charts (activity bars + peak hours).
// Mock-backed; swap for REST calls later.

import { delay } from './api'
import { clinicActivity, mockPeakHours } from '../mocks/insights'

export async function fetchClinicActivity() {
  await delay()
  return clinicActivity.map((item) => ({ ...item }))
}

export async function fetchPeakHours() {
  await delay()
  return mockPeakHours.map((item) => ({ ...item }))
}

export const insightsService = {
  fetchClinicActivity,
  fetchPeakHours,
}
