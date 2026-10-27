import test from 'node:test'
import assert from 'node:assert/strict'
import { medicalRecordPatientFields } from '../src/lib/medicalRecordPatientInfo.js'

test('merged patient fields include each detail once and keep record metadata separate', () => {
  const record = {
    id: 77, name: 'Jane Reyes', patientId: '00-000001', age: 19, contact: 'Old contact',
    courseDept: 'Old course', emergencyContact: 'Mother (09171234567)',
    lastUpdated: '2026-10-20',
    studentProfile: {
      firstName: 'Jane', middleName: 'Marie', lastName: 'Reyes', studentId: '00-000001',
      age: 20, sex: 'Female', contact: '09171234567', courseDept: 'BS Computer Science',
      emergencyContactName: 'Mother', emergencyContactPhone: '09171234567',
      block: 'A', address: 'Bohol', nationality: 'Filipino', email: 'jane@example.com',
      allergies: 'Peanuts', history: 'Asthma',
    },
  }
  const fields = medicalRecordPatientFields(record)
  const labels = fields.map(([label]) => label)
  const values = Object.fromEntries(fields)
  assert.equal(labels.length, new Set(labels).size)
  assert.equal(values['Patient Name'], 'Jane Marie Reyes')
  assert.equal(values['Patient ID'], '00-000001')
  assert.equal(values.Age, 20)
  assert.equal(values['Contact Number'], '09171234567')
  assert.equal(values['Course / Program'], 'BS Computer Science')
  assert.equal(values['Emergency Contact'], 'Mother (09171234567)')
  for (const label of ['First Name', 'Middle Name', 'Last Name', 'Student ID', 'Record No.', 'Last Updated', 'Profile Status', 'Last Updated By']) assert.ok(!labels.includes(label))
  for (const value of ['Bohol', 'A', 'Filipino', 'jane@example.com', 'Peanuts', 'Asthma']) assert.ok(fields.some(([, field]) => field === value))
  assert.equal(record.age, 19)
})

test('records without a linked mobile profile retain their existing patient details', () => {
  const fields = Object.fromEntries(medicalRecordPatientFields({ name: 'Existing Patient', patientId: '00-000002', age: 24, sex: 'Male', type: 'Student', courseDept: 'Existing course', contact: '09171234567', emergencyContact: 'Guardian 09179876543' }))
  assert.equal(fields['Patient Name'], 'Existing Patient')
  assert.equal(fields['Patient ID'], '00-000002')
  assert.equal(fields['Emergency Contact'], 'Guardian 09179876543')
  assert.equal(fields['Course / Program'], 'Existing course')
  assert.equal(fields.Age, 24)
})

test('incomplete mobile profiles fall back to record data and preserve reported health details', () => {
  const fields = Object.fromEntries(medicalRecordPatientFields({ name: 'Jane Reyes', age: 25, contact: '09171234567', emergencyContact: 'Mother 09179876543', studentProfile: { firstName: 'Jane', age: null, contact: '', emergencyContactName: 'Mother', allergies: 'None', history: 'Previous surgery' } }))
  assert.equal(fields['Patient Name'], 'Jane Reyes')
  assert.equal(fields.Age, 25)
  assert.equal(fields['Contact Number'], '09171234567')
  assert.equal(fields['Emergency Contact'], 'Mother 09179876543')
  assert.equal(fields['Reported Allergies'], 'None reported')
  assert.equal(fields['Reported Medical History'], 'Previous surgery')
})
