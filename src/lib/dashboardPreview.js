import { patientRegistrationGroups } from './patientRegistration.js'

export function onDutyStaff(staff) {
  return staff.filter((member) => member.status === 'On duty')
}

export function dashboardConsultations(consultations, today) {
  return patientRegistrationGroups(consultations.map((consultation) => ({ ...consultation, registeredOn: consultation.date })), today).recent
    .filter((consultation) => ['Scheduled', 'In Progress', 'Completed'].includes(consultation.status))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

export function dashboardPatientGroups(patients, today) {
  const activePatients = patients.filter((patient) => patient.status === 'Active')
  const registrations = patientRegistrationGroups(activePatients, today)
  const recentVisits = patientRegistrationGroups(activePatients.map((patient) => ({ ...patient, registeredOn: patient.lastVisitOn })), today)
  const recentlyRegistered = new Set(registrations.recent.map((patient) => patient.id))
  const recentlySeen = new Set(recentVisits.recent.map((patient) => patient.id))
  const all = activePatients.filter((patient) => recentlyRegistered.has(patient.id) || recentlySeen.has(patient.id))
  return { all, today: registrations.today, active: all.filter((patient) => patient.status === 'Active') }
}
