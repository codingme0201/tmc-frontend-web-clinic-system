const normalize = (value) => String(value ?? '').trim().toLowerCase()

/** Apply search within the selected record status and patient. */
export function filterMedicalRecords(records, { search = '', status = 'All', patient = 'All' } = {}) {
  const query = normalize(search)
  const patientQuery = normalize(patient)
  return (Array.isArray(records) ? records : []).filter((record) => {
    if (status !== 'All' && record.status !== status) return false
    if (
      patient !== 'All' &&
      normalize(record.patientId) !== patientQuery &&
      normalize(record.id) !== patientQuery &&
      normalize(record.name) !== patientQuery
    ) return false

    return !query || [
      record.name,
      record.patientId,
      record.id,
      ...(Array.isArray(record.conditions) ? record.conditions.map((condition) => condition?.name) : []),
      ...(Array.isArray(record.allergies) ? record.allergies.map((allergy) => allergy?.allergen) : []),
    ].some((value) => normalize(value).includes(query))
  })
}
