/** One display value per detail; the linked patient profile is authoritative. */
export function medicalRecordPatientFields(record) {
  const profile = record.studentProfile || {}
  const fullName = profile.firstName && profile.lastName
    ? [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ')
    : record.name || [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ')
  const emergencyContact = profile.emergencyContactName && profile.emergencyContactPhone
    ? `${profile.emergencyContactName} (${profile.emergencyContactPhone})`
    : record.emergencyContact || profile.emergencyContactName || profile.emergencyContactPhone || ''

  return [
    ['Patient Name', fullName],
    ['Patient ID', profile.studentId || record.patientId],
    ['Age', profile.age ?? record.age],
    ['Sex', profile.sex || record.sex],
    ['Type', record.type],
    ['Course / Program', profile.courseDept || record.courseDept],
    ['Block / Section', profile.block],
    ['Nationality', profile.nationality],
    ['Email', profile.email],
    ['Contact Number', profile.contact || record.contact],
    ['Emergency Contact', emergencyContact],
    ['Home Address', profile.address],
    ['Reported Allergies', profile.allergies && profile.allergies !== 'None' ? profile.allergies : profile.allergies === 'None' ? 'None reported' : ''],
    ['Reported Medical History', profile.history && profile.history !== 'None' ? profile.history : profile.history === 'None' ? 'None reported' : ''],
  ]
}
