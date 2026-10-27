/** Calendar-day groups: the last seven days include today and the previous six days. */
export function patientRegistrationGroups(patients, today) {
  const cutoff = new Date(`${today}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - 6)
  const start = cutoff.toISOString().slice(0, 10)
  const all = Array.isArray(patients) ? patients : []
  const registeredToday = []
  const recent = []

  for (const patient of all) {
    const date = patient.registeredOn
    if (date === today) registeredToday.push(patient)
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= start && date <= today) recent.push(patient)
  }

  return { all, today: registeredToday, recent }
}
