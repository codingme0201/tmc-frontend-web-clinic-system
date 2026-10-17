import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppointments, useFollowUpOptions } from '../hooks/useAppointments'
import { usePatients } from '../hooks/usePatients'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { useModal } from '../hooks/useModal'
import { useForm, useWatch } from 'react-hook-form'
import { usePagination } from '../hooks/usePagination'
import { formatDate, todayISO } from '../lib/format'
import {
  APPOINTMENT_TYPES, TIME_SLOTS, VISIT_TYPES, VISIT_NEW, VISIT_FOLLOW_UP, roleLabel, isSlotClosed, departmentForType,
} from '../lib/clinic'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT, SIDEBAR_FORM,
  FORM_LABEL, FORM_FIELD, FORM_ROW, BTN_ACTION_SUCCESS, BTN_ACTION_DANGER,
} from '../lib/ui'
import Icon from '../components/Icon'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import VisitTypeBadge from '../components/VisitTypeBadge'
import ClinicianSelect from '../components/ClinicianSelect'
import { EmptyState, ErrorState } from '../components/AsyncState'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import StudentSelect from '../components/StudentSelect'

const STATUSES = ['Pending', 'Under Review', 'Approved', 'Rescheduled', 'Rejected', 'Cancelled', 'Completed', 'No-Show']
const ACTIVE_STATUSES = ['Pending', 'Under Review', 'Approved', 'Rescheduled']
// Statuses from which the appointment state machine allows Approve / Reject.
const REVIEWABLE_STATUSES = ['Pending', 'Under Review', 'Rescheduled']

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
const SECTION = 'rounded-lg border border-line p-[14px_16px]'
const SECTION_TITLE = 'm-0 mb-[10px] text-[12px] uppercase tracking-[0.02em] text-ink'
const ALERT_BOX = 'rounded-lg border border-[#f2cfc2] bg-[#fdf1ec] p-[12px_14px]'
const FOLLOW_UP_BOX = 'rounded-lg border border-[#d9ccf7] bg-[#f7f3ff] p-[12px_14px]'

const DEFAULT_BOOKING = {
  patient: '',
  patientId: '',
  type: 'Check-up',
  visitType: VISIT_NEW,
  previousConsultationId: '',
  reason: '',
  date: todayISO(),
  time: '09:00 AM',
  staffId: null,
}

