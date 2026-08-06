import { useEffect, useMemo, useState } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import { useStaff } from '../hooks/useStaff'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { useModal } from '../hooks/useModal'
import { useForm } from 'react-hook-form'
import { usePagination } from '../hooks/usePagination'
import { formatDate, todayISO, timeToMinutes } from '../lib/format'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT, SIDEBAR_FORM,
  FORM_LABEL, FORM_FIELD, FORM_ROW, BTN_SUCCESS, BTN_DANGER, BTN_INFO, BTN_WARN, BTN_NEUTRAL, BTN_VIEW, BTN_ACTION_DANGER,
} from '../lib/ui'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import { EmptyState, ErrorState } from '../components/AsyncState'
import Skeleton from '../components/Skeleton'

const STATUSES = ['Pending', 'Under Review', 'Approved', 'Rescheduled', 'Rejected', 'Cancelled', 'Completed']
const APPOINTMENT_TYPES = ['Check-up', 'Dental concern', 'Follow-up', 'Fever', 'Vaccination', 'Emergency']
const TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:15 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '01:00 PM', '01:30 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:30 PM',
]

const MODAL_CARD = 'flex max-h-[90vh] w-[min(650px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_CARD_SM = MODAL_CARD + ' w-[min(480px,100%)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'
const PROFILE_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4'
const PROFILE_LBL = 'mb-0.5 block text-[11px] font-extrabold uppercase text-muted'
const PROFILE_VAL = 'm-0 text-[14px] font-bold text-ink'
const ALERT_BOX = 'rounded-lg border border-[#f2cfc2] bg-[#fdf1ec] p-[12px_14px]'

function Appointments({ page }) {
  // Data comes from the shared appointment store; the page never touches
  // API data or services directly.
  const {
    data: appointments,
    isLoading,
    error,
    refetch,
    createAppointment,
    updateStatus,
    reschedule,
  } = useAppointments()
  const { data: staff } = useStaff()
  const { showToast } = useToast()

  // Search / filter state
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')

  // Modal state
  const [selectedId, setSelectedId] = useState(null)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [reasonTarget, setReasonTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const bookModal = useModal()

  // Book appointment form
  const bookForm = useForm({
    defaultValues: {
      patient: '',
      type: 'Check-up',
      reason: '',
      date: todayISO(),
      time: '09:00 AM',
      staff: 'Unassigned',
    },
  })

  // Reschedule form
  const rescheduleForm = useForm({
    defaultValues: { date: '', time: '', reason: '' },
  })

  // Reject / cancel reason
  const [reasonText, setReasonText] = useState('')

  // Status summary counts
  const counts = useMemo(() => {
    const count = (status) => appointments.filter((a) => a.status === status).length
    return {
      Pending: count('Pending'),
      'Under Review': count('Under Review'),
      Approved: count('Approved'),
      Rejected: count('Rejected'),
      Cancelled: count('Cancelled'),
    }
  }, [appointments])

  // Search + filter pipeline (runs against the debounced query)
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return appointments
      .filter((app) => {
        const matchQuery =
          !q ||
          app.patient.toLowerCase().includes(q) ||
          app.reference.toLowerCase().includes(q) ||
          app.reason.toLowerCase().includes(q) ||
          app.type.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'All' || app.status === statusFilter
        const matchDate = !dateFilter || app.date === dateFilter
        return matchQuery && matchStatus && matchDate
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return timeToMinutes(a.time) - timeToMinutes(b.time)
      })
  }, [appointments, debouncedSearch, statusFilter, dateFilter])

  // Client-side pagination over the filtered list; swap for API pagination
  // later without touching the table or the Pagination UI.
  const pagination = usePagination(filtered)
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  // Any search/filter change starts back at page 1.
  useEffect(() => {
    resetPage()
  }, [debouncedSearch, statusFilter, dateFilter, resetPage])

  // Keep the detail modal in sync with live store updates
  const selected = selectedId ? appointments.find((a) => a.id === selectedId) || null : null

  const setStatus = async (app, newStatus, note = '') => {
    try {
      await updateStatus(app.id, newStatus, note)
      showToast(`${app.reference} marked as ${newStatus}.`)
      return true
    } catch (err) {
      showToast(err?.message || 'Failed to update the appointment status.', 'error')
      return false
    }
  }

  const openReasonModal = (app, action) => {
    setReasonTarget({ app, action })
    setReasonText('')
  }

  const confirmReason = async () => {
    if (!reasonTarget || busy) return
    setBusy(true)
    const note = reasonText.trim() ? `${reasonTarget.action} — ${reasonText.trim()}` : ''
    const ok = await setStatus(reasonTarget.app, reasonTarget.action, note)
    if (ok) setReasonTarget(null)
    setBusy(false)
  }

  const openReschedule = (app) => {
    setRescheduleTarget(app)
    rescheduleForm.reset({ date: app.date, time: app.time, reason: '' })
  }

  const confirmReschedule = async ({ date, time, reason }) => {
    if (!rescheduleTarget || busy) return
    setBusy(true)
    try {
      await reschedule(rescheduleTarget.id, { date, time, note: (reason || '').trim() })
      showToast(`${rescheduleTarget.reference} rescheduled to ${formatDate(date)} at ${time}.`)
      setRescheduleTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to reschedule the appointment.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleBook = async ({ patient, type, reason, date, time, staff }) => {
    if (busy) return
    setBusy(true)
    try {
      await createAppointment({
        patient: patient.trim(),
        type,
        reason: reason.trim() || type,
        date,
        time,
        staff: staff === 'Unassigned' ? '' : staff,
      })
      showToast('Appointment booked successfully.')
      bookForm.setValue('patient', '')
      bookForm.setValue('reason', '')
      bookModal.close()
    } catch (err) {
      showToast(err?.message || 'Failed to book the appointment.', 'error')
    } finally {
      setBusy(false)
    }
  }

  // Contextual action buttons per status
  const actionButtons = (app) => {
    const buttons = []
    const add = (label, className, onClick) => {
      buttons.push(
        <button key={label} type="button" className={className} onClick={onClick}>
          {label}
        </button>,
      )
    }
    switch (app.status) {
      case 'Pending':
        add('Review', BTN_INFO, () => setStatus(app, 'Under Review'))
        add('Approve', BTN_SUCCESS, () => setStatus(app, 'Approved'))
        add('Reject', BTN_DANGER, () => openReasonModal(app, 'Rejected'))
        add('Reschedule', BTN_WARN, () => openReschedule(app))
        add('Cancel', BTN_NEUTRAL, () => openReasonModal(app, 'Cancelled'))
        break
      case 'Under Review':
        add('Approve', BTN_SUCCESS, () => setStatus(app, 'Approved'))
        add('Reject', BTN_DANGER, () => openReasonModal(app, 'Rejected'))
        add('Reschedule', BTN_WARN, () => openReschedule(app))
        add('Cancel', BTN_NEUTRAL, () => openReasonModal(app, 'Cancelled'))
        break
      case 'Approved':
        add('Reschedule', BTN_WARN, () => openReschedule(app))
        add('Cancel', BTN_NEUTRAL, () => openReasonModal(app, 'Cancelled'))
        break
      case 'Rescheduled':
        add('Approve', BTN_SUCCESS, () => setStatus(app, 'Approved'))
        add('Reject', BTN_DANGER, () => openReasonModal(app, 'Rejected'))
        add('Cancel', BTN_NEUTRAL, () => openReasonModal(app, 'Cancelled'))
        break
      default:
        break
    }
    return buttons
  }

  const clearFilters = () => {
    resetSearch()
    setStatusFilter('All')
    setDateFilter('')
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
        <div>
          <button type="button" className={PRIMARY_BTN} onClick={bookModal.open}>
            + Book Appointment
          </button>
        </div>
      </section>

      {/* Status summary chips (click to filter) */}
      <div className="mb-[18px] grid grid-cols-5 gap-3 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
        {[
          { key: 'Pending', label: 'Pending' },
          { key: 'Under Review', label: 'Under Review' },
          { key: 'Approved', label: 'Approved' },
          { key: 'Rejected', label: 'Rejected' },
          { key: 'Cancelled', label: 'Cancelled' },
        ].map(({ key, label }) => (
          <button
            type="button"
            key={key}
            className={`flex cursor-pointer flex-col gap-[2px] rounded-lg border border-line-strong bg-white p-[14px_16px] text-left transition-all duration-200 hover:border-primary ${statusFilter === key ? 'border-primary bg-[#f0faf8] shadow-[inset_0_0_0_1px_var(--color-primary)]' : ''}`}
            onClick={() => setStatusFilter(statusFilter === key ? 'All' : key)}
          >
            <small className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-muted">{label}</small>
            <strong className="text-[26px] leading-none text-ink">{counts[key]}</strong>
          </button>
        ))}
      </div>

      {/* List panel */}
      <div className={`${PANEL} p-5`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[18px] text-[#143d40]">Appointment Requests & Records</h3>
            <p className={KICKER}>Review, approve, reschedule, reject, or cancel clinic appointments</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-[10px]">
            <input
              type="text"
              className={`${SEARCH_INPUT} min-w-[200px] flex-[1_1_220px]`}
              placeholder="Search patient, reference, reason, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={SELECT_INPUT}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="date"
              className={`${SELECT_INPUT} min-w-[150px]`}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date"
            />
            {(search || statusFilter !== 'All' || dateFilter) && (
              <button type="button" className={PILL} onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {!isLoading && !error && (
              <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">
                {filtered.length} of {appointments.length} appointments
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Patient</th>
                  <th>Type / Reason</th>
                  <th>Schedule</th>
                  <th>Assigned Staff</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }, (_, i) => (
                    <tr key={i}>
                      <td>
                        <Skeleton width={88} height={14} />
                      </td>
                      <td>
                        <Skeleton width={140} height={14} />
                      </td>
                      <td>
                        <Skeleton width={160} height={14} />
                      </td>
                      <td>
                        <Skeleton width={110} height={14} />
                      </td>
                      <td>
                        <Skeleton width={100} height={14} />
                      </td>
                      <td>
                        <Skeleton width={64} height={18} />
                      </td>
                      <td>
                        <Skeleton width={150} height={28} />
                      </td>
                    </tr>
                  ))
                ) : pageItems.map((app) => (
                  <tr key={app.id}>
                    <td className="font-mono font-bold text-primary">{app.reference}</td>
                    <td>
                      <strong className="font-bold text-ink">{app.patient}</strong>
                      {app.patientId ? <span className="block text-[12px] text-muted">{app.patientId}</span> : null}
                    </td>
                    <td>
                      <strong className="block text-[12px]">{app.type}</strong>
                      <span className="block text-[12px] text-muted">{app.reason}</span>
                    </td>
                    <td>
                      <span className="font-bold text-ink">{formatDate(app.date)}</span>
                      <span className="block text-[12px] text-muted">{app.time}</span>
                    </td>
                    <td>{app.staff}</td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-[6px]">
                        <button type="button" className={BTN_VIEW} onClick={() => setSelectedId(app.id)}>
                          View
                        </button>
                        {actionButtons(app)}
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <EmptyState message="No appointments matched your search or filters." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      {/* ================= VIEW APPOINTMENT DETAIL MODAL ================= */}
      {selected && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Appointment ${selected.reference} details`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Appointment Details — {selected.reference}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => setSelectedId(null)}>
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <StatusBadge status={selected.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{selected.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    Scheduled for {formatDate(selected.date)} at {selected.time}
                  </span>
                </div>
              </div>

              <div className={PROFILE_GRID}>
                <div>
                  <span className={PROFILE_LBL}>Reference</span>
                  <p className={PROFILE_VAL}>{selected.reference}</p>
                </div>
                <div>
                  <span className={PROFILE_LBL}>Patient</span>
                  <p className={PROFILE_VAL}>{selected.patient}</p>
                </div>
                {selected.patientId ? (
                  <div>
                    <span className={PROFILE_LBL}>Patient ID</span>
                    <p className={PROFILE_VAL}>{selected.patientId}</p>
                  </div>
                ) : null}
                <div>
                  <span className={PROFILE_LBL}>Type</span>
                  <p className={PROFILE_VAL}>{selected.type}</p>
                </div>
                <div>
                  <span className={PROFILE_LBL}>Date</span>
                  <p className={PROFILE_VAL}>{formatDate(selected.date)}</p>
                </div>
                <div>
                  <span className={PROFILE_LBL}>Time</span>
                  <p className={PROFILE_VAL}>{selected.time}</p>
                </div>
                <div>
                  <span className={PROFILE_LBL}>Assigned Staff</span>
                  <p className={PROFILE_VAL}>{selected.staff}</p>
                </div>
                <div>
                  <span className={PROFILE_LBL}>Requested On</span>
                  <p className={PROFILE_VAL}>{formatDate(selected.requestedOn)}</p>
                </div>
              </div>

              <div className={`${ALERT_BOX} border-[#cfe5df] bg-[#f4faf8]`}>
                <h4 className="mb-1 m-0 text-[13px] text-primary">Reason for Visit</h4>
                <p className="m-0 text-[13px]">{selected.reason}</p>
              </div>

              {selected.notes ? (
                <div className={`${ALERT_BOX} mt-3`}>
                  <h4 className="mb-1 m-0 text-[13px] font-bold text-danger">Notes / History</h4>
                  <p className="m-0 whitespace-pre-line text-[13px]">{selected.notes}</p>
                </div>
              ) : null}

              {/* Status management */}
              <div className="mt-[18px] flex flex-wrap items-center gap-[10px] border-t border-line pt-4">
                <label htmlFor="appointment-status-select" className="text-[12.5px] font-extrabold text-ink">
                  Appointment Status
                </label>
                <select
                  id="appointment-status-select"
                  className={SELECT_INPUT}
                  value={selected.status}
                  onChange={(e) => setStatus(selected, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                {actionButtons(selected)}
                <button type="button" className={PILL} onClick={() => setSelectedId(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESCHEDULE MODAL ================= */}
      {rescheduleTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Reschedule appointment"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRescheduleTarget(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Reschedule Appointment</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => setRescheduleTarget(null)}>
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <StatusBadge status={rescheduleTarget.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{rescheduleTarget.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    Currently {formatDate(rescheduleTarget.date)} at {rescheduleTarget.time}
                  </span>
                </div>
              </div>
              <form className={SIDEBAR_FORM} onSubmit={rescheduleForm.handleSubmit(confirmReschedule)}>
                <label className={FORM_LABEL}>
                  New Date
                  <input type="date" className={FORM_FIELD} {...rescheduleForm.register('date', { required: 'A new date is required.' })} />
                </label>
                <label className={FORM_LABEL}>
                  New Time Slot
                  <select className={FORM_FIELD} {...rescheduleForm.register('time', { required: 'A new time slot is required.' })}>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={FORM_LABEL}>
                  Reason for Rescheduling (optional)
                  <textarea
                    placeholder="e.g. Patient requested a later slot due to class conflict"
                    className={`${FORM_FIELD} min-h-20 resize-y`}
                    {...rescheduleForm.register('reason')}
                  />
                </label>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button
                    type="button"
                    className={PILL}
                    onClick={() => setRescheduleTarget(null)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy ? 'Saving...' : 'Confirm Reschedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= REJECT / CANCEL REASON MODAL ================= */}
      {reasonTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`${reasonTarget.action} appointment`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReasonTarget(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{reasonTarget.action} Appointment</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => setReasonTarget(null)}>
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <StatusBadge status={reasonTarget.app.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{reasonTarget.app.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {reasonTarget.app.reference} · {formatDate(reasonTarget.app.date)} at {reasonTarget.app.time}
                  </span>
                </div>
              </div>
              <form
                className={SIDEBAR_FORM}
                onSubmit={(e) => {
                  e.preventDefault()
                  confirmReason()
                }}
              >
                <label className={FORM_LABEL}>
                  Reason for {reasonTarget.action} (optional but recommended)
                  <textarea
                    placeholder={`Explain why this appointment is being ${reasonTarget.action.toLowerCase()}...`}
                    className={`${FORM_FIELD} min-h-20 resize-y`}
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    autoFocus
                  />
                </label>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button
                    type="button"
                    className={PILL}
                    onClick={() => setReasonTarget(null)}
                    disabled={busy}
                  >
                    Keep Appointment
                  </button>
                  <button type="submit" className={`${BTN_ACTION_DANGER} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy ? 'Saving...' : `Confirm ${reasonTarget.action}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOOK APPOINTMENT MODAL ================= */}
      {bookModal.isOpen && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Book a new appointment"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) bookModal.close()
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Book New Appointment</h3>
              <button type="button" className={MODAL_CLOSE} onClick={bookModal.close}>
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={bookForm.handleSubmit(handleBook)}>
                <label className={FORM_LABEL}>
                  Patient Name
                  <input
                    type="text"
                    placeholder="Enter patient name"
                    className={FORM_FIELD}
                    {...bookForm.register('patient', { required: 'Patient name is required.' })}
                  />
                </label>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Appointment Type
                    <select className={FORM_FIELD} {...bookForm.register('type')}>
                      {APPOINTMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={FORM_LABEL}>
                    Assigned Staff
                    <select className={FORM_FIELD} {...bookForm.register('staff')}>
                      <option value="Unassigned">Unassigned</option>
                      {staff.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className={FORM_LABEL}>
                  Reason for Visit
                  <textarea
                    placeholder="Describe the reason for the visit"
                    className={`${FORM_FIELD} min-h-20 resize-y`}
                    {...bookForm.register('reason')}
                  />
                </label>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Date
                    <input type="date" className={FORM_FIELD} {...bookForm.register('date', { required: 'A date is required.' })} />
                  </label>
                  <label className={FORM_LABEL}>
                    Time Slot
                    <select className={FORM_FIELD} {...bookForm.register('time')}>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={bookModal.close} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy ? 'Booking...' : 'Book Appointment'}
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

export default Appointments
