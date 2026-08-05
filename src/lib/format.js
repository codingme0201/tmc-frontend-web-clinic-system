import { format, isValid, parse, parseISO } from 'date-fns'

// Converts a display time (e.g. "01:30 PM") to minutes for chronological sorting.
export function timeToMinutes(time) {
  const parsed = parse(time, 'h:mm a', new Date())
  return isValid(parsed) ? parsed.getHours() * 60 + parsed.getMinutes() : 0
}

/** Formats an ISO date (YYYY-MM-DD) as "Jul 31, 2026". */
export function formatDate(isoDate) {
  if (!isoDate) return '—'
  const parsed = parseISO(isoDate)
  return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : isoDate
}

/** Returns today's date as an ISO string (YYYY-MM-DD) in local time. */
export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Two-letter initials for avatar circles (matches the existing avatar pattern). */
export function initials(name = '') {
  return name.slice(0, 2).toUpperCase()
}
