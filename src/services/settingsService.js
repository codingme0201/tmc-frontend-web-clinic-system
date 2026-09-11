import { request } from './api'

export async function fetchSettings() {
  const res = await request('/settings')
  return res.data
}

export async function updateSettings(payload) {
  const res = await request('/settings', { method: 'PUT', body: payload })
  return res.data
}

export const settingsService = { fetchSettings, updateSettings }
