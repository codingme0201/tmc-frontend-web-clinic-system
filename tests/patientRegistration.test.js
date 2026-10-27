import test from 'node:test'
import assert from 'node:assert/strict'
import { patientRegistrationGroups } from '../src/lib/patientRegistration.js'

test('summary counts and category lists use the same registration dates', () => {
  const patients = [
    { id: 1, registeredOn: '2026-10-22' },
    { id: 2, registeredOn: '2026-10-21' },
    { id: 3, registeredOn: '2026-10-16' },
    { id: 4, registeredOn: '2026-10-15' },
    { id: 5, registeredOn: null },
    { id: 6, registeredOn: '2026-10-23' },
  ]
  const groups = patientRegistrationGroups(patients, '2026-10-22')
  assert.equal(groups.all.length, 6)
  assert.deepEqual(groups.today.map((patient) => patient.id), [1])
  assert.deepEqual(groups.recent.map((patient) => patient.id), [1, 2, 3])
  assert.equal(groups.recent.filter((patient) => patient.id === 2).length, 1)
})

test('seven-day window includes the correct dates across year boundaries', () => {
  const patients = ['2025-12-27', '2025-12-28', '2026-01-03'].map((registeredOn) => ({ registeredOn }))
  assert.deepEqual(
    patientRegistrationGroups(patients, '2026-01-03').recent.map((patient) => patient.registeredOn),
    ['2025-12-28', '2026-01-03'],
  )
})

test('empty registries and dates outside the window produce zero recent counts', () => {
  assert.deepEqual(patientRegistrationGroups([], '2026-10-22'), { all: [], today: [], recent: [] })
  const groups = patientRegistrationGroups([{ registeredOn: '2026-10-01' }, {}], '2026-10-22')
  assert.equal(groups.all.length, 2)
  assert.equal(groups.today.length, 0)
  assert.equal(groups.recent.length, 0)
})
