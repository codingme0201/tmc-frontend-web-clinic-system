import { useEffect, useRef, useState } from 'react'
import { CalendarCheck, CalendarX2, Trash2 } from 'lucide-react'
import { useStaffScheduleDetails } from '../hooks/useStaffSchedules'
import { formatDate, todayISO } from '../lib/format'
import { PILL, FORM_FIELD, FORM_LABEL, BTN_PRIMARY, BTN_DANGER } from '../lib/ui'
import { EmptyState, ErrorState } from './AsyncState'
import CardSkeleton from './skeletons/CardSkeleton'
import RefreshingBadge from './RefreshingBadge'
import StatusBadge from './StatusBadge'
import AppointmentDatePicker from './AppointmentDatePicker'

function moveWeek(date, direction) {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + direction * 7)
  return day.toISOString().slice(0, 10)
}

export default function StaffScheduleDetailsModal({ staff, canEditSchedule, canDelete, onEdit, onAvailability, onDelete, onClose }) {
  const dialogRef = useRef(null)
  const [date, setDate] = useState(() => staff.nextDate || todayISO())
  const details = useStaffScheduleDetails(staff.userId, date)
  const data = details.data

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => { dialog.close(); previousFocus?.focus() }
  }, [])

  return (
    <dialog ref={dialogRef} aria-labelledby="staff-schedule-details-title"
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100vw_-_2rem)] max-w-[700px] overflow-hidden rounded-xl border-0 bg-white p-0 text-ink shadow-[0_24px_64px_rgba(8,20,20,0.22)] backdrop:bg-[rgba(8,20,20,0.45)] backdrop:backdrop-blur-sm"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}>
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line p-[16px_20px]">
          <div className="min-w-0">
            <h3 id="staff-schedule-details-title" className="m-0 break-words text-[18px] text-ink">{data?.name || staff.user?.name}</h3>
            <p className="mb-0 mt-1 text-[12px] text-muted">Staff Schedule Details</p>
          </div>
          <button type="button" className="min-h-11 min-w-11 shrink-0 cursor-pointer rounded border-0 bg-transparent text-[18px] text-muted-soft" aria-label="Close staff schedule details" onClick={onClose}>×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <label className={`${FORM_LABEL} min-w-0 flex-1 basis-full sm:basis-auto`}>
              Week containing date
              <AppointmentDatePicker className={FORM_FIELD} value={date} min={todayISO()} onChange={(value) => { if (value && value >= todayISO()) setDate(value) }} />
            </label>
            <button type="button" className={`${PILL} min-h-11 disabled:cursor-not-allowed disabled:opacity-50`} aria-label="Previous schedule week" disabled={moveWeek(date, -1) < todayISO()} onClick={() => setDate((current) => { const previous = moveWeek(current, -1); return previous >= todayISO() ? previous : current })}>Previous</button>
            <button type="button" className={`${PILL} min-h-11`} aria-label="Next schedule week" onClick={() => setDate((current) => moveWeek(current, 1))}>Next</button>
          </div>
          {details.isError ? <ErrorState message={details.error?.message} onRetry={details.refetch} /> : details.isPending ? <CardSkeleton rows={5} /> : data && <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="m-0 text-[15px] text-ink">Monday–Friday Schedule</h4>
                <p className="mb-0 mt-1 text-[12px] text-muted">{formatDate(data.weekStart)} – {formatDate(data.weekEnd)}</p>
              </div>
              <RefreshingBadge refreshing={details.isFetching} />
            </div>
            <div className="grid gap-3">
              {data.days.map((day) => <section key={day.date} className="overflow-hidden rounded-lg border border-line">
                <div className="flex flex-wrap items-center justify-between gap-1 bg-[#f4faf8] px-3 py-2 text-[12px]">
                  <h5 className="m-0 text-[13px] font-extrabold text-ink">{day.label}</h5>
                  <span className="text-muted">{formatDate(day.date)}</span>
                </div>
                <div className="grid gap-3 p-3">
                  {day.closedReason && <p className="m-0 text-[12px] font-bold text-muted">{day.closedReason}</p>}
                  {day.regularHours && <p className="m-0 text-[11.5px] text-muted">Regular hours: {day.regularHours.startTime} – {day.regularHours.endTime}</p>}
                  {day.schedules.length === 0 ? <p className="m-0 text-[12px] text-muted">No shift scheduled.</p> : day.schedules.map((schedule) => <div key={schedule.id} className="grid gap-2 border-b border-line pb-3 last:border-b-0 last:pb-0">
                    <dl className="m-0 grid grid-cols-2 gap-3 text-[12.5px]">
                      <div><dt className="text-[11.5px] text-muted">Start Time</dt><dd className="m-0 font-bold tabular-nums">{schedule.startTime}</dd></div>
                      <div><dt className="text-[11.5px] text-muted">End Time</dt><dd className="m-0 font-bold tabular-nums">{schedule.endTime}</dd></div>
                    </dl>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-[4px] px-2 py-[3px] text-[11px] font-bold ${schedule.status === 'Available' ? 'bg-[#dff6dd] text-[#1e5a1b]' : 'bg-[#ffebe0] text-[#a33c12]'}`}>{schedule.status}</span>
                      {schedule.isOverride && <span className="text-[11px] text-muted">Date-specific change</span>}
                    </div>
                    {schedule.notes && <p className="m-0 break-words text-[12px] text-muted">{schedule.notes}</p>}
                    {(canEditSchedule(schedule) || canDelete) && <div className="flex flex-wrap gap-2">
                      {canEditSchedule(schedule) && <>
                        <button type="button" className={`${PILL} min-h-11`} aria-label={`Edit schedule for ${day.label}, ${formatDate(day.date)}, ${schedule.startTime}`} onClick={() => onEdit(schedule)}>Edit Schedule</button>
                        <button type="button" className={`${BTN_PRIMARY} min-h-11`} onClick={() => onAvailability(schedule)} aria-label={`${schedule.status === 'Available' ? 'Mark Unavailable' : 'Mark Available'} on ${formatDate(day.date)} at ${schedule.startTime}`}>
                          {schedule.status === 'Available' ? <CalendarX2 size={16} aria-hidden="true" /> : <CalendarCheck size={16} aria-hidden="true" />}
                          {schedule.status === 'Available' ? 'Mark Unavailable' : 'Mark Available'}
                        </button>
                      </>}
                      {canDelete && <button type="button" className={`${BTN_DANGER} min-h-11 min-w-11`} aria-label={`Delete schedule for ${formatDate(day.date)} at ${schedule.startTime}`} onClick={() => onDelete(schedule)}><Trash2 size={16} aria-hidden="true" /></button>}
                    </div>}
                  </div>)}
                </div>
              </section>)}
            </div>
            <h4 className="mb-3 mt-5 text-[15px] text-ink">Assigned Patients</h4>
            {data.assignedPatients.length === 0 ? <EmptyState message="No assigned patients for this school week." /> : <ul className="m-0 grid list-none gap-2 p-0">
              {data.assignedPatients.map((appointment) => <li key={appointment.id} className="rounded-lg border border-line p-3 text-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="min-w-0 flex-1 break-words text-[13px] text-ink">{appointment.patient}</strong>
                  <StatusBadge status={appointment.status} />
                </div>
                <p className="mb-0 mt-1 text-muted">{formatDate(appointment.date)} · {appointment.time}</p>
                <p className="mb-0 mt-1 break-words text-muted">{appointment.reference} · {appointment.visitType}</p>
              </li>)}
            </ul>}
          </>}
        </div>
        <div className="flex shrink-0 justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]">
          <button type="button" className={`${PILL} min-h-11`} onClick={onClose}>Close</button>
        </div>
      </div>
    </dialog>
  )
}
