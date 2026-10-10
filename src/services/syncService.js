import { request } from './api'

/** Per-module change versions used for live sync with the mobile app. */
export async function fetchSyncVersions() {
  const res = await request('/sync')
  return res.data
}

export const syncService = { fetchSyncVersions }
