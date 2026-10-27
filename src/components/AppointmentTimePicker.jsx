import { useEffect, useId, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { useAppointmentCalendar } from '../hooks/useAppointmentCalendar'
import { TIME_SLOTS, isSlotClosed } from '../lib/clinic'
import { todayISO } from '../lib/format'

export default function AppointmentTimePicker({ date, staffId = null, value = '', onChange, onBlur, disabled = false, required = false, className = '', name }) {
  const listId = useId()
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const targetDate = date || todayISO()
  const calendar = useAppointmentCalendar(Number(targetDate.slice(0, 4)), { staffId, month: Number(targetDate.slice(5, 7)) })
  const closedReason = calendar.data?.closedDates?.[date]
  const day = calendar.data?.days?.[date]
  const options = TIME_SLOTS.map((time) => {
    const slot = day?.slots.find((entry) => entry.time === time)
    let reason = closedReason || ''
    if (!reason && (!date || !calendar.data || calendar.isError)) reason = calendar.isError && staffId ? 'Doctor not available' : 'Availability unavailable'
    if (!reason && staffId && !slot?.available) reason = 'Doctor not available'
    if (!reason && isSlotClosed(date, time)) reason = 'Time slot unavailable'
    return { time, reason }
  })
  const selectedReason = options.find((option) => option.time === value)?.reason || ''

  useEffect(() => { inputRef.current?.setCustomValidity(selectedReason) }, [selectedReason])
  useEffect(() => {
    if (!open) return
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const show = () => { if (!disabled && date) setOpen(true) }

  return (
    <span ref={rootRef} className="block w-full">
      <span className="relative block">
        <input
          ref={inputRef} type="text" inputMode="none" autoComplete="off" name={name} value={value}
          onChange={() => {}} onBlur={onBlur} required={required} disabled={disabled || !date}
          placeholder={date ? 'Select time slot' : 'Select a date first'}
          className={`${className} w-full cursor-pointer pr-10`}
          role="combobox" aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" aria-invalid={Boolean(selectedReason)}
          title={selectedReason || 'Choose an available time slot'} onClick={show} onInvalid={show}
          onPaste={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); show() }
            if (event.key === 'Escape') { event.stopPropagation(); setOpen(false) }
            if (['Delete', 'Backspace'].includes(event.key)) { event.preventDefault(); onChange('') }
          }}
        />
        <Clock3 size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </span>
      {selectedReason === 'Doctor not available' && <span role="status" className="mt-1 block text-[11px] font-medium text-red-600">Doctor not available</span>}
      {open && !disabled && (
        <span id={listId} role="listbox" aria-label="Appointment time slots" className="mt-2 block max-h-60 overflow-y-auto rounded-xl border border-line-strong bg-white p-1 shadow-lg"
          onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); inputRef.current?.focus() } }}>
          {options.map(({ time, reason }) => (
            <button
              key={time} type="button" role="option" aria-selected={time === value} aria-disabled={Boolean(reason)} title={reason || undefined}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-bold ${reason ? 'cursor-not-allowed text-red-600' : 'cursor-pointer text-ink hover:bg-primary/10'} ${time === value ? 'bg-primary/10' : ''}`}
              onClick={() => { if (reason) return; onChange(time); setOpen(false); inputRef.current?.focus() }}
            >
              <span>{time}</span>
              {reason && <span className="text-[10px] font-normal">{reason}</span>}
            </button>
          ))}
          {calendar.isError && <button type="button" className="w-full cursor-pointer px-3 py-2 text-left text-[12px] font-bold text-primary" onClick={() => calendar.refetch()}>Retry availability</button>}
        </span>
      )}
    </span>
  )
}
