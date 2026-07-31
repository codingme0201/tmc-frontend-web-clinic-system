// Clinical consultation records data access. Mock-backed; swap for REST calls later.

import { delay } from './api'
import { mockConsultations } from '../mocks/consultations'

let consultationsDb = mockConsultations.map((c) => ({ ...c }))

export async function fetchConsultations() {
  await delay()
  return consultationsDb.map((c) => ({ ...c }))
}

export async function createConsultation(payload) {
  await delay()
  const max = consultationsDb.reduce((m, c) => {
    const num = Number(String(c.id).split('-').pop())
    return Number.isFinite(num) ? Math.max(m, num) : m
  }, 0)
  const consultation = {
    id: `C-2026-${String(max + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ...payload,
  }
  consultationsDb = [consultation, ...consultationsDb]
  return { ...consultation }
}

export const consultationsService = {
  fetchConsultations,
  createConsultation,
}
