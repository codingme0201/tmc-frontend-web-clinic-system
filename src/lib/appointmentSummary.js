export const APPOINTMENT_SUMMARY = [
  { key: 'Pending', label: 'Pending', dot: 'bg-gold', description: 'Awaiting approval, including requests under review.' },
  { key: 'Approved', label: 'Approved', dot: 'bg-success', description: 'Approved for a scheduled clinic visit.' },
  { key: 'Rejected', label: 'Rejected', dot: 'bg-accent', description: 'Declined by the clinic.' },
  { key: 'Cancelled', label: 'Cancelled', dot: 'bg-muted', description: 'Cancelled before completion.' },
  { key: 'No-Show', label: 'No-Show', dot: 'bg-[#d9534f]', description: 'An approved appointment missed without check-in.' },
  { key: 'Expired', label: 'Expired', dot: 'bg-muted', description: 'The scheduled time passed without approval.' },
]

// Under Review is still used by legacy workflows; it is one pending request,
// not an additional summary category. Do not alter the stored appointment.
export function appointmentSummaryStatus(status) {
  return status === 'Under Review' ? 'Pending' : status
}

export function countAppointmentSummary(appointments) {
  const counts = Object.fromEntries(APPOINTMENT_SUMMARY.map(({ key }) => [key, 0]))
  for (const appointment of appointments) {
    const status = appointmentSummaryStatus(appointment.status)
    if (Object.hasOwn(counts, status)) counts[status] += 1
  }
  return counts
}