function Appointments({ page }) {
  // Data comes from the shared appointment store; the page never touches
  // API data or services directly.
  const {
    data: appointments,
    isLoading,
    error,
    refetch,
    isRefetching,
    createAppointment,
    updateStatus,
    assignStaff,
  } = useAppointments()
  const { data: patients } = usePatients()
  const { can } = useAuth()
  const { showToast } = useToast()

  const canCreate = can('appointments.create')
  const canUpdate = can('appointments.update')
  const canApprove = can('appointments.approve')
  const canReject = can('appointments.reject')

  // Search / filter state
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [statusFilter, setStatusFilter] = useState('All')
  const [visitFilter, setVisitFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')

  // Modal state
  const [selectedId, setSelectedId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [reasonText, setReasonText] = useState('')
  const [assignDraft, setAssignDraft] = useState({ id: null, staffId: null })
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const bookModal = useModal()

  // Book appointment form
  const bookForm = useForm({ defaultValues: DEFAULT_BOOKING })
  const bookPatientId = useWatch({ control: bookForm.control, name: 'patientId' })
  const bookPatientName = useWatch({ control: bookForm.control, name: 'patient' })
  const bookVisitType = useWatch({ control: bookForm.control, name: 'visitType' })
  const bookType = useWatch({ control: bookForm.control, name: 'type' })
  const bookStaffId = useWatch({ control: bookForm.control, name: 'staffId' })
  const bookPreviousId = useWatch({ control: bookForm.control, name: 'previousConsultationId' })
  const bookDate = useWatch({ control: bookForm.control, name: 'date' })
  const isFollowUpBooking = bookVisitType === VISIT_FOLLOW_UP
  const { data: followUpOptions, isLoading: followUpOptionsLoading } = useFollowUpOptions(
    bookPatientId,
    bookModal.isOpen && isFollowUpBooking,
  )

  // Status summary counts
  const counts = useMemo(() => {
    const count = (status) => appointments.filter((a) => a.status === status).length
    return {
      Pending: count('Pending'),
      'Under Review': count('Under Review'),
      Approved: count('Approved'),
      Rejected: count('Rejected'),
      Cancelled: count('Cancelled'),
      'No-Show': count('No-Show'),
    }
  }, [appointments])

  // Search + filter pipeline (runs against the debounced query). The API
  // already returns appointments in first-in-first-out order (date, time
  // slot, check-in, booking time), so the list keeps that order.
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return appointments.filter((app) => {
      const matchQuery =
        !q ||
        app.patient.toLowerCase().includes(q) ||
        app.reference.toLowerCase().includes(q) ||
        app.reason.toLowerCase().includes(q) ||
        app.type.toLowerCase().includes(q) ||
        (app.staff || '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'All' || app.status === statusFilter
      const matchVisit = visitFilter === 'All' || app.visitType === visitFilter
      const matchDate = !dateFilter || app.date === dateFilter
      return matchQuery && matchStatus && matchVisit && matchDate
    })
  }, [appointments, debouncedSearch, statusFilter, visitFilter, dateFilter])

  // Client-side pagination over the filtered list; swap for API pagination
  // later without touching the table or the Pagination UI.
  const pagination = usePagination(filtered)
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  // Any search/filter change starts back at page 1.
  useEffect(() => {
    resetPage()
  }, [debouncedSearch, statusFilter, visitFilter, dateFilter, resetPage])

  // Keep the detail modal in sync with live store updates
  const selected = selectedId ? appointments.find((a) => a.id === selectedId) || null : null
  const selectedPatient = selected?.patientId ? patients.find((p) => p.patientId === selected.patientId) || null : null
  // The doctor picker starts from the current assignment of the open appointment.
  const assignStaffId = assignDraft.id === selectedId ? assignDraft.staffId : selected?.staffId || null
  const assignChanged = Boolean(selected) && (assignStaffId || null) !== (selected.staffId || null)

  const runAction = async (action, success, fallback) => {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true)
    try {
      const result = await action()
      showToast(typeof success === 'function' ? success(result) : success)
      return true
    } catch (err) {
      showToast(err?.message || fallback, 'error')
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleApprove = (app) =>
    runAction(() => updateStatus(app.id, 'Approved'), `${app.reference} approved.`, 'Failed to approve the appointment.')

  const openReject = (app) => {
    setRejectTarget(app)
    setReasonText('')
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    const note = reasonText.trim() ? `Rejected — ${reasonText.trim()}` : ''
    const ok = await runAction(
      () => updateStatus(rejectTarget.id, 'Rejected', note),
      `${rejectTarget.reference} rejected.`,
      'Failed to reject the appointment.',
    )
    if (ok) setRejectTarget(null)
  }

  const saveAssignment = () => {
    if (!selected) return
    runAction(
      () => assignStaff(selected.id, assignStaffId),
      (updated) => (updated.staffId ? `${updated.staff} assigned to ${updated.reference}.` : `${updated.reference} is now unassigned.`),
      'Failed to assign the doctor.',
    )
  }

  const openDetails = (app) => {
    setSelectedId(app.id)
    setAssignDraft({ id: app.id, staffId: app.staffId || null })
  }

  const openBook = () => {
    bookForm.reset({ ...DEFAULT_BOOKING, date: todayISO() })
    bookModal.open()
  }

  const handleBook = async ({ patient, patientId, type, visitType, previousConsultationId, reason, date, time, staffId }) => {
    if (visitType === VISIT_FOLLOW_UP && !patientId) {
      showToast('Select a registered student so the follow-up can be linked to their previous visit.', 'error')
      return
    }
    const ok = await runAction(
      () =>
        createAppointment({
          patient: patient.trim(),
          patientId: patientId ? patientId.trim() : '',
          type,
          visitType,
          previousConsultationId: visitType === VISIT_FOLLOW_UP ? previousConsultationId || null : null,
          reason: reason.trim() || type,
          date,
          time,
          staffId,
        }),
      'Appointment booked successfully.',
      'Failed to book the appointment.',
    )
    if (ok) bookModal.close()
  }

  const clearFilters = () => {
    resetSearch()
    setStatusFilter('All')
    setVisitFilter('All')
    setDateFilter('')
  }

  const doctorCell = (app) =>
    app.staffId ? (
      <>
        <strong className="block font-bold text-ink">{app.staff}</strong>
        <span className="block text-[11.5px] text-muted">{roleLabel(app.staffRole)}</span>
      </>
    ) : (
      <span className="font-bold text-[#a33c12]">Not yet assigned</span>
    )

  const canReview = selected && REVIEWABLE_STATUSES.includes(selected.status)
  const canAssign = selected && canUpdate && ACTIVE_STATUSES.includes(selected.status)

  return (
    <div>
      {/* Page header */}
      <section className="mb-5 flex items-center justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase text-primary mb-1">
            {page.eyebrow}
          </span>
          <h2 className="m-0 text-[22px] sm:text-[30px] md:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
            {page.title}
          </h2>
          <span className="mt-1 block text-[12.5px] sm:text-[13px] text-muted">{page.description}</span>
        </div>
        {canCreate && (
          <div className="w-full sm:w-auto">
            <button type="button" className={`${PRIMARY_BTN} w-full sm:w-auto`} onClick={openBook}>
              + Book Appointment
            </button>
          </div>
        )}
      </section>

      {/* Status summary chips (click to filter) */}
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {[
          { key: 'Pending', label: 'Pending', dot: 'bg-gold' },
          { key: 'Under Review', label: 'Under Review', dot: 'bg-[#1a56c4]' },
          { key: 'Approved', label: 'Approved', dot: 'bg-success' },
          { key: 'Rejected', label: 'Rejected', dot: 'bg-accent' },
          { key: 'Cancelled', label: 'Cancelled', dot: 'bg-muted' },
          { key: 'No-Show', label: 'No-Show', dot: 'bg-[#d9534f]' },
        ].map(({ key, label, dot }) => (
          <button
            type="button"
            key={key}
            className={`group flex cursor-pointer flex-col justify-between gap-1.5 rounded-2xl border bg-white p-3 sm:p-4 text-left shadow-[0_4px_20px_rgba(18,57,59,0.05)] transition-all duration-150 hover:border-primary/50 hover:shadow-xs active:scale-[0.98] ${
              statusFilter === key
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-line-strong/80'
            }`}
            onClick={() => setStatusFilter(statusFilter === key ? 'All' : key)}
          >
            <div className="flex items-center justify-between gap-1">
              <small className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted truncate">
                {label}
              </small>
              <span className={`size-2 rounded-full ${dot}`} />
            </div>
            <strong className="text-[22px] sm:text-[26px] font-extrabold leading-none text-ink tracking-tight">
              {counts[key]}
            </strong>
          </button>
        ))}
      </div>

      {/* List panel */}
      <div className={`${PANEL} p-4 sm:p-5`}>
        <div className="mb-4 sm:mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[17px] sm:text-[18px] font-bold text-[#143d40]">Appointment Requests & Records</h3>
            <p className={KICKER}>First in, first out · click an appointment to review it</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
            <input
              type="text"
              className={`${SEARCH_INPUT} w-full sm:w-auto sm:min-w-[200px] sm:flex-[1_1_220px]`}
              placeholder="Search patient, reference, reason, doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={`${SELECT_INPUT} flex-1 sm:flex-initial`}
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
              <select
                className={`${SELECT_INPUT} flex-1 sm:flex-initial`}
                value={visitFilter}
                onChange={(e) => setVisitFilter(e.target.value)}
                aria-label="Filter by visit type"
              >
                <option value="All">All Visit Types</option>
                {VISIT_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className={`${SELECT_INPUT} flex-1 sm:flex-initial sm:min-w-[150px]`}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="Filter by date"
              />
            </div>
            {(search || statusFilter !== 'All' || visitFilter !== 'All' || dateFilter) && (
              <button type="button" className={PILL} onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {!isLoading && !error && (
              <div className="flex items-center gap-2 sm:ml-auto">
                <RefreshingBadge refreshing={isRefetching} />
                <span className="whitespace-nowrap text-[12px] font-bold text-muted">
                  {filtered.length} of {appointments.length} appointments
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line-strong/80 shadow-2xs">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : isLoading ? (
            <TableSkeleton columns={6} />
          ) : (
            <table className={`${TABLE} [&_tbody_tr[data-row]]:cursor-pointer [&_tbody_tr[data-row]:hover]:bg-[#f7fbfb]`}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Schedule</th>
                  <th>Doctor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((app) => (
                  <tr
                    key={app.id}
                    data-row
                    tabIndex={0}
                    title="Click to view the appointment details"
                    onClick={() => openDetails(app)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openDetails(app)
                      }
                    }}
                  >
                    <td className="font-mono font-bold text-primary">{app.reference}</td>
                    <td>
                      <strong className="font-bold text-ink">{app.patient}</strong>
                      {app.patientId ? <span className="block text-[12px] text-muted">{app.patientId}</span> : null}
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <strong className="text-[12px]">{app.type}</strong>
                        <VisitTypeBadge visitType={app.visitType} compact />
                      </div>
                    </td>
                    <td>
                      <span className="font-bold text-ink">{formatDate(app.date)}</span>
                      <span className="block text-[12px] text-muted">{app.time}</span>
                    </td>
                    <td>{doctorCell(app)}</td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6">
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

      {/* ================= APPOINTMENT DETAILS MODAL ================= */}
      {selected && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Appointment ${selected.reference} details`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setSelectedId(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Appointment — {selected.reference}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => setSelectedId(null)} disabled={busy}>
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <div className="min-w-0 flex-1">
                  <span className={PROFILE_LBL}>Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                <VisitTypeBadge visitType={selected.visitType} />
              </div>

              <div className="grid gap-[14px]">
                <section className={SECTION}>
                  <h4 className={SECTION_TITLE}>Patient Information</h4>
                  <div className={PROFILE_GRID}>
                    <div>
                      <span className={PROFILE_LBL}>Patient</span>
                      <p className={PROFILE_VAL}>{selected.patient}</p>
                    </div>
                    <div>
                      <span className={PROFILE_LBL}>Patient ID</span>
                      <p className={PROFILE_VAL}>{selected.patientId || 'Walk-in (not registered)'}</p>
                    </div>
                    {selectedPatient ? (
                      <>
                        <div>
                          <span className={PROFILE_LBL}>Course / Department</span>
                          <p className={PROFILE_VAL}>{selectedPatient.courseDept || '—'}</p>
                        </div>
                        <div>
                          <span className={PROFILE_LBL}>Age</span>
                          <p className={PROFILE_VAL}>{selectedPatient.age || '—'}</p>
                        </div>
                        <div>
                          <span className={PROFILE_LBL}>Contact Number</span>
                          <p className={PROFILE_VAL}>{selectedPatient.contact || '—'}</p>
                        </div>
                        <div>
                          <span className={PROFILE_LBL}>Emergency Contact</span>
                          <p className={PROFILE_VAL}>{selectedPatient.emergencyContact || '—'}</p>
                        </div>
                      </>
                    ) : null}
                  </div>
                  {selectedPatient?.allergies && selectedPatient.allergies !== 'None' ? (
                    <p className="m-0 mt-3 text-[12.5px] font-bold text-danger">⚠ Allergies: {selectedPatient.allergies}</p>
                  ) : null}
                </section>

                <section className={SECTION}>
                  <h4 className={SECTION_TITLE}>Appointment Details</h4>
                  <div className={PROFILE_GRID}>
                    <div>
                      <span className={PROFILE_LBL}>Appointment Type</span>
                      <p className={PROFILE_VAL}>{selected.type}</p>
                    </div>
                    <div>
                      <span className={PROFILE_LBL}>Department</span>
                      <p className={PROFILE_VAL}>{departmentForType(selected.type)}</p>
                    </div>
                    <div>
                      <span className={PROFILE_LBL}>Schedule</span>
                      <p className={PROFILE_VAL}>
                        {formatDate(selected.date)} · {selected.time}
                      </p>
                    </div>
                    <div>
                      <span className={PROFILE_LBL}>Requested On</span>
                      <p className={PROFILE_VAL}>{formatDate(selected.requestedOn)}</p>
                    </div>
                    {selected.queueNumber ? (
                      <div>
                        <span className={PROFILE_LBL}>Queue</span>
                        <p className={PROFILE_VAL}>#{selected.queueNumber} (checked in)</p>
                      </div>
                    ) : null}
                    {selected.consultation ? (
                      <div>
                        <span className={PROFILE_LBL}>Consultation</span>
                        <p className={PROFILE_VAL}>
                          {selected.consultation.reference} · {selected.consultation.status}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className={`${ALERT_BOX} mt-3 border-[#cfe5df] bg-[#f4faf8]`}>
                    <h4 className="mb-1 m-0 text-[13px] text-primary">Reason for Visit</h4>
                    <p className="m-0 text-[13px]">{selected.reason}</p>
                  </div>

                  {selected.isFollowUp && (
                    <div className={`${FOLLOW_UP_BOX} mt-3`}>
                      <h4 className="mb-1 m-0 text-[13px] font-extrabold text-[#6b46c1]">↺ Follow-up Visit — Reason for Returning</h4>
                      {selected.previousConsultation ? (
                        <div className="text-[13px] text-ink">
                          <p className="m-0">
                            Continues <strong>{selected.previousConsultation.reference}</strong> on{' '}
                            {formatDate(selected.previousConsultation.date)}
                            {selected.previousConsultation.staff ? ` with ${selected.previousConsultation.staff}` : ''}.
                          </p>
                          {selected.previousConsultation.diagnosis ? (
                            <p className="m-0 mt-1"><strong>Previous diagnosis:</strong> {selected.previousConsultation.diagnosis}</p>
                          ) : null}
                          {selected.previousConsultation.treatment ? (
                            <p className="m-0"><strong>Treatment given:</strong> {selected.previousConsultation.treatment}</p>
                          ) : null}
                          {selected.previousConsultation.followUpNotes ? (
                            <p className="m-0"><strong>Follow-up instructions:</strong> {selected.previousConsultation.followUpNotes}</p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="m-0 text-[13px] text-muted">No previous consultation was linked to this follow-up.</p>
                      )}
                    </div>
                  )}

                  {selected.notes ? (
                    <div className={`${ALERT_BOX} mt-3`}>
                      <h4 className="mb-1 m-0 text-[13px] font-bold text-danger">Notes / History</h4>
                      <p className="m-0 whitespace-pre-line text-[13px]">{selected.notes}</p>
                    </div>
                  ) : null}
                </section>

                <section className={SECTION}>
                  <h4 className={SECTION_TITLE}>{canAssign ? 'Assign Doctor' : 'Doctor'}</h4>
                  {canAssign ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <ClinicianSelect
                        roles={['doctor']}
                        department={departmentForType(selected.type)}
                        value={assignStaffId}
                        onChange={(id) => setAssignDraft({ id: selected.id, staffId: id })}
                        unassignedLabel={`Select a ${departmentForType(selected.type)} doctor`}
                        disabled={busy}
                        aria-label="Assign doctor"
                      />
                      <button
                        type="button"
                        className={`${PRIMARY_BTN} min-h-10 shrink-0 px-[14px] text-[13px]`}
                        onClick={saveAssignment}
                        disabled={busy || !assignChanged}
                      >
                        {busy ? 'Saving...' : 'Save Doctor'}
                      </button>
                    </div>
                  ) : (
                    <p className={PROFILE_VAL}>
                      {selected.staffId ? selected.staff : 'Not yet assigned'}
                      {selected.staffId ? <span className="block text-[12px] font-bold text-muted">{roleLabel(selected.staffRole)}</span> : null}
                    </p>
                  )}
                  {canAssign && (
                    <p className="m-0 mt-2 text-[12px] text-muted">
                      Only {departmentForType(selected.type)} doctors are listed. The system checks the doctor&apos;s
                      schedule and existing bookings for {selected.time}.
                    </p>
                  )}
                </section>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                {canReview && canReject && (
                  <button type="button" className={BTN_ACTION_DANGER} onClick={() => openReject(selected)} disabled={busy}>
                    <Icon name="x" size={16} />
                    Reject
                  </button>
                )}
                {canReview && canApprove && (
                  <button type="button" className={BTN_ACTION_SUCCESS} onClick={() => handleApprove(selected)} disabled={busy}>
                    <Icon name="check" size={16} />
                    {busy ? 'Saving...' : 'Approve'}
                  </button>
                )}
                {!canReview && (
                  <span className="text-[12px] font-bold text-muted">This appointment is {selected.status} — no review needed.</span>
                )}
                <button type="button" className={PILL} onClick={() => setSelectedId(null)} disabled={busy}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= REJECT REASON MODAL ================= */}
      {rejectTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Reject appointment"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setRejectTarget(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Reject Appointment</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => setRejectTarget(null)} disabled={busy}>
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <StatusBadge status={rejectTarget.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{rejectTarget.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {rejectTarget.reference} · {formatDate(rejectTarget.date)} at {rejectTarget.time}
                  </span>
                </div>
              </div>
              <form
                className={SIDEBAR_FORM}
                onSubmit={(e) => {
                  e.preventDefault()
                  confirmReject()
                }}
              >
                <label className={FORM_LABEL}>
                  Reason for rejecting (shared with the student)
                  <textarea
                    placeholder="Explain why this appointment is being rejected..."
                    className={`${FORM_FIELD} min-h-20 resize-y`}
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    autoFocus
                  />
                </label>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={() => setRejectTarget(null)} disabled={busy}>
                    Keep Appointment
                  </button>
                  <button type="submit" className={`${BTN_ACTION_DANGER} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    <Icon name="x" size={16} />
                    {busy ? 'Saving...' : 'Confirm Reject'}
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
            if (e.target === e.currentTarget && !busy) bookModal.close()
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
              <form
                className={SIDEBAR_FORM}
                onSubmit={(e) => {
                  bookForm.handleSubmit(handleBook, () => showToast('Please fill in the required fields.', 'error'))(e)
                }}
              >
                <label className={FORM_LABEL}>
                  <span>Student / Patient *</span>
                  <StudentSelect
                    value={bookPatientId || bookPatientName}
                    valueKey="patientId"
                    allowCustomInput
                    placeholder="Type student name or ID (e.g. 24-012345)..."
                    onChange={(val, student) => {
                      if (student) {
                        bookForm.setValue('patient', student.name)
                        bookForm.setValue('patientId', student.patientId)
                      } else {
                        bookForm.setValue('patient', val || '')
                        bookForm.setValue('patientId', '')
                      }
                      bookForm.setValue('previousConsultationId', '')
                    }}
                  />
                  {!bookPatientName && (
                    <input
                      type="hidden"
                      {...bookForm.register('patient', { required: 'Student / Patient is required.' })}
                    />
                  )}
                </label>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Visit Type
                    <select className={FORM_FIELD} {...bookForm.register('visitType')}>
                      {VISIT_TYPES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={FORM_LABEL}>
                    Appointment Type
                    <select
                      className={FORM_FIELD}
                      {...bookForm.register('type', {
                        onChange: () => bookForm.setValue('staffId', null),
                      })}
                    >
                      {APPOINTMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {isFollowUpBooking && (
                  <div className={FOLLOW_UP_BOX}>
                    <label className={FORM_LABEL}>
                      Previous Consultation (reason for returning)
                      <select
                        className={FORM_FIELD}
                        value={bookPreviousId || ''}
                        disabled={!bookPatientId || followUpOptionsLoading}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : ''
                          bookForm.setValue('previousConsultationId', id)
                          const previous = followUpOptions.find((c) => c.id === id)
                          if (previous?.staffId && !bookStaffId) bookForm.setValue('staffId', previous.staffId)
                        }}
                      >
                        <option value="">
                          {!bookPatientId
                            ? 'Select a registered student first'
                            : followUpOptionsLoading
                              ? 'Loading previous visits…'
                              : followUpOptions.length === 0
                                ? 'No completed consultations found'
                                : 'Select the visit being followed up'}
                        </option>
                        {followUpOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.reference} · {formatDate(c.date)}
                            {c.diagnosis ? ` · ${c.diagnosis}` : ''}
                            {c.staff ? ` · ${c.staff}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="m-0 mt-1.5 text-[11.5px] text-muted">
                      The doctor will see this previous visit on the appointment and in the consultation.
                    </p>
                  </div>
                )}
                <label className={FORM_LABEL}>
                  Assign Doctor
                  <ClinicianSelect
                    roles={['doctor']}
                    department={departmentForType(bookType)}
                    value={bookStaffId}
                    onChange={(id) => bookForm.setValue('staffId', id)}
                    unassignedLabel="Assign later"
                  />
                </label>
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
                    <input type="date" min={todayISO()} className={FORM_FIELD} {...bookForm.register('date', { required: 'A date is required.' })} />
                  </label>
                  <label className={FORM_LABEL}>
                    Time Slot (8:00 AM – 5:00 PM)
                    <select className={FORM_FIELD} {...bookForm.register('time')}>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t} disabled={isSlotClosed(bookDate, t)}>
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
