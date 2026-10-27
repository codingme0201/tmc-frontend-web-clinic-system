import test from 'node:test'
import assert from 'node:assert/strict'
import { dashboardConsultations, dashboardPatientGroups, onDutyStaff } from '../src/lib/dashboardPreview.js'

test('on-duty popup includes only currently on-duty staff and follows live status changes', () => {
  const staff = [{ userId: 1, status: 'On duty' }, { userId: 2, status: 'Break' }, { userId: 3, status: 'Off duty' }]
  assert.deepEqual(onDutyStaff(staff).map(({ userId }) => userId), [1])
  assert.deepEqual(onDutyStaff(staff.map((member) => ({ ...member, status: 'Off duty' }))), [])
})

test('patient preview includes recent registrations and recently seen active patients without duplicates', () => {
  const patients = [
    { id: 1, registeredOn: '2026-10-24', status: 'Active', lastVisitOn: '2026-10-24' },
    { id: 2, registeredOn: '2026-01-01', status: 'Active', lastVisitOn: '2026-10-18' },
    { id: 3, registeredOn: '2026-01-01', status: 'Active', lastVisitOn: '2026-10-17' },
    { id: 4, registeredOn: '2026-01-01', status: 'Inactive', lastVisitOn: '2026-10-23' },
    { id: 5, registeredOn: '2026-10-24', status: 'Inactive' },
    { id: 6, registeredOn: '2026-10-25', status: 'Active', lastVisitOn: '2026-10-25' },
  ]
  const groups = dashboardPatientGroups(patients, '2026-10-24')
  assert.deepEqual(groups.all.map(({ id }) => id), [1, 2])
  assert.deepEqual(groups.today.map(({ id }) => id), [1])
  assert.deepEqual(groups.active.map(({ id }) => id), [1, 2])
})

test('consultation preview includes new and completed visits only within the inclusive seven-day window', () => {
  const consultations = [
    { id: 1, date: '2026-10-18', status: 'Scheduled' },
    { id: 2, date: '2026-10-24', status: 'Completed' },
    { id: 3, date: '2026-10-23', status: 'In Progress' },
    { id: 4, date: '2026-10-17', status: 'Completed' },
    { id: 5, date: '2026-10-25', status: 'Scheduled' },
    { id: 6, date: '2026-10-23', status: 'Cancelled' },
  ]
  assert.deepEqual(dashboardConsultations(consultations, '2026-10-24').map(({ id }) => id), [2, 3, 1])
  assert.equal(consultations[0].registeredOn, undefined)
})
