import test from 'node:test'
import assert from 'node:assert/strict'
import { APPOINTMENT_SUMMARY, appointmentSummaryStatus, countAppointmentSummary } from '../src/lib/appointmentSummary.js'

test('summary contains exactly the six requested categories in order', () => {
  assert.deepEqual(APPOINTMENT_SUMMARY.map(({ key }) => key), ['Pending', 'Approved', 'Rejected', 'Cancelled', 'No-Show', 'Expired'])
})

test('legacy requests under review count once as Pending and match the Pending filter', () => {
  const appointments = ['Pending', 'Under Review', 'Under Review', 'Approved', 'Rejected', 'Cancelled', 'No-Show', 'Expired', 'Completed', 'Rescheduled'].map((status) => ({ status }))
  const counts = countAppointmentSummary(appointments)
  assert.deepEqual(counts, { Pending: 3, Approved: 1, Rejected: 1, Cancelled: 1, 'No-Show': 1, Expired: 1 })
  for (const { key } of APPOINTMENT_SUMMARY) {
    assert.equal(appointments.filter(({ status }) => appointmentSummaryStatus(status) === key).length, counts[key])
  }
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 8)
  assert.equal(appointments[1].status, 'Under Review')
})

test('counts reflect replacement data after approvals and automatic overdue transitions', () => {
  assert.deepEqual(countAppointmentSummary([]), { Pending: 0, Approved: 0, Rejected: 0, Cancelled: 0, 'No-Show': 0, Expired: 0 })
  const initial = [{ status: 'Pending' }, { status: 'Pending' }, { status: 'Approved' }]
  assert.equal(countAppointmentSummary(initial).Pending, 2)
  const refreshed = [{ status: 'Approved' }, { status: 'Expired' }, { status: 'No-Show' }]
  assert.deepEqual(countAppointmentSummary(refreshed), { Pending: 0, Approved: 1, Rejected: 0, Cancelled: 0, 'No-Show': 1, Expired: 1 })
})
