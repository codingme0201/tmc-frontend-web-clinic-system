import test from 'node:test'
import assert from 'node:assert/strict'
import { filterMedicalRecords } from '../src/lib/medicalRecordFilters.js'

const records = [
  { id: 101, patientId: '24-1001', name: 'Ana Cruz', status: 'Active', conditions: [{ name: 'Asthma' }], allergies: [{ allergen: 'Peanuts' }] },
  { id: 102, patientId: '24-1002', name: 'Ana Reyes', status: 'Archived', conditions: [{ name: 'Asthma' }], allergies: [{ allergen: 'Peanuts' }] },
  { id: 103, patientId: '24-1003', name: 'Ben Santos', status: 'Active' },
]
const ids = (options, source = records) => filterMedicalRecords(source, options).map((record) => record.id)

for (const search of [' ANA ', 'asthma', 'PEANUTS', '24-100', '10']) {
  test(`search "${search}" respects All, Active, and Archived selections`, () => {
    const all = ids({ search })
    assert.ok(all.includes(101) && all.includes(102))
    assert.deepEqual(ids({ search, status: 'Active' }), all.filter((id) => id !== 102))
    assert.deepEqual(ids({ search, status: 'Archived' }), [102])
  })
}

test('clearing search keeps the selected status and patient filters', () => {
  assert.deepEqual(ids({ search: '', status: 'Archived' }), [102])
  assert.deepEqual(ids({ search: 'Ana', status: 'Active', patient: '24-1002' }), [])
  assert.deepEqual(ids({ search: '', status: 'Active', patient: '24-1001' }), [101])
})

test('switching cards retains the query and updates the matching records', () => {
  assert.deepEqual(ids({ search: 'Ben', status: 'All' }), [103])
  assert.deepEqual(ids({ search: 'Ben', status: 'Archived' }), [])
  assert.deepEqual(ids({ search: 'Ben', status: 'Active' }), [103])
})

test('refreshed archive status updates search results in each card', () => {
  const updated = records.map((record) => record.id === 101 ? { ...record, status: 'Archived' } : record)
  assert.deepEqual(ids({ search: 'Ana', status: 'Active' }, updated), [])
  assert.deepEqual(ids({ search: 'Ana', status: 'Archived' }, updated), [101, 102])
})
