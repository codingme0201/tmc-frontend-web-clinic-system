import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { staffSchedulesService } from '../services/staffSchedulesService'
import { SHIFT_TIMES, roleLabel } from '../lib/clinic'
import { PILL, PRIMARY_BTN, SIDEBAR_FORM, FORM_LABEL, FORM_FIELD, FORM_ROW } from '../lib/ui'
import { ErrorState } from './AsyncState'
import InlineSpinner from './Spinner'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function WeeklyScheduleForm({ staffOptions, initialUserId, rules, onSave, onClose, showToast, busy, setBusy }) {
  const { user, userRole } = useAuth()
  const isClinician = ['doctor', 'nurse'].includes(userRole)
  const daysFor = (id) => WEEKDAYS.map((label, index) => {
    const rule = rules.find((entry) => Number(entry.user_id) === Number(id) && entry.weekday === index + 1)
    return { label, weekday: index + 1, selected: Boolean(rule), start_time: rule?.start_time || '08:00 AM', end_time: rule?.end_time || '05:00 PM' }
  })
  const [userId, setUserId] = useState(initialUserId)
  const [days, setDays] = useState(() => daysFor(initialUserId))
  const updateDay = (weekday, changes) => setDays((current) => current.map((day) => day.weekday === weekday ? { ...day, ...changes } : day))

  const save = async (event) => {
    event.preventDefault()
    if (busy) return
    const selected = days.filter((day) => day.selected)
    if (!selected.length) return showToast('Select at least one weekday.', 'error')
    const invalid = selected.find((day) => SHIFT_TIMES.indexOf(day.end_time) <= SHIFT_TIMES.indexOf(day.start_time))
    if (invalid) return showToast(`${invalid.label}: End time must be after start time.`, 'error')
    setBusy(true)
    try {
      await onSave({ user_id: Number(userId), days: selected.map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time })) })
      showToast('Regular schedule saved. Date-specific changes have been preserved.')
      onClose()
    } catch (error) {
      showToast(error?.message || 'Failed to save the schedule.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={SIDEBAR_FORM} onSubmit={save}>
      {isClinician ? <p className="m-0 text-[13px] font-bold text-ink">{user?.name}</p> : <label className={FORM_LABEL}>
        Staff Member
        <select className={FORM_FIELD} value={userId} onChange={(event) => { setUserId(event.target.value); setDays(daysFor(event.target.value)) }} required disabled={busy}>
          <option value="">Select staff member</option>
          {staffOptions.map((member) => <option key={member.id} value={member.id}>{member.name} ({roleLabel(member.role?.name)})</option>)}
        </select>
      </label>}
      <p className="m-0 text-[12px] text-muted">Select regular weekdays and set working hours for each day, from 8:00 AM to 5:00 PM. Use Edit Schedule for a change on one calendar date.</p>
      {days.map((day) => (
        <div key={day.weekday} className="grid gap-3">
          <label className="flex items-center gap-2 text-[13px] font-bold text-ink">
            <input type="checkbox" checked={day.selected} onChange={(event) => updateDay(day.weekday, { selected: event.target.checked })} disabled={busy || !userId} />
            {day.label}
          </label>
          {day.selected && <div className={FORM_ROW}>
            <label className={FORM_LABEL}>
              Start Time
              <select className={FORM_FIELD} aria-label={`${day.label} Start Time`} value={day.start_time} onChange={(event) => updateDay(day.weekday, { start_time: event.target.value })} required disabled={busy}>
                {SHIFT_TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
              </select>
            </label>
            <label className={FORM_LABEL}>
              End Time
              <select className={FORM_FIELD} aria-label={`${day.label} End Time`} value={day.end_time} onChange={(event) => updateDay(day.weekday, { end_time: event.target.value })} required disabled={busy}>
                {SHIFT_TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
              </select>
            </label>
          </div>}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={PILL} onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy || !userId}>
          {busy && <InlineSpinner />}{busy ? 'Saving...' : rules.some((rule) => Number(rule.user_id) === Number(userId)) ? 'Save Changes' : 'Create Schedule'}
        </button>
      </div>
    </form>
  )
}

export default function CreateStaffScheduleModal({ staffOptions, initialUserId, onSave, onClose, showToast }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const weekly = useQuery({ queryKey: ['weekly-staff-schedules', user?.id], queryFn: staffSchedulesService.fetchWeeklyStaffSchedules, refetchOnWindowFocus: false, gcTime: 0 })

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]" role="dialog" aria-modal="true" aria-label="Create Schedule">
      <div className="flex max-h-[90vh] w-[min(520px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]">
        <div className="flex items-center justify-between border-b border-line p-[16px_20px]">
          <h3 className="m-0 text-[18px] text-ink">Create Schedule</h3>
          <button type="button" className="cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft" aria-label="Close create schedule" onClick={onClose} disabled={busy}>×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {weekly.isPending ? <p role="status"><InlineSpinner />Loading saved schedule...</p> : weekly.isError ? <>
            <ErrorState message={weekly.error?.message} onRetry={weekly.refetch} />
            <button type="button" className={PILL} onClick={onClose}>Cancel</button>
          </> : <WeeklyScheduleForm staffOptions={staffOptions} initialUserId={initialUserId} rules={weekly.data || []} onSave={onSave} onClose={onClose} showToast={showToast} busy={busy} setBusy={setBusy} />}
        </div>
      </div>
    </div>
  )
}
