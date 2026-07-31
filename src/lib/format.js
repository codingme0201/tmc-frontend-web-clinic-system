const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Converts a display time (e.g. "01:30 PM") to minutes for chronological sorting.
export function timeToMinutes(time) {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return 0
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3].toUpperCase()
  if (meridiem === 'PM' && hours !== 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

/** Formats an ISO date (YYYY-MM-DD) as "Jul 31, 2026". */
export function formatDate(isoDate) {
  if (!isoDate) return '—'
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  return `${MONTHS[month - 1]} ${day}, ${year}`
}

/** Returns today's date as an ISO string (YYYY-MM-DD) in local time. */
export function todayISO() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
