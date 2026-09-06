import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCalendarEvents, useBlockedSchedules } from '../hooks/useClinicEvents'
import { useForm } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, SEARCH_INPUT, SELECT_INPUT,
  SIDEBAR_FORM, FORM_LABEL, FORM_FIELD, FORM_ROW,
  BTN_INFO, BTN_DANGER, BTN_SUCCESS, BTN_VIEW,
} from '../lib/ui'
import InlineSpinner from '../components/Spinner'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import Skeleton from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'

const MODAL_CARD = 'flex max-h-[90vh] w-[min(560px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'

const TIME_OPTIONS = [
  '7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM',
  '7:00 PM','7:30 PM','8:00 PM',
]

const EVENT_TYPES = ['Event', 'Holiday', 'Activity', 'Seminar', 'Meeting', 'Other']
const EVENT_STATUSES = ['Scheduled', 'Ongoing', 'Completed', 'Cancelled']

const TYPE_COLORS = {
  Event: 'bg-[#e3f2fd] text-[#1565c0]',
  Holiday: 'bg-[#fff3e0] text-[#ef6c00]',
  Activity: 'bg-[#e8f5e9] text-[#2e7d32]',
  Seminar: 'bg-[#f3e5f5] text-[#7b1fa2]',
  Meeting: 'bg-[#e0f2f1] text-[#00695c]',
  Other: 'bg-[#f5f5f5] text-[#616161]',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function CalendarSkeleton() {
  return (
    <div className={PANEL + ' p-5'}>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton width={180} height={28} />
        <div className="flex gap-2">
          <Skeleton width={32} height={32} />
          <Skeleton width={60} height={32} />
          <Skeleton width={32} height={32} />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-line">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="bg-[#f4faf8] p-2"><Skeleton width={40} height={14} /></div>
        ))}
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="min-h-[90px] bg-white p-2">
            <Skeleton width={24} height={14} />
            <div className="mt-2 space-y-1">
              <Skeleton width={60} height={10} />
              <Skeleton width={40} height={10} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EventBadge({ type, label }) {
  return (
    <span className={`inline-block truncate rounded px-1 py-[1px] text-[10px] font-bold leading-tight ${TYPE_COLORS[type] || TYPE_COLORS.Other}`}>
      {label}
    </span>
  )
}

function ClinicCalendar({ page }) {
  const { can } = useAuth()
  const events = useCalendarEvents()
  const blocked = useBlockedSchedules()
  const { showToast } = useToast()

  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [typeFilter, setTypeFilter] = useState('All')
  const [showDayDetail, setShowDayDetail] = useState(false)

  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)

  // Create/Edit event modal
  const [editing, setEditing] = useState(null)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const eventForm = useForm({
    defaultValues: {
      title: '', description: '', start_date: '', end_date: '',
      start_time: '', end_time: '', all_day: false, type: 'Event', status: 'Scheduled',
    },
  })
  const allDay = eventForm.watch('all_day')

  // Delete event modal
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Block schedule modal
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const blockForm = useForm({
    defaultValues: { start_date: '', end_date: '', start_time: '', end_time: '', all_day: true, reason: '' },
  })
  const blockAllDay = blockForm.watch('all_day')

  // Detail panel event
  const [detailEvent, setDetailEvent] = useState(null)

  const canCreate = can('calendar.create')
  const canUpdate = can('calendar.update')
  const canDelete = can('calendar.delete')
  const canBlock = can('calendar.block')

  // --- Calendar grid computation ---
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  // Index events/blocked by date string for quick lookup
  const eventsByDate = useMemo(() => {
    const map = {}
    const list = typeFilter === 'All' ? events.data : events.data.filter((e) => e.type === typeFilter)
    list.forEach((event) => {
      const key = event.startDate
      if (!map[key]) map[key] = []
      map[key].push(event)
    })
    return map
  }, [events.data, typeFilter])

  const appointmentsByDate = useMemo(() => {
    const map = {}
    events.data.forEach?.(() => {}) // appointments come from calendar aggregation
    return map
  }, [])

  const blockedByDate = useMemo(() => {
    const map = {}
    blocked.data.forEach((b) => {
      // Expand date range
      if (b.startDate && b.endDate) {
        const start = parseISO(b.startDate)
        const end = parseISO(b.endDate)
        const days = eachDayOfInterval({ start, end })
        days.forEach((d) => {
          const key = format(d, 'yyyy-MM-dd')
          if (!map[key]) map[key] = []
          map[key].push(b)
        })
      }
    })
    return map
  }, [blocked.data])

  const getEventsForDay = useCallback((day) => {
    const key = format(day, 'yyyy-MM-dd')
    return eventsByDate[key] || []
  }, [eventsByDate])

  const getBlockedForDay = useCallback((day) => {
    const key = format(day, 'yyyy-MM-dd')
    return blockedByDate[key] || []
  }, [blockedByDate])

  // --- Navigation ---
  const goToToday = () => { setCurrentMonth(new Date()); setSelectedDate(new Date()) }
  const goToPrevMonth = () => setCurrentMonth((m) => subMonths(m, 1))
  const goToNextMonth = () => setCurrentMonth((m) => addMonths(m, 1))

  // --- Day click ---
  const handleDayClick = (day) => {
    setSelectedDate(day)
    setShowDayDetail(true)
  }

  // --- Event actions ---
  const openCreateEvent = (date = null) => {
    setEditing(null)
    const dateStr = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    eventForm.reset({
      title: '', description: '', start_date: dateStr, end_date: dateStr,
      start_time: '8:00 AM', end_time: '5:00 PM', all_day: false, type: 'Event', status: 'Scheduled',
    })
    setEventModalOpen(true)
  }

  const openEditEvent = (event) => {
    setEditing(event)
    eventForm.reset({
      title: event.title || '',
      description: event.description || '',
      start_date: event.startDate || '',
      end_date: event.endDate || event.startDate || '',
      start_time: event.startTime || '',
      end_time: event.endTime || '',
      all_day: event.allDay || false,
      type: event.type || 'Event',
      status: event.status || 'Scheduled',
    })
    setEventModalOpen(true)
  }

  const submitEventForm = (e) => {
    eventForm.handleSubmit(handleSaveEvent, () => showToast('Please fill in all required fields.', 'error'))(e)
  }

  const handleSaveEvent = async (values) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const payload = {
        title: values.title,
        description: values.description || null,
        start_date: values.start_date,
        end_date: values.end_date || values.start_date,
        start_time: values.all_day ? null : values.start_time,
        end_time: values.all_day ? null : values.end_time,
        all_day: values.all_day,
        type: values.type,
        status: values.status,
      }
      if (editing) {
        await events.updateEvent(editing.id, payload)
        showToast('Event updated successfully.')
      } else {
        await events.createEvent(payload)
        showToast('Event created successfully.')
      }
      setEventModalOpen(false)
    } catch (err) {
      showToast(err?.message || 'Failed to save the event.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const openDeleteModal = (event) => setDeleteTarget(event)

  const handleDelete = async () => {
    if (!deleteTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await events.deleteEvent(deleteTarget.id)
      showToast('Event deleted successfully.')
      setDeleteTarget(null)
      setDetailEvent(null)
    } catch (err) {
      showToast(err?.message || 'Failed to delete event.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // --- Block schedule ---
  const openBlockModal = (date = null) => {
    const dateStr = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    blockForm.reset({ start_date: dateStr, end_date: dateStr, start_time: '', end_time: '', all_day: true, reason: '' })
    setBlockModalOpen(true)
  }

  const submitBlockForm = (e) => {
    blockForm.handleSubmit(handleBlock, () => showToast('Please fill in all required fields.', 'error'))(e)
  }

  const handleBlock = async (values) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await blocked.blockSchedule({
        start_date: values.start_date,
        end_date: values.end_date || values.start_date,
        start_time: values.all_day ? null : values.start_time,
        end_time: values.all_day ? null : values.end_time,
        all_day: values.all_day,
        reason: values.reason || null,
      })
      showToast('Schedule blocked successfully.')
      setBlockModalOpen(false)
    } catch (err) {
      showToast(err?.message || 'Failed to block schedule.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleUnblock = async (block) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await blocked.unblockSchedule(block.id)
      showToast('Block removed successfully.')
    } catch (err) {
      showToast(err?.message || 'Failed to remove block.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const monthLabel = format(currentMonth, 'MMMM yyyy')
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : []
  const selectedDayBlocked = selectedDate ? getBlockedForDay(selectedDate) : []

  if (events.isLoading || blocked.isLoading) {
    return (
      <div>
        <section className="mb-5">
          <p className={KICKER}>{page.eyebrow}</p>
          <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">{page.title}</h2>
          <span className="mt-[6px] block text-[13px] text-muted">{page.description}</span>
        </section>
        <CalendarSkeleton />
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <section className="mb-5 flex items-center justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <p className={KICKER}>{page.eyebrow}</p>
          <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">{page.title}</h2>
          <span className="mt-[6px] block text-[13px] text-muted">{page.description}</span>
        </div>
        <div className="flex gap-2">
          {canBlock && (
            <button type="button" className={BTN_DANGER} onClick={() => openBlockModal()}>Block Schedule</button>
          )}
          {canCreate && (
            <button type="button" className={PRIMARY_BTN} onClick={() => openCreateEvent()}>+ Add Event</button>
          )}
        </div>
      </section>

      {/* Summary chips */}
      <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {[
          { label: 'Total Events', count: events.data.length, color: 'bg-primary' },
          { label: 'Blocked Days', count: blocked.data.length, color: 'bg-accent' },
        ].map((chip) => (
          <div key={chip.label} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3 text-[13px] font-bold text-ink">
            <span>{chip.label}</span>
            <span className={`ml-2 inline-flex size-[22px] items-center justify-center rounded-full text-[11px] text-white ${chip.color}`}>{chip.count}</span>
          </div>
        ))}
        <select className={SELECT_INPUT} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="All">All Types</option>
          {EVENT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
        <RefreshingBadge refreshing={events.isRefetching || blocked.isRefetching} />
      </div>

      {events.error ? (
        <ErrorState message={events.error} onRetry={events.refetch} />
      ) : (
        <div className="flex gap-5 max-[900px]:flex-col">
          {/* Calendar grid */}
          <div className={`${PANEL} flex-1 p-5`}>
            {/* Month navigation */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[18px] font-bold text-ink">{monthLabel}</h3>
              <div className="flex items-center gap-2">
                <button type="button" className={BTN_INFO} onClick={goToPrevMonth} aria-label="Previous month">←</button>
                <button type="button" className={PILL} onClick={goToToday}>Today</button>
                <button type="button" className={BTN_INFO} onClick={goToNextMonth} aria-label="Next month">→</button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px bg-line">
              {DAY_NAMES.map((d) => (
                <div key={d} className="bg-[#f4faf8] p-2 text-center text-[11px] font-extrabold uppercase text-muted-soft">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-line">
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day)
                const dayBlocked = getBlockedForDay(day)
                const inMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const hasItems = dayEvents.length > 0 || dayBlocked.length > 0

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={`min-h-[90px] bg-white p-2 text-left transition-colors ${
                      !inMonth ? 'opacity-40' : ''
                    } ${isSelected ? 'bg-[#f0faf8] ring-1 ring-inset ring-primary' : 'hover:bg-[#f8fcfb]'} ${
                      today ? 'bg-[#f0faf8]' : ''
                    }`}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className={`inline-flex size-[24px] items-center justify-center rounded-full text-[12px] font-bold ${
                      today ? 'bg-primary text-white' : 'text-ink'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-[2px]">
                      {dayBlocked.map((b, i) => (
                        <div key={`b-${i}`} className="truncate rounded bg-[#ffebee] px-1 py-[1px] text-[9px] font-bold text-[#c62828]">
                          Blocked
                        </div>
                      ))}
                      {dayEvents.slice(0, 2).map((ev, i) => (
                        <EventBadge key={`e-${i}`} type={ev.type} label={ev.title} />
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="block text-[9px] font-bold text-muted">+{dayEvents.length - 2} more</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day detail sidebar */}
          {showDayDetail && selectedDate && (
            <div className={`${PANEL} w-[320px] p-5 max-[900px]:w-full`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="m-0 text-[16px] font-bold text-ink">{format(selectedDate, 'EEEE, MMM d, yyyy')}</h3>
                <button type="button" className={MODAL_CLOSE} onClick={() => setShowDayDetail(false)}>✕</button>
              </div>

              {selectedDayBlocked.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-extrabold uppercase text-muted-soft">Blocked Periods</p>
                  {selectedDayBlocked.map((b) => (
                    <div key={b.id} className="mb-2 rounded-lg border border-[#ffcdd2] bg-[#ffebee] p-3">
                      <p className="m-0 text-[12px] font-bold text-[#c62828]">
                        {b.allDay ? 'All Day' : `${b.startTime} – ${b.endTime}`}
                      </p>
                      {b.reason && <p className="m-0 mt-1 text-[11px] text-[#c62828]">{b.reason}</p>}
                      {canBlock && (
                        <button type="button" className="mt-2 text-[11px] font-bold text-[#c62828] underline" onClick={() => handleUnblock(b)}>
                          Remove Block
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedDayEvents.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-extrabold uppercase text-muted-soft">Clinic Events</p>
                  {selectedDayEvents.map((ev) => (
                    <div key={ev.id} className="mb-2 cursor-pointer rounded-lg border border-line p-3 transition-colors hover:border-primary/30" onClick={() => setDetailEvent(ev)}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="m-0 text-[13px] font-bold text-ink">{ev.title}</p>
                          <p className="m-0 mt-1 text-[11px] text-muted">
                            {ev.allDay ? 'All Day' : `${ev.startTime} – ${ev.endTime}`}
                          </p>
                        </div>
                        <span className={`inline-flex rounded px-1 py-[1px] text-[10px] font-bold ${TYPE_COLORS[ev.type] || TYPE_COLORS.Other}`}>
                          {ev.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedDayBlocked.length === 0 && selectedDayEvents.length === 0 && (
                <p className="text-[13px] text-muted">No events or blocks on this day.</p>
              )}

              <div className="flex gap-2">
                {canCreate && (
                  <button type="button" className={BTN_SUCCESS} onClick={() => openCreateEvent(selectedDate)}>+ Add Event</button>
                )}
                {canBlock && (
                  <button type="button" className={BTN_DANGER} onClick={() => openBlockModal(selectedDate)}>Block Day</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= EVENT DETAIL MODAL ================= */}
      {detailEvent && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Event details"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDetailEvent(null) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{detailEvent.title}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => setDetailEvent(null)}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <div className="space-y-3">
                <div>
                  <p className="m-0 text-[11px] font-extrabold uppercase text-muted-soft">Type</p>
                  <span className={`mt-1 inline-flex rounded px-2 py-[3px] text-[11px] font-bold ${TYPE_COLORS[detailEvent.type] || TYPE_COLORS.Other}`}>
                    {detailEvent.type}
                  </span>
                </div>
                <div>
                  <p className="m-0 text-[11px] font-extrabold uppercase text-muted-soft">Date</p>
                  <p className="m-0 mt-1 text-[13px] text-ink">
                    {detailEvent.startDate}
                    {detailEvent.endDate && detailEvent.endDate !== detailEvent.startDate ? ` – ${detailEvent.endDate}` : ''}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-[11px] font-extrabold uppercase text-muted-soft">Time</p>
                  <p className="m-0 mt-1 text-[13px] text-ink">
                    {detailEvent.allDay ? 'All Day' : `${detailEvent.startTime} – ${detailEvent.endTime}`}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-[11px] font-extrabold uppercase text-muted-soft">Status</p>
                  <p className="m-0 mt-1 text-[13px] text-ink">{detailEvent.status}</p>
                </div>
                {detailEvent.description && (
                  <div>
                    <p className="m-0 text-[11px] font-extrabold uppercase text-muted-soft">Description</p>
                    <p className="m-0 mt-1 text-[13px] text-muted">{detailEvent.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setDetailEvent(null)}>Close</button>
                {canUpdate && (
                  <button type="button" className={BTN_INFO} onClick={() => { setDetailEvent(null); openEditEvent(detailEvent) }}>Edit</button>
                )}
                {canDelete && (
                  <button type="button" className={BTN_DANGER} onClick={() => { setDetailEvent(null); openDeleteModal(detailEvent) }}>Delete</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CREATE / EDIT EVENT MODAL ================= */}
      {eventModalOpen && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label={editing ? 'Edit event' : 'Create event'}
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setEventModalOpen(false) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{editing ? 'Edit Event' : 'Create Event'}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setEventModalOpen(false) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={submitEventForm}>
                <label className={FORM_LABEL}>
                  Title
                  <input type="text" placeholder="Event title" className={FORM_FIELD} {...eventForm.register('title', { required: 'Title is required.' })} disabled={busy} />
                </label>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Type
                    <select className={FORM_FIELD} {...eventForm.register('type')} disabled={busy}>
                      {EVENT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  </label>
                  <label className={FORM_LABEL}>
                    Status
                    <select className={FORM_FIELD} {...eventForm.register('status')} disabled={busy}>
                      {EVENT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </label>
                </div>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Start Date
                    <input type="date" className={FORM_FIELD} {...eventForm.register('start_date', { required: 'Start date is required.' })} disabled={busy} />
                  </label>
                  <label className={FORM_LABEL}>
                    End Date
                    <input type="date" className={FORM_FIELD} {...eventForm.register('end_date')} disabled={busy} />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-[13px] font-bold text-ink">
                  <input type="checkbox" className="size-4 accent-primary" {...eventForm.register('all_day')} disabled={busy} />
                  All Day Event
                </label>
                {!allDay && (
                  <div className={FORM_ROW}>
                    <label className={FORM_LABEL}>
                      Start Time
                      <select className={FORM_FIELD} {...eventForm.register('start_time', { required: !allDay ? 'Start time is required.' : false })} disabled={busy}>
                        <option value="">Select time</option>
                        {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                    </label>
                    <label className={FORM_LABEL}>
                      End Time
                      <select className={FORM_FIELD} {...eventForm.register('end_time', { required: !allDay ? 'End time is required.' : false })} disabled={busy}>
                        <option value="">Select time</option>
                        {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                    </label>
                  </div>
                )}
                <label className={FORM_LABEL}>
                  Description
                  <input type="text" placeholder="Optional description" className={FORM_FIELD} {...eventForm.register('description')} disabled={busy} />
                </label>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={() => setEventModalOpen(false)} disabled={busy}>Cancel</button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy && <InlineSpinner />}
                    {busy ? 'Saving...' : editing ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteTarget && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Delete event"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setDeleteTarget(null) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Delete Clinic Event</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setDeleteTarget(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0">Are you sure you want to remove <strong>{deleteTarget.title}</strong> from the clinic calendar? This action cannot be undone.</p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setDeleteTarget(null)} disabled={busy}>Cancel</button>
                <button type="button" className={`${BTN_DANGER} min-h-10 px-[14px] text-[13px]`} onClick={handleDelete} disabled={busy}>
                  {busy && <InlineSpinner />}
                  {busy ? 'Deleting...' : 'Delete Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= BLOCK SCHEDULE MODAL ================= */}
      {blockModalOpen && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Block schedule"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setBlockModalOpen(false) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Block Unavailable Schedule</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setBlockModalOpen(false) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={submitBlockForm}>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Start Date
                    <input type="date" className={FORM_FIELD} {...blockForm.register('start_date', { required: 'Start date is required.' })} disabled={busy} />
                  </label>
                  <label className={FORM_LABEL}>
                    End Date
                    <input type="date" className={FORM_FIELD} {...blockForm.register('end_date', { required: 'End date is required.' })} disabled={busy} />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-[13px] font-bold text-ink">
                  <input type="checkbox" className="size-4 accent-primary" {...blockForm.register('all_day')} disabled={busy} />
                  All Day
                </label>
                {!blockAllDay && (
                  <div className={FORM_ROW}>
                    <label className={FORM_LABEL}>
                      Start Time
                      <select className={FORM_FIELD} {...blockForm.register('start_time')} disabled={busy}>
                        <option value="">Select time</option>
                        {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                    </label>
                    <label className={FORM_LABEL}>
                      End Time
                      <select className={FORM_FIELD} {...blockForm.register('end_time')} disabled={busy}>
                        <option value="">Select time</option>
                        {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                    </label>
                  </div>
                )}
                <label className={FORM_LABEL}>
                  Reason
                  <input type="text" placeholder="Optional reason for blocking" className={FORM_FIELD} {...blockForm.register('reason')} disabled={busy} />
                </label>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={() => setBlockModalOpen(false)} disabled={busy}>Cancel</button>
                  <button type="submit" className={`${BTN_DANGER} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy && <InlineSpinner />}
                    {busy ? 'Blocking...' : 'Block Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClinicCalendar
