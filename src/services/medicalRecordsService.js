// Patient medical records data access. Mock-backed; swap for REST calls later.
//
// The page/hook layer never touches this module's internals — replacing the
// mock store with real fetch() calls only requires re-implementing these
// functions (see src/services/api.js for the request helper stub).

import { delay, ApiError } from './api'
import { mockMedicalRecords } from '../mocks/medicalRecords'

let recordsDb = mockMedicalRecords.map((r) => ({ ...r }))

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function findIndex(id) {
  const index = recordsDb.findIndex((r) => r.id === id)
  if (index === -1) throw new ApiError('Medical record not found.', 404)
  return index
}

// Generates the next entity id within a collection, e.g. MC-004, AL-002.
function nextEntityId(prefix, items) {
  const max = items.reduce((m, it) => {
    const num = Number(String(it.id).split('-').pop())
    return Number.isFinite(num) ? Math.max(m, num) : m
  }, 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

/**
 * Fetches medical records. The Medical Records list hook (useMedicalRecordList)
 * already produces the query params a REST version would accept —
 *   { q, status, page, limit } — and the response would be
 *   { data, total, totalPages }. For now every record is returned and the
 *   hook filters/paginates in memory.
 */
export async function fetchMedicalRecords() {
  await delay()
  return recordsDb.map((r) => ({ ...r }))
}

// ---------- Medical conditions ----------

export async function addCondition(recordId, payload) {
  await delay()
  const index = findIndex(recordId)
  const record = recordsDb[index]
  const condition = { id: nextEntityId('MC', record.conditions), ...payload }
  const updated = {
    ...record,
    conditions: [...record.conditions, condition],
    lastUpdated: todayISO(),
  }
  recordsDb[index] = updated
  return { ...updated }
}

export async function updateCondition(recordId, conditionId, patch) {
  await delay()
  const index = findIndex(recordId)
  const record = recordsDb[index]
  const updated = {
    ...record,
    conditions: record.conditions.map((c) => (c.id === conditionId ? { ...c, ...patch } : c)),
    lastUpdated: todayISO(),
  }
  recordsDb[index] = updated
  return { ...updated }
}

export async function removeCondition(recordId, conditionId) {
  await delay()
  const index = findIndex(recordId)
  const record = recordsDb[index]
  const updated = {
    ...record,
    conditions: record.conditions.filter((c) => c.id !== conditionId),
    lastUpdated: todayISO(),
  }
  recordsDb[index] = updated
  return { ...updated }
}

// ---------- Allergies ----------

export async function addAllergy(recordId, payload) {
  await delay()
  const index = findIndex(recordId)
  const record = recordsDb[index]
  const allergy = { id: nextEntityId('AL', record.allergies), ...payload }
  const updated = {
    ...record,
    allergies: [...record.allergies, allergy],
    lastUpdated: todayISO(),
  }
  recordsDb[index] = updated
  return { ...updated }
}

export async function updateAllergy(recordId, allergyId, patch) {
  await delay()
  const index = findIndex(recordId)
  const record = recordsDb[index]
  const updated = {
    ...record,
    allergies: record.allergies.map((a) => (a.id === allergyId ? { ...a, ...patch } : a)),
    lastUpdated: todayISO(),
  }
  recordsDb[index] = updated
  return { ...updated }
}

export async function removeAllergy(recordId, allergyId) {
  await delay()
  const index = findIndex(recordId)
  const record = recordsDb[index]
  const updated = {
    ...record,
    allergies: record.allergies.filter((a) => a.id !== allergyId),
    lastUpdated: todayISO(),
  }
  recordsDb[index] = updated
  return { ...updated }
}

export const medicalRecordsService = {
  fetchMedicalRecords,
  addCondition,
  updateCondition,
  removeCondition,
  addAllergy,
  updateAllergy,
  removeAllergy,
}
