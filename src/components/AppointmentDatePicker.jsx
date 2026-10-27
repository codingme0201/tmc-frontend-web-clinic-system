import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppointmentCalendar } from '../hooks/useAppointmentCalendar'
import { todayISO } from '../lib/format'

const toISO = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/** One shared calendar for booking and follow-ups; closures come from the API. */
export default function AppointmentDatePicker({ value = '', onChange, onBlur, min = todayISO(), required = false, disabled = false, className = '', name, id, staffId = null }) {
  const calendarId = useId()
  const inputRef = useRef(null)
  const popupRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [portalContainer, setPortalContainer] = useState(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [month, setMonth] = useState(() => (value || min).slice(0, 7))
  const [year, monthNumber] = month.split('-').map(Number)
  const monthIndex = monthNumber - 1
  const calendar = useAppointmentCalendar(year, { staffId, month: monthNumber })
  const selectedYear = Number((value || min).slice(0, 4))
  const selectedCalendar = useAppointmentCalendar(selectedYear, { staffId, month: Number((value || min).slice(5, 7)) })
  const selectedReason = selectedCalendar.data?.closedDates?.[value] || selectedCalendar.data?.days?.[value]?.reason || (staffId && selectedCalendar.isError ? 'Doctor not available' : '')
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  useEffect(() => {
    inputRef.current?.setCustomValidity(selectedReason || (value && value < min ? 'Choose a future working date.' : ''))
  }, [selectedReason, value, min])

  useEffect(() => {
    if (!open) return
    const place = () => {
      const bounds = inputRef.current.getBoundingClientRect()
      const width = Math.min(320, window.innerWidth - 24)
      const height = Math.min(400, window.innerHeight - 24)
      setPosition({
        top: Math.max(12, Math.min(bounds.bottom + 6, window.innerHeight - height - 12)),
        left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)),
      })
    }
    const closeOutside = (event) => {
      if (!popupRef.current?.contains(event.target) && event.target !== inputRef.current) setOpen(false)
    }
    const escape = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        inputRef.current?.focus()
      }
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', escape, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', escape, true)
    }
  }, [open])

  const showCalendar = () => {
    if (disabled) return
    setPortalContainer(inputRef.current?.closest('dialog') || document.body)
    setMonth((value || min).slice(0, 7))
    setOpen(true)
  }
  const moveMonth = (amount) => {
    const next = new Date(year, monthIndex + amount, 1)
    if (next.getFullYear() >= 1900 && next.getFullYear() <= 2100) setMonth(toISO(next.getFullYear(), next.getMonth(), 1).slice(0, 7))
  }

  return (
    <>
      <span className="relative block w-full">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={value}
          placeholder="Select date"
          required={required}
          disabled={disabled}
          inputMode="none"
          autoComplete="off"
          className={`${className} w-full cursor-pointer pr-10 ${selectedReason ? 'border-red-300 text-red-700' : ''}`}
          role="combobox"
          aria-expanded={open}
          aria-controls={calendarId}
          aria-haspopup="dialog"
          aria-invalid={Boolean(selectedReason)}
          title={selectedReason || 'Choose an appointment date'}
          onBlur={onBlur}
          onChange={() => {}}
          onPaste={(event) => event.preventDefault()}
          onClick={showCalendar}
          onInvalid={showCalendar}
          onKeyDown={(event) => {
            if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
              event.preventDefault()
              showCalendar()
            } else if (event.key === 'Backspace' || event.key === 'Delete') {
              event.preventDefault()
              onChange('')
            }
          }}
        />
        <CalendarDays size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </span>
      {selectedReason === 'Doctor not available' && <span role="status" className="mt-1 block text-[11px] font-medium text-red-600">Doctor not available</span>}
      {open && !disabled && createPortal(
        <div
          ref={popupRef}
          id={calendarId}
          role="dialog"
          aria-label="Choose appointment date"
          className="fixed z-[250] w-[min(320px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl border border-line-strong bg-white p-3 text-ink shadow-xl"
          style={position}
        >
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="cursor-pointer rounded-lg p-2 hover:bg-bg"><ChevronLeft size={18} /></button>
            <strong className="text-[13px]" aria-live="polite">{new Date(year, monthIndex, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="cursor-pointer rounded-lg p-2 hover:bg-bg"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day} className="py-1 text-[10px] font-bold text-muted">{day}</span>)}
            {Array.from({ length: firstDay }, (_, index) => <span key={`space-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              const date = toISO(year, monthIndex, day)
              const weekday = new Date(year, monthIndex, day).getDay()
              const reason = calendar.data?.closedDates?.[date] || ([0, 6].includes(weekday) ? 'Weekend' : '') || calendar.data?.days?.[date]?.reason || (staffId && calendar.isError ? 'Doctor not available' : '')
              const blocked = Boolean(reason) || date < min || !calendar.data || calendar.isError
              const tooltip = reason || (date < min ? 'Past date' : !calendar.data || calendar.isError ? 'Calendar unavailable' : '')
              return (
                <span key={date} title={tooltip || undefined} className="group relative">
                  <button
                    type="button"
                    aria-label={`${date}${tooltip ? `: ${tooltip}` : ''}`}
                    aria-disabled={blocked}
                    aria-pressed={value === date}
                    className={`flex size-9 w-full items-center justify-center rounded-lg text-[12px] font-bold focus-visible:outline-2 focus-visible:outline-primary ${reason ? 'cursor-not-allowed bg-red-50 text-red-600' : blocked ? 'cursor-not-allowed text-muted-soft/50' : 'cursor-pointer text-ink hover:bg-primary/10'} ${value === date ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => {
                      if (blocked) return
                      onChange(date)
                      setOpen(false)
                      inputRef.current?.focus()
                    }}
                  >{day}</button>
                  {tooltip && <span role="tooltip" className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max max-w-[180px] rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block group-focus-within:block ${weekday <= 2 ? 'left-0' : weekday >= 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>{tooltip}</span>}
                </span>
              )
            })}
          </div>
          {calendar.isPending && <p role="status" className="mt-2 text-[11px] text-muted">Loading clinic calendar...</p>}
          {calendar.isError && <button type="button" className="mt-2 cursor-pointer text-[11px] text-danger" onClick={() => calendar.refetch()}>Could not load calendar. Retry</button>}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-[11px]">
            <span className="text-red-600">Red dates are unavailable</span>
            <button type="button" className="cursor-pointer font-bold text-primary" onClick={() => { setOpen(false); inputRef.current?.focus() }}>Done</button>
          </div>
        </div>, portalContainer || document.body,
      )}
    </>
  )
}
