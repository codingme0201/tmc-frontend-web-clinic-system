import { useCallback, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCalendarEvents, useBlockedSchedules } from '../hooks/useClinicEvents'
import { useForm, useWatch } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, differenceInCalendarDays,
  format, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO, isValid,
} from 'date-fns'
import { SHIFT_TIMES, EVENT_TYPES, NON_WORKING_EVENT_TYPES, normalizeTime } from '../lib/clinic'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, SELECT_INPUT, SIDEBAR_FORM,
  FORM_LABEL, FORM_FIELD, FORM_ROW,
  BTN_INFO, BTN_DANGER, BTN_SUCCESS,
} from '../lib/ui'
import InlineSpinner from '../components/Spinner'
import RefreshingBadge from '../components/RefreshingBadge'
import Skeleton from '../components/Skeleton'
import { ErrorState } from '../components/AsyncState'

const MODAL_CARD = 'flex max-h-[90vh] w-[min(560px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'

// Clinic hours only — the same time format used by appointments.
const TIME_OPTIONS = SHIFT_TIMES
const EVENT_STATUSES = ['Scheduled', 'Ongoing', 'Completed', 'Cancelled']
const MAX_LANES = 3

// Badge colors (text) and range-bar colors (background) per event type.
const TYPE_COLORS = {
  Event: 'bg-[#e3f2fd] text-[#1565c0]',
  Holiday: 'bg-[#ffe0cc] text-[#b54708]',
  'Non-Working Day': 'bg-[#ffd9d9] text-[#b42318]',
  'Clinic Closure': 'bg-[#ffd9d9] text-[#b42318]',
  'Health Campaign': 'bg-[#dcfae6] text-[#067647]',
  'Vaccination Drive': 'bg-[#d1fadf] text-[#05603a]',
  'Medical Mission': 'bg-[#e0eaff] text-[#3538cd]',
  'Dental Mission': 'bg-[#e0f2fe] text-[#026aa2]',
  Activity: 'bg-[#e8f5e9] text-[#2e7d32]',
  Seminar: 'bg-[#f3e5f5] text-[#7b1fa2]',
  Training: 'bg-[#fef0c7] text-[#93370d]',
  Meeting: 'bg-[#e0f2f1] text-[#00695c]',
  Other: 'bg-[#f5f5f5] text-[#616161]',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toKey = (d) => format(d, 'yyyy-MM-dd')

// Parsed [start, end] of an event/block (end defaults to start).
function rangeOf(item) {
  const start = item.startDate ? parseISO(item.startDate) : null
  const end = item.endDate ? parseISO(item.endDate) : start
  if (!start || !isValid(start)) return null
  return [start, end && isValid(end) && end >= start ? end : start]
}

function rangeLabel(item) {
  const range = rangeOf(item)
  if (!range) return item.date || '—'
  const [start, end] = range
  const days = differenceInCalendarDays(end, start) + 1
  if (days === 1) return format(start, 'EEE, MMM d, yyyy')
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')} (${days} days)`
}

const isClosure = (event) => NON_WORKING_EVENT_TYPES.includes(event.type) && event.status !== 'Cancelled'

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
  const allDay = useWatch({ control: eventForm.control, name: 'all_day' })
  const formStart = useWatch({ control: eventForm.control, name: 'start_date' })
  const formEnd = useWatch({ control: eventForm.control, name: 'end_date' })
  const formType = useWatch({ control: eventForm.control, name: 'type' })

  // Delete event modal
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Block schedule modal
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const blockForm = useForm({
    defaultValues: { start_date: '', end_date: '', start_time: '', end_time: '', all_day: true, reason: '' },
  })
  const blockAllDay = useWatch({ control: blockForm.control, name: 'all_day' })
  const blockStart = useWatch({ control: blockForm.control, name: 'start_date' })
  const blockEnd = useWatch({ control: blockForm.control, name: 'end_date' })

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
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })
  }, [currentMonth])

  const weeks = useMemo(() => {
    const rows = []
    for (let i = 0; i < calendarDays.length; i += 7) rows.push(calendarDays.slice(i, i + 7))
    return rows
  }, [calendarDays])

  const visibleEvents = useMemo(
    () => (typeFilter === 'All' ? events.data : events.data.filter((e) => e.type === typeFilter)),
    [events.data, typeFilter],
  )

  // Every day an event covers (the whole start → end range).
  const eventsByDate = useMemo(() => {
    const map = {}
    visibleEvents.forEach((event) => {
      const range = rangeOf(event)
      if (!range) return
      eachDayOfInterval({ start: range[0], end: range[1] }).forEach((d) => {
        const key = toKey(d)
        if (!map[key]) map[key] = []
        map[key].push(event)
      })
    })
    return map
  }, [visibleEvents])

  // Closed days: holidays, non-working days and clinic closures (any filter).
  const closedByDate = useMemo(() => {
    const map = {}
    events.data.filter(isClosure).forEach((event) => {
      const range = rangeOf(event)
      if (!range) return
      eachDayOfInterval({ start: range[0], end: range[1] }).forEach((d) => {
        const key = toKey(d)
        if (!map[key]) map[key] = []
        map[key].push(event)
      })
    })
    return map
  }, [events.data])

  const blockedByDate = useMemo(() => {
    const map = {}
    blocked.data.forEach((b) => {
      const range = rangeOf(b)
      if (!range) return
      eachDayOfInterval({ start: range[0], end: range[1] }).forEach((d) => {
        const key = toKey(d)
        if (!map[key]) map[key] = []
        map[key].push(b)
      })
    })
    return map
  }, [blocked.data])

  // Lane layout per week so a multi-day event stays on one row across days.
  const lanesByWeek = useMemo(() => {
    return weeks.map((week) => {
      const weekStart = week[0]
      const weekEnd = week[6]
      const overlapping = visibleEvents
        .map((event) => ({ event, range: rangeOf(event) }))
        .filter(({ range }) => range && range[0] <= weekEnd && range[1] >= weekStart)
        .sort((a, b) => a.range[0] - b.range[0] || (b.range[1] - b.range[0]) - (a.range[1] - a.range[0]) || a.event.id - b.event.id)

      const laneEnds = []
      const placement = new Map()
      overlapping.forEach(({ event, range }) => {
        const start = range[0] < weekStart ? weekStart : range[0]
        let lane = laneEnds.findIndex((end) => end < start)
        if (lane === -1) lane = laneEnds.length
        laneEnds[lane] = range[1]
        placement.set(event.id, lane)
      })
      return { placement, laneCount: laneEnds.length }
    })
  }, [weeks, visibleEvents])

  // Date range currently being entered in the event/block form (preview).
  const previewRange = useMemo(() => {
    const [start, end] = eventModalOpen ? [formStart, formEnd] : blockModalOpen ? [blockStart, blockEnd] : [null, null]
    const s = start ? parseISO(start) : null
    const e = end ? parseISO(end) : s
    if (!s || !isValid(s)) return null
    return [s, e && isValid(e) && e >= s ? e : s]
  }, [eventModalOpen, blockModalOpen, formStart, formEnd, blockStart, blockEnd])

  const getEventsForDay = useCallback((day) => eventsByDate[toKey(day)] || [], [eventsByDate])
  const getBlockedForDay = useCallback((day) => blockedByDate[toKey(day)] || [], [blockedByDate])

  const closedDaysThisMonth = useMemo(
    () => calendarDays.filter((d) => isSameMonth(d, currentMonth) && closedByDate[toKey(d)]).length,
    [calendarDays, currentMonth, closedByDate],
  )

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
    const dateStr = date ? toKey(date) : toKey(new Date())
    eventForm.reset({
      title: '', description: '', start_date: dateStr, end_date: dateStr,
      start_time: '08:00 AM', end_time: '05:00 PM', all_day: false, type: 'Event', status: 'Scheduled',
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
      start_time: event.startTime ? normalizeTime(event.startTime) : '',
      end_time: event.endTime ? normalizeTime(event.endTime) : '',
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
    if (values.end_date && values.end_date < values.start_date) {
      showToast('The end date cannot be before the start date.', 'error')
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      const closes = NON_WORKING_EVENT_TYPES.includes(values.type)
      const payload = {
        title: values.title,
        description: values.description || null,
        start_date: values.start_date,
        end_date: values.end_date || values.start_date,
        start_time: values.all_day || closes ? null : values.start_time,
        end_time: values.all_day || closes ? null : values.end_time,
        all_day: values.all_day || closes,
        type: values.type,
        status: values.status,
      }
      const saved = editing ? await events.updateEvent(editing.id, payload) : await events.createEvent(payload)
      showToast(`Event ${editing ? 'updated' : 'created'}: ${rangeLabel(saved)}.`)
      if (saved?.meta?.warning) showToast(saved.meta.warning, 'error')
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
    const dateStr = date ? toKey(date) : toKey(new Date())
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
      const res = await blocked.blockSchedule({
        start_date: values.start_date,
        end_date: values.end_date || values.start_date,
        start_time: values.all_day ? null : values.start_time,
        end_time: values.all_day ? null : values.end_time,
        all_day: values.all_day,
        reason: values.reason || null,
      })
      if (res?.meta?.warning) {
        showToast(`Blocked with conflict: ${res.meta.warning}`, 'error')
      } else {
        showToast('Schedule blocked successfully.')
      }
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
  const selectedDayClosed = selectedDate ? closedByDate[toKey(selectedDate)] || [] : []

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

  // One range bar segment: rounded + labelled where the range (or week) starts.
  const renderBar = (event, day) => {
    const [start, end] = rangeOf(event)
    const isStart = isSameDay(day, start) || day.getDay() === 0
    const isEnd = isSameDay(day, end) || day.getDay() === 6
    const multiDay = !isSameDay(start, end)
    return (
      <span
        key={`e-${event.id}`}
        onClick={(e) => {
          e.stopPropagation()
          setDetailEvent(event)
        }}
        title={`${event.title} · ${rangeLabel(event)}`}
        className={`block h-[18px] cursor-pointer truncate px-1.5 text-[10px] font-bold leading-[18px] ${TYPE_COLORS[event.type] || TYPE_COLORS.Other} ${
          multiDay ? `${isStart ? 'ml-0 rounded-l' : '-ml-2 rounded-l-none'} ${isEnd ? 'mr-0 rounded-r' : '-mr-2 rounded-r-none'}` : 'rounded'
        } ${event.status === 'Cancelled' ? 'line-through opacity-60' : ''}`}
      >
        {isStart ? event.title : ' '}
      </span>
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
          { label: 'Closed Days (month)', count: closedDaysThisMonth, color: 'bg-[#b42318]' },
          { label: 'Blocked Periods', count: blocked.data.length, color: 'bg-accent' },
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

            {/* Legend */}
            <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-[#fff1f0] ring-1 ring-[#fda29b]" />Clinic closed (holiday / non-working / closure)</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-[#fff6ed] ring-1 ring-[#f79009]" />Blocked schedule</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-6 rounded bg-[#e3f2fd]" />Event range (start → end)</span>
              {previewRange && (
                <span className="inline-flex items-center gap-1.5 text-primary"><span className="size-3 rounded-sm ring-2 ring-primary" />Selected range</span>
              )}
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px bg-line">
              {DAY_NAMES.map((d) => (
                <div key={d} className="bg-[#f4faf8] p-2 text-center text-[11px] font-extrabold uppercase text-muted-soft">{d}</div>
              ))}
            </div>

            {/* Calendar weeks */}
            <div className="grid gap-px bg-line">
              {weeks.map((week, weekIndex) => {
                const { placement, laneCount } = lanesByWeek[weekIndex]
                const lanes = Math.min(laneCount, MAX_LANES)
                return (
                  <div key={toKey(week[0])} className="grid grid-cols-7 gap-px">
                    {week.map((day) => {
                      const key = toKey(day)
                      const dayEvents = getEventsForDay(day)
                      const dayBlocked = getBlockedForDay(day)
                      const dayClosed = closedByDate[key] || []
                      const inMonth = isSameMonth(day, currentMonth)
                      const today = isToday(day)
                      const isSelected = selectedDate && isSameDay(day, selectedDate)
                      const inPreview = previewRange && day >= previewRange[0] && day <= previewRange[1]
                      const byLane = Array.from({ length: lanes }, (_, lane) => dayEvents.find((e) => placement.get(e.id) === lane) || null)
                      const hidden = dayEvents.filter((e) => (placement.get(e.id) ?? 0) >= MAX_LANES).length

                      return (
                        <button
                          key={key}
                          type="button"
                          className={`min-h-[96px] overflow-hidden p-2 text-left transition-colors ${
                            dayClosed.length ? 'bg-[#fff1f0]' : dayBlocked.length ? 'bg-[#fff6ed]' : today ? 'bg-[#f0faf8]' : 'bg-white'
                          } ${!inMonth ? 'opacity-40' : ''} ${
                            inPreview ? 'ring-2 ring-inset ring-primary' : isSelected ? 'ring-1 ring-inset ring-primary' : 'hover:brightness-[0.98]'
                          }`}
                          onClick={() => handleDayClick(day)}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`inline-flex size-[24px] items-center justify-center rounded-full text-[12px] font-bold ${
                              today ? 'bg-primary text-white' : dayClosed.length ? 'text-[#b42318]' : 'text-ink'
                            }`}>
                              {format(day, 'd')}
                            </span>
                            {dayClosed.length > 0 ? (
                              <span className="truncate text-[9px] font-extrabold uppercase text-[#b42318]">Closed</span>
                            ) : dayBlocked.length > 0 ? (
                              <span className="truncate text-[9px] font-extrabold uppercase text-[#b54708]">Blocked</span>
                            ) : null}
                          </div>
                          <div className="mt-1 space-y-[2px]">
                            {byLane.map((event, lane) =>
                              event ? renderBar(event, day) : <span key={`s-${lane}`} className="block h-[18px]" />,
                            )}
                            {hidden > 0 && (
                              <span className="block text-[9px] font-bold text-muted">+{hidden} more</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
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

              {selectedDayClosed.length > 0 && (
                <div className="mb-4 rounded-lg border border-[#fda29b] bg-[#fff1f0] p-3">
                  <p className="m-0 text-[12px] font-extrabold uppercase text-[#b42318]">Clinic closed — no appointments</p>
                  {selectedDayClosed.map((ev) => (
                    <p key={ev.id} className="m-0 mt-1 text-[12px] text-[#b42318]">{ev.type}: {ev.title} · {rangeLabel(ev)}</p>
                  ))}
                </div>
              )}

              {selectedDayBlocked.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-extrabold uppercase text-muted-soft">Blocked Periods</p>
                  {selectedDayBlocked.map((b) => (
                    <div key={b.id} className="mb-2 rounded-lg border border-[#ffcdd2] bg-[#ffebee] p-3">
                      <p className="m-0 text-[12px] font-bold text-[#c62828]">
                        {b.allDay ? 'All Day' : `${b.startTime} – ${b.endTime}`} · {rangeLabel(b)}
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
                  {selectedDayEvents.map((ev) => {
                    const range = rangeOf(ev)
                    const total = differenceInCalendarDays(range[1], range[0]) + 1
                    const dayNumber = differenceInCalendarDays(selectedDate, range[0]) + 1
                    return (
                      <div key={ev.id} className="mb-2 cursor-pointer rounded-lg border border-line p-3 transition-colors hover:border-primary/30" onClick={() => setDetailEvent(ev)}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="m-0 text-[13px] font-bold text-ink">{ev.title}</p>
                            <p className="m-0 mt-1 text-[11px] text-muted">
                              {ev.allDay ? 'All Day' : `${ev.startTime} – ${ev.endTime}`}
                              {total > 1 ? ` · Day ${dayNumber} of ${total}` : ''}
                            </p>
                            {total > 1 && <p className="m-0 text-[11px] text-muted">{rangeLabel(ev)}</p>}
                          </div>
                          <span className={`inline-flex shrink-0 rounded px-1 py-[1px] text-[10px] font-bold ${TYPE_COLORS[ev.type] || TYPE_COLORS.Other}`}>
                            {ev.type}
                          </span>
                        </div>
                      </div>
                    )
                  })}
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
                  {isClosure(detailEvent) && (
                    <p className="m-0 mt-1 text-[12px] font-bold text-[#b42318]">The clinic is closed and appointments cannot be booked on these dates.</p>
                  )}
                </div>
                <div>
                  <p className="m-0 text-[11px] font-extrabold uppercase text-muted-soft">Date Range</p>
                  <p className="m-0 mt-1 text-[13px] text-ink">{rangeLabel(detailEvent)}</p>
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
                    <input type="date" min={formStart || undefined} className={FORM_FIELD} {...eventForm.register('end_date')} disabled={busy} />
                  </label>
                </div>
                {previewRange && (
                  <p className="m-0 rounded-lg bg-primary/5 p-2 text-[12px] font-bold text-primary">
                    Highlighted on the calendar: {rangeLabel({ startDate: formStart, endDate: formEnd || formStart })}
                  </p>
                )}
                {NON_WORKING_EVENT_TYPES.includes(formType) ? (
                  <p className="m-0 rounded-lg border border-[#fda29b] bg-[#fff1f0] p-2 text-[12px] font-bold text-[#b42318]">
                    {formType} closes the clinic for the whole date range — appointments cannot be booked on these days.
                  </p>
                ) : (
                  <>
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
                  </>
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
              <p className="mt-0">Are you sure you want to remove <strong>{deleteTarget.title}</strong> ({rangeLabel(deleteTarget)}) from the clinic calendar? This action cannot be undone.</p>
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
                    <input type="date" min={blockStart || undefined} className={FORM_FIELD} {...blockForm.register('end_date', { required: 'End date is required.' })} disabled={busy} />
                  </label>
                </div>
                {previewRange && (
                  <p className="m-0 rounded-lg bg-primary/5 p-2 text-[12px] font-bold text-primary">
                    Highlighted on the calendar: {rangeLabel({ startDate: blockStart, endDate: blockEnd || blockStart })}
                  </p>
                )}
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
