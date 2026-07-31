import { useMemo, useState } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import { useStaff } from '../hooks/useStaff'
import { useToast } from '../hooks/useToast'
import { formatDate, todayISO, timeToMinutes } from '../lib/format'
import Toast from '../components/Toast'
import StatusBadge from '../components/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState'

const STATUSES = ['Pending', 'Under Review', 'Approved', 'Rescheduled', 'Rejected', 'Cancelled', 'Completed']
const APPOINTMENT_TYPES = ['Check-up', 'Dental concern', 'Follow-up', 'Fever', 'Vaccination', 'Emergency']
const TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:15 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '01:00 PM', '01:30 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:30 PM',
]

function Appointments({ page }) {
  // Data comes from the shared appointment store; the page never touches
  // mock data or services directly.
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
  const { toast, showToast, dismiss } = useToast()

  // Search / filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')

  // Modal state
  const [selectedId, setSelectedId] = useState(null)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [reasonTarget, setReasonTarget] = useState(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // Book appointment form
  const [bPatient, setBPatient] = useState('')
  const [bType, setBType] = useState('Check-up')
  const [bReason, setBReason] = useState('')
  const [bDate, setBDate] = useState(todayISO())
  const [bTime, setBTime] = useState('09:00 AM')
  const [bStaff, setBStaff] = useState('Unassigned')

  // Reschedule form
  const [rDate, setRDate] = useState('')
  const [rTime, setRTime] = useState('')
  const [rReason, setRReason] = useState('')

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

  // Search + filter pipeline
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
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
  }, [appointments, search, statusFilter, dateFilter])

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
    setRDate(app.date)
    setRTime(app.time)
    setRReason('')
  }

  const confirmReschedule = async () => {
    if (!rescheduleTarget || busy || !rDate || !rTime) return
    setBusy(true)
    try {
      await reschedule(rescheduleTarget.id, { date: rDate, time: rTime, note: rReason.trim() })
      showToast(`${rescheduleTarget.reference} rescheduled to ${formatDate(rDate)} at ${rTime}.`)
      setRescheduleTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to reschedule the appointment.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleBook = async (e) => {
    e.preventDefault()
    if (busy || !bPatient.trim()) return
    setBusy(true)
    try {
      await createAppointment({
        patient: bPatient.trim(),
        type: bType,
        reason: bReason.trim() || bType,
        date: bDate,
        time: bTime,
        staff: bStaff === 'Unassigned' ? '' : bStaff,
      })
      showToast('Appointment booked successfully.')
      setBPatient('')
      setBReason('')
      setBookOpen(false)
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
        add('Review', 'btn-info-small', () => setStatus(app, 'Under Review'))
        add('Approve', 'btn-success-small', () => setStatus(app, 'Approved'))
        add('Reject', 'btn-danger-small', () => openReasonModal(app, 'Rejected'))
        add('Reschedule', 'btn-warn-small', () => openReschedule(app))
        add('Cancel', 'btn-neutral-small', () => openReasonModal(app, 'Cancelled'))
        break
      case 'Under Review':
        add('Approve', 'btn-success-small', () => setStatus(app, 'Approved'))
        add('Reject', 'btn-danger-small', () => openReasonModal(app, 'Rejected'))
        add('Reschedule', 'btn-warn-small', () => openReschedule(app))
        add('Cancel', 'btn-neutral-small', () => openReasonModal(app, 'Cancelled'))
        break
      case 'Approved':
        add('Reschedule', 'btn-warn-small', () => openReschedule(app))
        add('Cancel', 'btn-neutral-small', () => openReasonModal(app, 'Cancelled'))
        break
      case 'Rescheduled':
        add('Approve', 'btn-success-small', () => setStatus(app, 'Approved'))
        add('Reject', 'btn-danger-small', () => openReasonModal(app, 'Rejected'))
        add('Cancel', 'btn-neutral-small', () => openReasonModal(app, 'Cancelled'))
        break
      default:
        break
    }
    return buttons
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setDateFilter('')
  }

  return (
    <div className="appointments-page">
      {/* Page header */}
      <section className="page-heading">
        <div>
          <p>{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <span className="page-heading-description">{page.description}</span>
        </div>
        <div className="quick-actions-bar">
          <button type="button" className="primary-action" onClick={() => setBookOpen(true)}>
            + Book Appointment
          </button>
        </div>
      </section>

      {/* Status summary chips (click to filter) */}
      <div className="appointments-summary">
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
            className={`summary-chip ${statusFilter === key ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === key ? 'All' : key)}
          >
            <small>{label}</small>
            <strong>{counts[key]}</strong>
          </button>
        ))}
      </div>

      {/* List panel */}
      <div className="panel main-panel appointments-list-panel">
        <div className="panel-header flex-header">
          <div>
            <h3>Appointment Requests & Records</h3>
            <p>Review, approve, reschedule, reject, or cancel clinic appointments</p>
          </div>
          <div className="appointments-toolbar">
            <input
              type="text"
              className="search-input toolbar-search"
              placeholder="Search patient, reference, reason, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter-select"
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
              className="filter-select toolbar-date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date"
            />
            {(search || statusFilter !== 'All' || dateFilter) && (
              <button type="button" className="secondary-pill" onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {!isLoading && !error && (
              <span className="results-count">
                {filtered.length} of {appointments.length} appointments
              </span>
            )}
          </div>
        </div>

        <div className="records-table-container">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : isLoading ? (
            <LoadingState label="Loading appointments..." />
          ) : (
            <table className="records-table">
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
                {filtered.map((app) => (
                  <tr key={app.id}>
                    <td className="bold-text text-teal font-monospace">{app.reference}</td>
                    <td>
                      <strong className="bold-text">{app.patient}</strong>
                      {app.patientId ? <span className="block-sub muted-text">{app.patientId}</span> : null}
                    </td>
                    <td>
                      <strong className="block-sub">{app.type}</strong>
                      <span className="block-sub muted-text">{app.reason}</span>
                    </td>
                    <td>
                      <span className="bold-text">{formatDate(app.date)}</span>
                      <span className="block-sub muted-text">{app.time}</span>
                    </td>
                    <td>{app.staff}</td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="actions-cell">
                      <div className="row-actions">
                        <button type="button" className="btn-view-small" onClick={() => setSelectedId(app.id)}>
                          View
                        </button>
                        {actionButtons(app)}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
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
      </div>

      {/* ================= VIEW APPOINTMENT DETAIL MODAL ================= */}
      {selected && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Appointment ${selected.reference} details`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null)
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <h3>Appointment Details — {selected.reference}</h3>
              <button type="button" className="btn-modal-close" onClick={() => setSelectedId(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="appointment-detail-banner">
                <StatusBadge status={selected.status} />
                <div>
                  <strong>{selected.patient}</strong>
                  <span className="block-sub muted-text">
                    Scheduled for {formatDate(selected.date)} at {selected.time}
                  </span>
                </div>
              </div>

              <div className="profile-details-grid">
                <div>
                  <span className="profile-lbl">Reference</span>
                  <p className="profile-val">{selected.reference}</p>
                </div>
                <div>
                  <span className="profile-lbl">Patient</span>
                  <p className="profile-val">{selected.patient}</p>
                </div>
                {selected.patientId ? (
                  <div>
                    <span className="profile-lbl">Patient ID</span>
                    <p className="profile-val">{selected.patientId}</p>
                  </div>
                ) : null}
                <div>
                  <span className="profile-lbl">Type</span>
                  <p className="profile-val">{selected.type}</p>
                </div>
                <div>
                  <span className="profile-lbl">Date</span>
                  <p className="profile-val">{formatDate(selected.date)}</p>
                </div>
                <div>
                  <span className="profile-lbl">Time</span>
                  <p className="profile-val">{selected.time}</p>
                </div>
                <div>
                  <span className="profile-lbl">Assigned Staff</span>
                  <p className="profile-val">{selected.staff}</p>
                </div>
                <div>
                  <span className="profile-lbl">Requested On</span>
                  <p className="profile-val">{formatDate(selected.requestedOn)}</p>
                </div>
              </div>

              <div className="profile-alert-box reason-box">
                <h4 className="text-teal">Reason for Visit</h4>
                <p>{selected.reason}</p>
              </div>

              {selected.notes ? (
                <div className="profile-alert-box notes-box">
                  <h4 className="alert-danger-text">Notes / History</h4>
                  <p className="notes-pre">{selected.notes}</p>
                </div>
              ) : null}

              {/* Status management */}
              <div className="status-manage-row">
                <label htmlFor="appointment-status-select" className="status-manage-label">
                  Appointment Status
                </label>
                <select
                  id="appointment-status-select"
                  className="filter-select"
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
            <div className="modal-footer">
              <div className="modal-footer-actions">
                {actionButtons(selected)}
                <button type="button" className="secondary-pill" onClick={() => setSelectedId(null)}>
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
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Reschedule appointment"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRescheduleTarget(null)
          }}
        >
          <div className="modal-card modal-card-sm">
            <div className="modal-header">
              <h3>Reschedule Appointment</h3>
              <button type="button" className="btn-modal-close" onClick={() => setRescheduleTarget(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="appointment-detail-banner">
                <StatusBadge status={rescheduleTarget.status} />
                <div>
                  <strong>{rescheduleTarget.patient}</strong>
                  <span className="block-sub muted-text">
                    Currently {formatDate(rescheduleTarget.date)} at {rescheduleTarget.time}
                  </span>
                </div>
              </div>
              <form
                className="sidebar-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  confirmReschedule()
                }}
              >
                <label>
                  New Date
                  <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} required />
                </label>
                <label>
                  New Time Slot
                  <select value={rTime} onChange={(e) => setRTime(e.target.value)} required>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Reason for Rescheduling (optional)
                  <textarea
                    placeholder="e.g. Patient requested a later slot due to class conflict"
                    value={rReason}
                    onChange={(e) => setRReason(e.target.value)}
                  />
                </label>
                <div className="modal-footer-actions">
                  <button
                    type="button"
                    className="secondary-pill"
                    onClick={() => setRescheduleTarget(null)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-action" disabled={busy}>
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
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${reasonTarget.action} appointment`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReasonTarget(null)
          }}
        >
          <div className="modal-card modal-card-sm">
            <div className="modal-header">
              <h3>{reasonTarget.action} Appointment</h3>
              <button type="button" className="btn-modal-close" onClick={() => setReasonTarget(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="appointment-detail-banner">
                <StatusBadge status={reasonTarget.app.status} />
                <div>
                  <strong>{reasonTarget.app.patient}</strong>
                  <span className="block-sub muted-text">
                    {reasonTarget.app.reference} · {formatDate(reasonTarget.app.date)} at {reasonTarget.app.time}
                  </span>
                </div>
              </div>
              <form
                className="sidebar-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  confirmReason()
                }}
              >
                <label>
                  Reason for {reasonTarget.action} (optional but recommended)
                  <textarea
                    placeholder={`Explain why this appointment is being ${reasonTarget.action.toLowerCase()}...`}
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    autoFocus
                  />
                </label>
                <div className="modal-footer-actions">
                  <button
                    type="button"
                    className="secondary-pill"
                    onClick={() => setReasonTarget(null)}
                    disabled={busy}
                  >
                    Keep Appointment
                  </button>
                  <button type="submit" className="btn-action-danger" disabled={busy}>
                    {busy ? 'Saving...' : `Confirm ${reasonTarget.action}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOOK APPOINTMENT MODAL ================= */}
      {bookOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Book a new appointment"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setBookOpen(false)
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <h3>Book New Appointment</h3>
              <button type="button" className="btn-modal-close" onClick={() => setBookOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form className="sidebar-form" onSubmit={handleBook}>
                <label>
                  Patient Name
                  <input
                    type="text"
                    placeholder="Enter patient name"
                    value={bPatient}
                    onChange={(e) => setBPatient(e.target.value)}
                    required
                  />
                </label>
                <div className="form-row-grid">
                  <label>
                    Appointment Type
                    <select value={bType} onChange={(e) => setBType(e.target.value)}>
                      {APPOINTMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assigned Staff
                    <select value={bStaff} onChange={(e) => setBStaff(e.target.value)}>
                      <option value="Unassigned">Unassigned</option>
                      {staff.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Reason for Visit
                  <textarea
                    placeholder="Describe the reason for the visit"
                    value={bReason}
                    onChange={(e) => setBReason(e.target.value)}
                  />
                </label>
                <div className="form-row-grid">
                  <label>
                    Date
                    <input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} required />
                  </label>
                  <label>
                    Time Slot
                    <select value={bTime} onChange={(e) => setBTime(e.target.value)}>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="modal-footer-actions">
                  <button type="button" className="secondary-pill" onClick={() => setBookOpen(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-action" disabled={busy}>
                    {busy ? 'Booking...' : 'Book Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}

export default Appointments
