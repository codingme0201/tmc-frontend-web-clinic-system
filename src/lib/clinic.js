// Shared clinic settings — mirrors backend App\Support\ClinicSchedule so
// appointments, consultations, the queue and staff schedules all use the same "hh:mm AM/PM" format and 30-minute slots.

export const WORK_START = '08:00 AM'
export const WORK_END = '05:00 PM'

/** Bookable patient slots (appointments and consultations). */
export const TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
]

/** Start/end options for staff shifts (8:00 AM – 5:00 PM). */
export const SHIFT_TIMES = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM',
]

/** Service categories; the visit type (new vs follow-up) is chosen separately. */
export const APPOINTMENT_TYPES = ['Check-up', 'Dental concern', 'Fever', 'Vaccination', 'Emergency']

export const VISIT_NEW = 'New Consultation'
export const VISIT_FOLLOW_UP = 'Follow-up Consultation'
export const VISIT_TYPES = [VISIT_NEW, VISIT_FOLLOW_UP]

const ROLE_LABELS = {
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  front_desk: 'Front Desk',
  student: 'Student',
  patient: 'Patient',
}

/** Human label for a role name (e.g. "front_desk" → "Front Desk"). */
export function roleLabel(role) {
  if (!role) return '—'
  return ROLE_LABELS[role] ?? role.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Minutes after midnight for "01:30 PM", "1:30 PM" or "13:30"; null if unparseable. */
export function timeToMinutesStrict(time) {
  const match = String(time ?? '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const suffix = match[3]?.toUpperCase()
  if (suffix === 'PM' && hours !== 12) hours += 12
  if (suffix === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

/** Canonical "hh:mm AM/PM" format (e.g. "8:00 AM" → "08:00 AM"). */
export function normalizeTime(time) {
  const total = timeToMinutesStrict(time)
  if (total === null) return time || ''
  const hours = Math.floor(total / 60) % 24
  const minutes = total % 60
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 === 0 ? 12 : hours % 12
  return `${String(display).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`
}

/** The slot a walk-in arriving now belongs to (latest slot at or before now). */
export function currentSlot(now = new Date()) {
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  let slot = TIME_SLOTS[0]
  for (const candidate of TIME_SLOTS) {
    if (timeToMinutesStrict(candidate) <= minutesNow) slot = candidate
  }
  return slot
}

/** Event types that close the clinic (appointments are blocked on those dates). */
export const NON_WORKING_EVENT_TYPES = ['Holiday', 'Non-Working Day', 'Clinic Closure']

export const EVENT_TYPES = [
  'Event', 'Holiday', 'Non-Working Day', 'Clinic Closure', 'Health Campaign', 'Vaccination Drive',
  'Medical Mission', 'Dental Mission', 'Activity', 'Seminar', 'Training', 'Meeting', 'Other',
]

export const LICENSE_TYPES = [
  'PRC Physician License',
  'PRC Dentist License',
  'PRC Nurse License',
  'PRC Midwife License',
  'PRC Medical Technologist License',
  'Other Professional License',
]

/** License types that fit each clinical role. */
export const LICENSE_TYPES_BY_ROLE = {
  doctor: ['PRC Physician License', 'PRC Dentist License', 'Other Professional License'],
  nurse: ['PRC Nurse License', 'PRC Midwife License', 'PRC Medical Technologist License', 'Other Professional License'],
}
