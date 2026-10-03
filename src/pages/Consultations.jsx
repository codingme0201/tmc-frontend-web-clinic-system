import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useConsultations } from '../hooks/useConsultations'
import { usePatients } from '../hooks/usePatients'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { useModal } from '../hooks/useModal'
import { usePagination } from '../hooks/usePagination'
import { useAuth } from '../hooks/useAuth'
import { formatDate, timeToMinutes, todayISO } from '../lib/format'
import { TIME_SLOTS, VISIT_TYPES, VISIT_NEW, VISIT_FOLLOW_UP, currentSlot } from '../lib/clinic'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
  BTN_SUCCESS, BTN_INFO, BTN_VIEW, DISPO_TAG, dispoClasses,
} from '../lib/ui'
import StatusBadge from '../components/StatusBadge'
import VisitTypeBadge from '../components/VisitTypeBadge'
import ClinicianSelect from '../components/ClinicianSelect'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import StudentSelect from '../components/StudentSelect'
import { EmptyState, ErrorState } from '../components/AsyncState'

// Roles permitted to start/record/complete consultations.
const MEDICAL_ROLES = ['admin', 'doctor', 'nurse']

const STATUSES = ['Scheduled', 'In Progress', 'Completed']

// Lists sort active work first: In Progress → Scheduled → Completed.
const STATUS_ORDER = { 'In Progress': 0, Scheduled: 1, Completed: 2 }

const DISPOSITIONS = ['Sent to Class', 'Sent Home', 'Rest in Clinic', 'Referred to Hospital']

// Fields that must be filled in before a consultation can be completed.
const REQUIRED_FIELDS = [
  { key: 'chiefComplaint', label: 'Chief Complaint', section: 'complaint' },
  { key: 'temperature', label: 'Temperature', section: 'vitals' },
  { key: 'bloodPressure', label: 'Blood Pressure', section: 'vitals' },
  { key: 'diagnosis', label: 'Assessment / Diagnosis', section: 'diagnosis' },
  { key: 'treatment', label: 'Treatment and Advice', section: 'treatment' },
]

const MODAL_CARD = 'flex max-h-[90vh] w-[min(650px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_CARD_SM = MODAL_CARD + ' w-[min(480px,100%)]'
const MODAL_CARD_WIDE = MODAL_CARD + ' w-[min(780px,100%)]'
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
const REASON_BOX = ALERT_BOX + ' border-[#cfe5df] bg-[#f4faf8]'
const CONSULT_FIELD = 'flex flex-col gap-[5px] text-[12.5px] font-extrabold text-ink'
const CONSULT_INPUT = 'w-full rounded-md border border-[#d4e4e0] bg-white p-[9px_10px] text-[13px] text-ink'
const FOLLOW_UP_BOX = 'rounded-lg border border-[#d9ccf7] bg-[#f7f3ff] p-[12px_14px]'

// Tomorrow's date (ISO) — follow-ups are scheduled on a later day.
function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// Short follow-up status shown in lists and details.
function followUpLabel(cons) {
  if (cons.followUpAppointment) {
    return `Follow-up ${formatDate(cons.followUpAppointment.date)} · ${cons.followUpAppointment.time}`
  }
  if (cons.followUpRequired) {
    return cons.followUpDate ? `Follow-up due ${formatDate(cons.followUpDate)}` : 'Follow-up needed'
  }
  return ''
}

// Maps a consultation record to editable draft fields.
function consultationToDraft(consultation) {
  return {
    staffId: consultation.staffId || null,
    chiefComplaint: consultation.chiefComplaint || '',
    temperature: consultation.vitals?.temperature || '',
    bloodPressure: consultation.vitals?.bloodPressure || '',
    pulseRate: consultation.vitals?.pulseRate || '',
    respiratoryRate: consultation.vitals?.respiratoryRate || '',
    height: consultation.vitals?.height || '',
    weight: consultation.vitals?.weight || '',
    clinicalFindings: consultation.clinicalFindings || '',
    diagnosis: consultation.diagnosis || '',
    treatment: consultation.treatment || '',
    disposition: consultation.disposition || '',
    followUpRequired: Boolean(consultation.followUpRequired),
    followUpDate: consultation.followUpDate || '',
    followUpTime: '09:00 AM',
    followUpNotes: consultation.followUpNotes || '',
  }
}

// Maps the draft back to the consultation record shape.
function draftToPatch(draft) {
  return {
    ...(draft.staffId ? { staff_id: draft.staffId } : {}),
    chiefComplaint: draft.chiefComplaint.trim(),
    vitals: {
      temperature: draft.temperature.trim(),
      bloodPressure: draft.bloodPressure.trim(),
      pulseRate: draft.pulseRate.trim(),
      respiratoryRate: draft.respiratoryRate.trim(),
      height: draft.height.trim(),
      weight: draft.weight.trim(),
    },
    clinicalFindings: draft.clinicalFindings.trim(),
    diagnosis: draft.diagnosis.trim(),
    treatment: draft.treatment.trim(),
    disposition: draft.disposition,
    followUpRequired: draft.followUpRequired,
    followUpNotes: draft.followUpRequired ? draft.followUpNotes.trim() : '',
  }
}

// Completion payload: the draft plus the follow-up booking (date + slot).
function draftToCompletion(draft) {
  return {
    ...draftToPatch(draft),
    ...(draft.followUpRequired && draft.followUpDate
      ? { followUpDate: draft.followUpDate, followUpTime: draft.followUpTime }
      : {}),
  }
}

// Returns { section: [missing labels] } for the required fields.
function validateDraft(draft) {
  const errors = {}
  for (const field of REQUIRED_FIELDS) {
    if (!String(draft[field.key] || '').trim()) {
      if (!errors[field.section]) errors[field.section] = []
      errors[field.section].push(field.label)
    }
  }
  return errors
}

function Consultations({ page }) {
  // Data comes from the shared consultation store; the page never touches
  // API data or services directly.
  const {
    data: consultations,
    isLoading,
    error,
    refetch,
    isRefetching,
    addConsultation,
    startConsultation,
    saveConsultation,
    completeConsultation,
    scheduleFollowUp,
  } = useConsultations()
  const { data: patients = [] } = usePatients()
  const { showToast } = useToast()
  const { userRole, user, can } = useAuth()
  const canRecord = MEDICAL_ROLES.includes(userRole)
  const canScheduleFollowUp = can('consultations.update')
  const [searchParams, setSearchParams] = useSearchParams()

  // Search / filter state
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [statusFilter, setStatusFilter] = useState('All')
  const [visitFilter, setVisitFilter] = useState('All')

  // Modal state
  const [workspace, setWorkspace] = useState(null) // consultation being recorded
  const [details, setDetails] = useState(null) // read-only details target
  const initialPatientParam = searchParams.get('patientId')
  const [newConsultModalOpen, setNewConsultModalOpen] = useState(() => Boolean(initialPatientParam))
  const [selectedPatientId, setSelectedPatientId] = useState(() => initialPatientParam || '')
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [newComplaint, setNewComplaint] = useState('')
  const [newDate, setNewDate] = useState(() => todayISO())
  const [newTime, setNewTime] = useState(() => currentSlot())
  const [newVisitType, setNewVisitType] = useState(VISIT_NEW)
  const [newPreviousId, setNewPreviousId] = useState('')
  const [followUpTarget, setFollowUpTarget] = useState(null)
  const [followUpForm, setFollowUpForm] = useState({ date: '', time: '09:00 AM', notes: '' })

  const confirmComplete = useModal()
  const [busy, setBusy] = useState(false)
  // Ref latch guards against double-submission within the same render tick
  // (state-based `busy` only protects after the next re-render).
  const busyRef = useRef(false)

  // Clear search param once captured to prevent re-opening on page interaction
  useEffect(() => {
    if (searchParams.get('patientId')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('patientId')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Workspace draft form
  const [draft, setDraft] = useState(() => consultationToDraft({}))
  const [draftErrors, setDraftErrors] = useState({})

  // Status summary counts
  const counts = useMemo(() => {
    const count = (status) => consultations.filter((c) => c.status === status).length
    return {
      Scheduled: count('Scheduled'),
      'In Progress': count('In Progress'),
      Completed: count('Completed'),
    }
  }, [consultations])

  // Search + filter pipeline (runs against the debounced query)
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return consultations
      .filter((cons) => {
        const matchStatus = statusFilter === 'All' || cons.status === statusFilter
        const matchVisit = visitFilter === 'All' || cons.visitType === visitFilter
        const matchQuery =
          !q ||
          cons.patient.toLowerCase().includes(q) ||
          cons.reference.toLowerCase().includes(q) ||
          (cons.chiefComplaint || '').toLowerCase().includes(q) ||
          (cons.diagnosis || '').toLowerCase().includes(q) ||
          cons.staff.toLowerCase().includes(q)
        return matchStatus && matchVisit && matchQuery
      })
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (statusDiff !== 0) return statusDiff
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return timeToMinutes(a.time) - timeToMinutes(b.time)
      })
  }, [consultations, debouncedSearch, statusFilter, visitFilter])

  // Client-side pagination over the filtered list; swap for API pagination later.
  const pagination = usePagination(filtered)
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  // Any search/filter change starts back at page 1.
  useEffect(() => {
    resetPage()
  }, [debouncedSearch, statusFilter, visitFilter, resetPage])

  // Completed visits of a patient (newest first), for follow-up context.
  const patientHistory = useCallback(
    (patientId, excludeId = null) =>
      consultations
        .filter((c) => c.patientId && c.patientId === patientId && c.status === 'Completed' && c.id !== excludeId)
        .sort((a, b) => b.date.localeCompare(a.date) || timeToMinutes(b.time) - timeToMinutes(a.time)),
    [consultations],
  )
  const newPatientHistory = useMemo(() => patientHistory(selectedPatientId), [patientHistory, selectedPatientId])
  const workspaceHistory = useMemo(
    () => (workspace ? patientHistory(workspace.patientId, workspace.id).slice(0, 5) : []),
    [patientHistory, workspace],
  )

  // ---------------- Workspace helpers ----------------

  const openWorkspace = (consultation) => {
    setDraft(consultationToDraft(consultation))
    setDraftErrors({})
    setWorkspace(consultation)
  }

  const updateDraft = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }))
    // Once errors have been shown, keep them live so they clear as the user types.
    setDraftErrors((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev
      return validateDraft({ ...draft, [key]: value })
    })
  }

  const handleStart = async (consultation) => {
    if (!canRecord || busy || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const started = await startConsultation(consultation.id)
      showToast(`Consultation ${started.reference} started.`)
      openWorkspace(started)
    } catch (err) {
      showToast(err?.message || 'Failed to start the consultation.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleSaveProgress = async () => {
    if (!workspace || busy || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await saveConsultation(workspace.id, draftToPatch(draft))
      showToast('Consultation progress saved.')
    } catch (err) {
      showToast(err?.message || 'Failed to save the consultation progress.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleCompleteClick = () => {
    if (!workspace || busy || busyRef.current) return
    const errors = validateDraft(draft)
    if (draft.followUpRequired && draft.followUpDate && draft.followUpDate <= todayISO()) {
      errors.followUp = ['Follow-up date must be after today']
    }
    setDraftErrors(errors)
    if (Object.keys(errors).length > 0) {
      showToast('Please complete the required fields before finishing the consultation.', 'error')
      return
    }
    confirmComplete.open()
  }

  const handleConfirmComplete = async () => {
    if (!workspace || busy || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const completed = await completeConsultation(workspace.id, draftToCompletion(draft))
      showToast(
        completed.followUpAppointment
          ? `Consultation ${completed.reference} completed. Follow-up booked for ${formatDate(completed.followUpAppointment.date)} at ${completed.followUpAppointment.time}.`
          : `Consultation ${completed.reference} completed successfully.`,
      )
      confirmComplete.close()
      setWorkspace(null)
      setDraftErrors({})
    } catch (err) {
      showToast(err?.message || 'Failed to complete the consultation.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleCreateConsultation = async (startImmediately = false) => {
    if (!selectedPatientId) {
      showToast('Please select a patient.', 'error')
      return
    }
    const pat = patients.find((p) => p.patientId === selectedPatientId || String(p.id) === String(selectedPatientId))
    if (!pat) {
      showToast('Selected patient not found.', 'error')
      return
    }
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const created = await addConsultation({
        patient: pat.name,
        patient_id: pat.patientId,
        staff_id: selectedStaffId || (MEDICAL_ROLES.slice(1).includes(userRole) ? user?.id : null) || null,
        chiefComplaint: newComplaint.trim(),
        date: newDate,
        time: newTime,
        visit_type: newVisitType,
        previous_consultation_id: newVisitType === VISIT_FOLLOW_UP ? newPreviousId || null : null,
        status: startImmediately ? 'In Progress' : 'Scheduled',
      })
      showToast(`Consultation created for ${pat.name}.`)
      setNewConsultModalOpen(false)
      setSelectedPatientId('')
      setNewComplaint('')
      setNewVisitType(VISIT_NEW)
      setNewPreviousId('')
      if (startImmediately) {
        openWorkspace(created)
      }
    } catch (err) {
      showToast(err?.message || 'Failed to create consultation.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const openFollowUp = (cons) => {
    setFollowUpTarget(cons)
    setFollowUpForm({ date: cons.followUpDate && cons.followUpDate > todayISO() ? cons.followUpDate : tomorrowISO(), time: '09:00 AM', notes: cons.followUpNotes || '' })
  }

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault()
    if (!followUpTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const updated = await scheduleFollowUp(followUpTarget.id, followUpForm)
      showToast(`Follow-up ${updated.followUpAppointment?.reference} booked for ${formatDate(followUpForm.date)} at ${followUpForm.time}.`)
      setFollowUpTarget(null)
      setDetails(updated)
    } catch (err) {
      showToast(err?.message || 'Failed to schedule the follow-up.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const clearFilters = () => {
    resetSearch()
    setStatusFilter('All')
    setVisitFilter('All')
  }

  // Action buttons per status
  const listActions = (cons) => {
    const buttons = []
    if (cons.status === 'Scheduled' && canRecord) {
      buttons.push(
        <button key="start" type="button" className={BTN_SUCCESS} onClick={() => handleStart(cons)} disabled={busy}>
          Start Consultation
        </button>,
      )
    }
    if (cons.status === 'In Progress' && canRecord) {
      buttons.push(
        <button key="continue" type="button" className={BTN_INFO} onClick={() => openWorkspace(cons)} disabled={busy}>
          Continue
        </button>,
      )
    }
    if (
      cons.status === 'Completed' && cons.followUpRequired && !cons.followUpAppointment && canScheduleFollowUp
    ) {
      buttons.push(
        <button key="follow-up" type="button" className={BTN_INFO} onClick={() => openFollowUp(cons)} disabled={busy}>
          Schedule Follow-up
        </button>,
      )
    }
    buttons.push(
      <button key="view" type="button" className={BTN_VIEW} onClick={() => setDetails(cons)}>
        View
      </button>,
    )
    return buttons
  }

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
        {canRecord && (
          <div className="w-full sm:w-auto">
            <button
              type="button"
              className={`${PRIMARY_BTN} w-full sm:w-auto`}
              onClick={() => {
                setSelectedPatientId(patients[0]?.patientId || '')
                setSelectedStaffId(userRole === 'doctor' ? user?.id ?? null : null)
                setNewTime(currentSlot())
                setNewDate(todayISO())
                setNewVisitType(VISIT_NEW)
                setNewPreviousId('')
                setNewConsultModalOpen(true)
              }}
            >
              + Start Consultation
            </button>
          </div>
        )}
      </section>

      {/* Status summary chips (click to filter) */}
      <div className="mb-5 grid grid-cols-3 gap-2.5 sm:gap-3">
        {STATUSES.map((status) => {
          const dotColor =
            status === 'Completed'
              ? 'bg-success'
              : status === 'In Progress'
                ? 'bg-gold'
                : 'bg-[#1a56c4]'

          return (
            <button
              type="button"
              key={status}
              className={`group flex cursor-pointer flex-col justify-between gap-1.5 rounded-2xl border bg-white p-3 sm:p-4 text-left shadow-[0_4px_20px_rgba(18,57,59,0.05)] transition-all duration-150 hover:border-primary/50 hover:shadow-xs active:scale-[0.98] ${
                statusFilter === status
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-line-strong/80'
              }`}
              onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
            >
              <div className="flex items-center justify-between gap-1">
                <small className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted truncate">
                  {status}
                </small>
                <span className={`size-2 rounded-full ${dotColor}`} />
              </div>
              <strong className="text-[22px] sm:text-[26px] font-extrabold leading-none text-ink tracking-tight">
                {counts[status]}
              </strong>
            </button>
          )
        })}
      </div>

      {/* List panel */}
      <div className={`${PANEL} p-4 sm:p-5`}>
        <div className="mb-4 sm:mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[17px] sm:text-[18px] font-bold text-[#143d40]">Consultation Records</h3>
            <p className={KICKER}>Review scheduled and completed patient consultations</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
            <input
              type="text"
              className={`${SEARCH_INPUT} w-full sm:w-auto sm:min-w-[200px] sm:flex-[1_1_220px]`}
              placeholder="Search patient, reference, complaint, or diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={`${SELECT_INPUT} w-full sm:w-auto`}
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
              className={`${SELECT_INPUT} w-full sm:w-auto`}
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
            {(search || statusFilter !== 'All' || visitFilter !== 'All') && (
              <button type="button" className={PILL} onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {!isLoading && !error && (
              <div className="flex items-center gap-2 sm:ml-auto">
                <RefreshingBadge refreshing={isRefetching} />
                <span className="whitespace-nowrap text-[12px] font-bold text-muted">
                  {filtered.length} of {consultations.length} consultations
                </span>
              </div>
            )}
          </div>
        </div>

        {!canRecord && (
          <div className="mb-[14px] flex items-center gap-2 rounded-lg border border-dashed border-[#f2cfc2] bg-[#fdf1ec] p-[10px_14px] text-[12.5px] font-bold text-[#a33c12]">
            ⚠ You have view-only access. Only authorized medical personnel can start or record consultations.
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-line">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : isLoading ? (
            <TableSkeleton columns={6} />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Patient</th>
                  <th>Schedule</th>
                  <th>Attending Doctor / Nurse</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((cons) => (
                  <tr key={cons.id}>
                    <td className="font-mono font-bold text-primary">{cons.reference}</td>
                    <td>
                      <strong className="font-bold text-ink">{cons.patient}</strong>
                      {cons.patientId ? <span className="block text-[12px] text-muted">{cons.patientId}</span> : null}
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <VisitTypeBadge visitType={cons.visitType} compact />
                        {cons.isFollowUp && cons.previousConsultation ? (
                          <span className="text-[11px] font-bold text-[#6b46c1]">of {cons.previousConsultation.reference}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className="font-bold text-ink">{formatDate(cons.date)}</span>
                      <span className="block text-[12px] text-muted">{cons.time}</span>
                    </td>
                    <td>{cons.staff || <span className="font-bold text-[#a33c12]">Unassigned</span>}</td>
                    <td>
                      <StatusBadge status={cons.status} />
                      {followUpLabel(cons) ? (
                        <span className={`mt-1 block text-[11.5px] font-bold ${cons.followUpAppointment ? 'text-[#6b46c1]' : 'text-[#a33c12]'}`}>
                          ↺ {followUpLabel(cons)}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-[6px]">{listActions(cons)}</div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      <EmptyState message="No consultations matched your search or filters." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      {/* ============ RECORD CONSULTATION WORKSPACE MODAL ============ */}
      {workspace && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Record consultation ${workspace.reference}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setWorkspace(null)
          }}
        >
          <div className={MODAL_CARD_WIDE}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Record Consultation — {workspace.reference}</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) setWorkspace(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[12px_14px]">
                <StatusBadge status={workspace.status} />
                <div className="min-w-0 flex-1">
                  <strong className="block text-[15px] text-ink">{workspace.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {workspace.patientId} · {formatDate(workspace.date)} at {workspace.time}
                  </span>
                </div>
                <VisitTypeBadge visitType={workspace.visitType} />
              </div>

              <div className="grid gap-[14px]">
                {workspace.isFollowUp && (
                  <section className={FOLLOW_UP_BOX}>
                    <h4 className="m-0 mb-[6px] text-[12px] uppercase tracking-[0.02em] text-[#6b46c1]">
                      ↺ Follow-up patient — why they are returning
                    </h4>
                    {workspace.previousConsultation ? (
                      <div className="text-[13px] text-ink">
                        <p className="m-0">
                          Previous visit <strong>{workspace.previousConsultation.reference}</strong> on{' '}
                          {formatDate(workspace.previousConsultation.date)}
                          {workspace.previousConsultation.staff ? ` with ${workspace.previousConsultation.staff}` : ''}
                        </p>
                        <p className="m-0 mt-1"><strong>Complaint:</strong> {workspace.previousConsultation.chiefComplaint || '—'}</p>
                        <p className="m-0"><strong>Diagnosis:</strong> {workspace.previousConsultation.diagnosis || '—'}</p>
                        <p className="m-0"><strong>Treatment:</strong> {workspace.previousConsultation.treatment || '—'}</p>
                        {workspace.previousConsultation.followUpNotes ? (
                          <p className="m-0"><strong>Follow-up instructions:</strong> {workspace.previousConsultation.followUpNotes}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="m-0 text-[13px] text-muted">No previous consultation was linked. Check the visit history below.</p>
                    )}
                  </section>
                )}

                {workspaceHistory.length > 0 && (
                  <section className="rounded-lg border border-line p-[14px_16px]">
                    <h4 className="m-0 mb-[10px] text-[12px] uppercase tracking-[0.02em] text-ink">Patient Visit History</h4>
                    <div className="grid gap-2">
                      {workspaceHistory.map((h) => (
                        <div key={h.id} className="rounded-md border border-line bg-[#fafcfb] p-[8px_10px] text-[12.5px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-primary">{h.reference}</strong>
                            <span className="text-muted">{formatDate(h.date)} · {h.time}</span>
                            <VisitTypeBadge visitType={h.visitType} compact />
                          </div>
                          <p className="m-0 mt-0.5 text-ink"><strong>Dx:</strong> {h.diagnosis || '—'} · <strong>Tx:</strong> {h.treatment || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Patient information */}
                <section className="rounded-lg border border-line p-[14px_16px]">
                  <h4 className="m-0 mb-[10px] text-[12px] uppercase tracking-[0.02em] text-ink">Patient Information</h4>
                  <div className={PROFILE_GRID}>
                    <div>
                      <span className={PROFILE_LBL}>Patient</span>
                      <p className={PROFILE_VAL}>{workspace.patient}</p>
                    </div>
                    <div>
                      <span className={PROFILE_LBL}>Patient ID</span>
                      <p className={PROFILE_VAL}>{workspace.patientId}</p>
                    </div>
                    <div>
                      <span className={PROFILE_LBL}>Schedule</span>
                      <p className={PROFILE_VAL}>
                        {formatDate(workspace.date)} · {workspace.time}
                      </p>
                    </div>
                    <label className={CONSULT_FIELD}>
                      <span>Attending Doctor / Nurse</span>
                      <ClinicianSelect
                        className={CONSULT_INPUT}
                        value={draft.staffId}
                        onChange={(id) => updateDraft('staffId', id)}
                        unassignedLabel={workspace.staff ? `${workspace.staff} (current)` : 'Select doctor / nurse'}
                        disabled={busy}
                      />
                    </label>
                  </div>
                </section>

                {/* Chief complaint */}
                <section className={`rounded-lg border border-line p-[14px_16px] ${draftErrors.complaint ? 'border-[#f2cfc2] bg-[#fffaf8]' : ''}`}>
                  <h4 className="m-0 mb-[10px] text-[12px] uppercase tracking-[0.02em] text-ink">Chief Complaint</h4>
                  <label className={CONSULT_FIELD}>
                    <span>Primary complaint or reason for consultation</span>
                    <textarea
                      placeholder="e.g. High fever and body aches since morning"
                      className={`${CONSULT_INPUT} min-h-[72px] resize-y`}
                      value={draft.chiefComplaint}
                      onChange={(e) => updateDraft('chiefComplaint', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  {draftErrors.complaint && (
                    <p className="mt-2 text-[12px] font-bold text-danger">Required: {draftErrors.complaint.join(', ')}</p>
                  )}
                </section>

                {/* Vital signs */}
                <section className={`rounded-lg border border-line p-[14px_16px] ${draftErrors.vitals ? 'border-[#f2cfc2] bg-[#fffaf8]' : ''}`}>
                  <h4 className="m-0 mb-[10px] text-[12px] uppercase tracking-[0.02em] text-ink">Vital Signs</h4>
                  <div className="grid grid-cols-3 gap-[10px] max-[620px]:grid-cols-1">
                    <label className={CONSULT_FIELD}>
                      Temperature
                      <input
                        type="text"
                        placeholder="36.5°C"
                        className={CONSULT_INPUT}
                        value={draft.temperature}
                        onChange={(e) => updateDraft('temperature', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className={CONSULT_FIELD}>
                      Blood Pressure
                      <input
                        type="text"
                        placeholder="120/80"
                        className={CONSULT_INPUT}
                        value={draft.bloodPressure}
                        onChange={(e) => updateDraft('bloodPressure', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className={CONSULT_FIELD}>
                      Pulse Rate
                      <input
                        type="text"
                        placeholder="75 bpm"
                        className={CONSULT_INPUT}
                        value={draft.pulseRate}
                        onChange={(e) => updateDraft('pulseRate', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className={CONSULT_FIELD}>
                      Respiratory Rate
                      <input
                        type="text"
                        placeholder="16 /min"
                        className={CONSULT_INPUT}
                        value={draft.respiratoryRate}
                        onChange={(e) => updateDraft('respiratoryRate', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className={CONSULT_FIELD}>
                      Height
                      <input
                        type="text"
                        placeholder="165 cm"
                        className={CONSULT_INPUT}
                        value={draft.height}
                        onChange={(e) => updateDraft('height', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className={CONSULT_FIELD}>
                      Weight
                      <input
                        type="text"
                        placeholder="55 kg"
                        className={CONSULT_INPUT}
                        value={draft.weight}
                        onChange={(e) => updateDraft('weight', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                  </div>
                  {draftErrors.vitals && (
                    <p className="mt-2 text-[12px] font-bold text-danger">Required: {draftErrors.vitals.join(', ')}</p>
                  )}
                </section>

                {/* Clinical findings */}
                <section className="rounded-lg border border-line p-[14px_16px]">
                  <h4 className="m-0 mb-[10px] text-[12px] uppercase tracking-[0.02em] text-ink">Clinical Findings</h4>
                  <label className={CONSULT_FIELD}>
                    <span>Objective findings observed during the examination</span>
                    <textarea
                      placeholder="e.g. Flushed skin, mild dehydration. Throat slightly red."
                      className={`${CONSULT_INPUT} min-h-[72px] resize-y`}
                      value={draft.clinicalFindings}
                      onChange={(e) => updateDraft('clinicalFindings', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </section>

                {/* Assessment / diagnosis */}
                <section className={`rounded-lg border border-line p-[14px_16px] ${draftErrors.diagnosis ? 'border-[#f2cfc2] bg-[#fffaf8]' : ''}`}>
                  <h4 className="m-0 mb-[10px] text-[12px] uppercase tracking-[0.02em] text-ink">Assessment / Diagnosis</h4>
                  <label className={CONSULT_FIELD}>
                    <span>Clinical assessment or working diagnosis</span>
                    <input
                      type="text"
                      placeholder="e.g. Mild Flu Symptoms"
                      className={CONSULT_INPUT}
                      value={draft.diagnosis}
                      onChange={(e) => updateDraft('diagnosis', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  {draftErrors.diagnosis && (
                    <p className="mt-2 text-[12px] font-bold text-danger">Required: {draftErrors.diagnosis.join(', ')}</p>
                  )}
                </section>

                {/* Treatment and advice */}
                <section className={`rounded-lg border border-line p-[14px_16px] ${draftErrors.treatment ? 'border-[#f2cfc2] bg-[#fffaf8]' : ''}`}>
                  <h4 className="m-0 mb-[10px] text-[12px] uppercase tracking-[0.02em] text-ink">Treatment and Advice</h4>
                  <label className={CONSULT_FIELD}>
                    <span>Treatment, recommendations, and medical advice</span>
                    <textarea
                      placeholder="e.g. Paracetamol 500mg every 4 hours. Hydrate well. Return if fever persists."
                      className={`${CONSULT_INPUT} min-h-[72px] resize-y`}
                      value={draft.treatment}
                      onChange={(e) => updateDraft('treatment', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <label className={`${CONSULT_FIELD} mt-[10px]`}>
                    <span>Disposition (outcome)</span>
                    <select
                      className={CONSULT_INPUT}
                      value={draft.disposition}
                      onChange={(e) => updateDraft('disposition', e.target.value)}
                      disabled={busy}
                    >
                      <option value="">— Select outcome —</option>
                      {DISPOSITIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  {draftErrors.treatment && (
                    <p className="mt-2 text-[12px] font-bold text-danger">Required: {draftErrors.treatment.join(', ')}</p>
                  )}
                </section>

                {/* Follow-up */}
                <section className={`rounded-lg border border-line p-[14px_16px] ${draftErrors.followUp ? 'border-[#f2cfc2] bg-[#fffaf8]' : ''}`}>
                  <h4 className="m-0 mb-[10px] text-[12px] uppercase tracking-[0.02em] text-ink">Follow-up</h4>
                  <label className="flex items-center gap-2 text-[13px] font-bold text-ink">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={draft.followUpRequired}
                      onChange={(e) => updateDraft('followUpRequired', e.target.checked)}
                      disabled={busy}
                    />
                    Patient needs a follow-up consultation
                  </label>
                  {draft.followUpRequired && (
                    <div className="mt-[10px] grid gap-[10px]">
                      <div className="grid grid-cols-2 gap-[10px] max-[620px]:grid-cols-1">
                        <label className={CONSULT_FIELD}>
                          Follow-up Date (optional — book now)
                          <input
                            type="date"
                            min={tomorrowISO()}
                            className={CONSULT_INPUT}
                            value={draft.followUpDate}
                            onChange={(e) => updateDraft('followUpDate', e.target.value)}
                            disabled={busy}
                          />
                        </label>
                        <label className={CONSULT_FIELD}>
                          Time Slot
                          <select
                            className={CONSULT_INPUT}
                            value={draft.followUpTime}
                            onChange={(e) => updateDraft('followUpTime', e.target.value)}
                            disabled={busy || !draft.followUpDate}
                          >
                            {TIME_SLOTS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className={CONSULT_FIELD}>
                        Follow-up Instructions
                        <textarea
                          placeholder="e.g. Return after 1 week to re-check the wound and blood pressure"
                          className={`${CONSULT_INPUT} min-h-[60px] resize-y`}
                          value={draft.followUpNotes}
                          onChange={(e) => updateDraft('followUpNotes', e.target.value)}
                          disabled={busy}
                        />
                      </label>
                      <p className="m-0 text-[12px] text-muted">
                        With a date, the follow-up appointment is booked automatically (same doctor, marked as a
                        follow-up of this visit) when you complete the consultation. Without a date, it is flagged as
                        &quot;Follow-up needed&quot; so it can be scheduled later.
                      </p>
                    </div>
                  )}
                  {draftErrors.followUp && (
                    <p className="mt-2 text-[12px] font-bold text-danger">{draftErrors.followUp.join(', ')}</p>
                  )}
                </section>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button
                  type="button"
                  className={PILL}
                  onClick={() => {
                    if (!busy) setWorkspace(null)
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="button" className={BTN_INFO} onClick={handleSaveProgress} disabled={busy}>
                  Save Progress
                </button>
                <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={handleCompleteClick} disabled={busy}>
                  Complete Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ COMPLETE CONFIRMATION MODAL ============ */}
      {confirmComplete.isOpen && workspace && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm consultation completion"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) confirmComplete.close()
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Complete Consultation</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) confirmComplete.close()
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0">
                Mark consultation <strong>{workspace.reference}</strong> for <strong>{workspace.patient}</strong> as{' '}
                <strong>Completed</strong>?
              </p>
              <div className={REASON_BOX}>
                <h4 className="mb-1 m-0 text-[13px] text-primary">Summary</h4>
                <p className="m-0 text-[13px]">
                  <strong>Chief Complaint:</strong> {draft.chiefComplaint}
                </p>
                <p className="m-0 text-[13px]">
                  <strong>Diagnosis:</strong> {draft.diagnosis}
                </p>
                {draft.followUpRequired && (
                  <p className="m-0 text-[13px]">
                    <strong>Follow-up:</strong>{' '}
                    {draft.followUpDate
                      ? `${formatDate(draft.followUpDate)} at ${draft.followUpTime} (will be booked)`
                      : 'Needed — schedule later'}
                  </p>
                )}
              </div>
              <p className="mb-0 text-muted">
                The consultation will be locked for editing once completed.
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button
                  type="button"
                  className={PILL}
                  onClick={() => {
                    if (!busy) confirmComplete.close()
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={handleConfirmComplete} disabled={busy}>
                  {busy ? 'Completing...' : 'Confirm Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ CONSULTATION DETAILS MODAL (READ-ONLY) ============ */}
      {details && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Consultation ${details.reference} details`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetails(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Consultation Details — {details.reference}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => setDetails(null)}>
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-[18px] flex flex-wrap items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <StatusBadge status={details.status} />
                <div className="min-w-0 flex-1">
                  <strong className="block text-[15px] text-ink">{details.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {details.patientId} · {formatDate(details.date)} at {details.time}
                  </span>
                </div>
                <VisitTypeBadge visitType={details.visitType} />
              </div>

              {details.isFollowUp && details.previousConsultation && (
                <div className={`${FOLLOW_UP_BOX} mb-3`}>
                  <h4 className="mb-1 m-0 text-[13px] font-extrabold text-[#6b46c1]">↺ Follow-up of {details.previousConsultation.reference}</h4>
                  <p className="m-0 text-[13px] text-ink">
                    {formatDate(details.previousConsultation.date)} · Diagnosis: {details.previousConsultation.diagnosis || '—'} ·
                    Treatment: {details.previousConsultation.treatment || '—'}
                  </p>
                </div>
              )}

              <div className={PROFILE_GRID}>
                <div>
                  <span className={PROFILE_LBL}>Reference</span>
                  <p className={PROFILE_VAL}>{details.reference}</p>
                </div>
                <div>
                  <span className={PROFILE_LBL}>Attending Doctor / Nurse</span>
                  <p className={PROFILE_VAL}>{details.staff}</p>
                </div>
                <div>
                  <span className={PROFILE_LBL}>Started</span>
                  <p className={PROFILE_VAL}>{details.startedAt || '—'}</p>
                </div>
                <div>
                  <span className={PROFILE_LBL}>Completed</span>
                  <p className={PROFILE_VAL}>{details.completedAt || '—'}</p>
                </div>
              </div>

              <div className={REASON_BOX}>
                <h4 className="mb-1 m-0 text-[13px] text-primary">Chief Complaint</h4>
                <p className="m-0 text-[13px]">{details.chiefComplaint || '—'}</p>
              </div>

              {details.vitals && (
                <div className={`${REASON_BOX} mt-3`}>
                  <h4 className="mb-1 m-0 text-[13px] text-primary">Vital Signs</h4>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-[6px_14px] text-[13px] text-ink">
                    <span>Temp: {details.vitals.temperature || '—'}</span>
                    <span>BP: {details.vitals.bloodPressure || '—'}</span>
                    <span>Pulse: {details.vitals.pulseRate || '—'}</span>
                    <span>RR: {details.vitals.respiratoryRate || '—'}</span>
                    <span>Height: {details.vitals.height || '—'}</span>
                    <span>Weight: {details.vitals.weight || '—'}</span>
                  </div>
                </div>
              )}

              <div className={`${REASON_BOX} mt-3`}>
                <h4 className="mb-1 m-0 text-[13px] text-primary">Clinical Findings</h4>
                <p className="m-0 text-[13px]">{details.clinicalFindings || '—'}</p>
              </div>

              <div className={`${REASON_BOX} mt-3`}>
                <h4 className="mb-1 m-0 text-[13px] text-primary">Assessment / Diagnosis</h4>
                <p className="m-0 text-[13px]">{details.diagnosis || '—'}</p>
              </div>

              <div className={`${REASON_BOX} mt-3`}>
                <h4 className="mb-1 m-0 text-[13px] text-primary">Treatment and Advice</h4>
                <p className="m-0 text-[13px]">{details.treatment || '—'}</p>
              </div>

              {details.disposition && (
                <div className={`${REASON_BOX} mt-3`}>
                  <h4 className="mb-1 m-0 text-[13px] text-primary">Disposition</h4>
                  <span className={`${DISPO_TAG} ${dispoClasses(details.disposition)}`}>
                    {details.disposition}
                  </span>
                </div>
              )}

              {(details.followUpRequired || details.followUpAppointment) && (
                <div className={`${FOLLOW_UP_BOX} mt-3`}>
                  <h4 className="mb-1 m-0 text-[13px] font-extrabold text-[#6b46c1]">↺ Follow-up</h4>
                  {details.followUpAppointment ? (
                    <p className="m-0 text-[13px] text-ink">
                      Scheduled: <strong>{details.followUpAppointment.reference}</strong> on{' '}
                      {formatDate(details.followUpAppointment.date)} at {details.followUpAppointment.time} with{' '}
                      {details.followUpAppointment.staff} · <StatusBadge status={details.followUpAppointment.status} />
                    </p>
                  ) : (
                    <p className="m-0 text-[13px] font-bold text-[#a33c12]">
                      Follow-up needed{details.followUpDate ? ` around ${formatDate(details.followUpDate)}` : ''} — not yet scheduled.
                    </p>
                  )}
                  {details.followUpNotes ? (
                    <p className="m-0 mt-1 text-[13px] text-ink"><strong>Instructions:</strong> {details.followUpNotes}</p>
                  ) : null}
                  {!details.followUpAppointment && details.status === 'Completed' && canScheduleFollowUp && (
                    <button type="button" className={`${BTN_INFO} mt-2`} onClick={() => openFollowUp(details)}>
                      Schedule Follow-up
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className={MODAL_FOOTER}>
              <button type="button" className={PILL} onClick={() => setDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {followUpTarget && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Schedule follow-up">
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <div>
                <span className={KICKER}>Follow-up of {followUpTarget.reference}</span>
                <h3 className="m-0 text-[18px] font-bold text-ink">Schedule Follow-up</h3>
              </div>
              <button type="button" className={MODAL_CLOSE} onClick={() => setFollowUpTarget(null)} disabled={busy}>
                ✕
              </button>
            </div>
            <form onSubmit={handleScheduleFollowUp} className="flex flex-1 flex-col overflow-hidden">
              <div className={`${MODAL_BODY} flex flex-col gap-4`}>
                <p className="m-0 text-[13px] text-ink">
                  <strong>{followUpTarget.patient}</strong> · last seen {formatDate(followUpTarget.date)} by{' '}
                  {followUpTarget.staff || 'the clinic'} · Diagnosis: {followUpTarget.diagnosis || '—'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className={CONSULT_FIELD}>
                    <span>Date</span>
                    <input
                      type="date"
                      min={tomorrowISO()}
                      className={CONSULT_INPUT}
                      value={followUpForm.date}
                      onChange={(e) => setFollowUpForm({ ...followUpForm, date: e.target.value })}
                      required
                    />
                  </label>
                  <label className={CONSULT_FIELD}>
                    <span>Time Slot</span>
                    <select
                      className={CONSULT_INPUT}
                      value={followUpForm.time}
                      onChange={(e) => setFollowUpForm({ ...followUpForm, time: e.target.value })}
                    >
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className={CONSULT_FIELD}>
                  <span>Instructions</span>
                  <textarea
                    className={`${CONSULT_INPUT} min-h-[70px] resize-y`}
                    value={followUpForm.notes}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                    placeholder="Why the patient should return"
                  />
                </label>
              </div>
              <div className={MODAL_FOOTER}>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={() => setFollowUpTarget(null)} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className={PRIMARY_BTN} disabled={busy || !followUpForm.date}>
                    {busy ? 'Booking...' : 'Book Follow-up'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Consultation Modal */}
      {newConsultModalOpen && (
        <div className={MODAL_BACKDROP}>
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <div>
                <span className={KICKER}>Clinical Record</span>
                <h3 className="m-0 text-[18px] font-bold text-ink">New Consultation</h3>
              </div>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => setNewConsultModalOpen(false)}
                disabled={busy}
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreateConsultation(true)
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className={`${MODAL_BODY} flex flex-col gap-4`}>
                <label className={CONSULT_FIELD}>
                  <span>Student / Patient <span className="text-danger">*</span></span>
                  <StudentSelect
                    value={selectedPatientId}
                    onChange={(val) => setSelectedPatientId(val)}
                    patients={patients}
                    placeholder="Type student name or ID (e.g. 24-012345)..."
                    required
                  />
                </label>

                <label className={CONSULT_FIELD}>
                  <span>Attending Doctor / Nurse</span>
                  <ClinicianSelect
                    className={CONSULT_INPUT}
                    value={selectedStaffId}
                    onChange={(id) => setSelectedStaffId(id)}
                    unassignedLabel="-- Select Doctor or Nurse --"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className={CONSULT_FIELD}>
                    <span>Visit Type</span>
                    <select
                      className={CONSULT_INPUT}
                      value={newVisitType}
                      onChange={(e) => {
                        setNewVisitType(e.target.value)
                        setNewPreviousId('')
                      }}
                    >
                      {VISIT_TYPES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  {newVisitType === VISIT_FOLLOW_UP && (
                    <label className={CONSULT_FIELD}>
                      <span>Follow-up of</span>
                      <select
                        className={CONSULT_INPUT}
                        value={newPreviousId}
                        onChange={(e) => setNewPreviousId(e.target.value ? Number(e.target.value) : '')}
                      >
                        <option value="">{newPatientHistory.length ? 'Select previous visit' : 'No previous visits'}</option>
                        {newPatientHistory.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.reference} · {formatDate(c.date)} · {c.diagnosis || 'No diagnosis'}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className={CONSULT_FIELD}>
                    <span>Date</span>
                    <input
                      type="date"
                      className={CONSULT_INPUT}
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                    />
                  </label>
                  <label className={CONSULT_FIELD}>
                    <span>Time Slot</span>
                    <select
                      className={CONSULT_INPUT}
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      required
                    >
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className={CONSULT_FIELD}>
                  <span>Chief Complaint / Reason for Visit <span className="text-danger">*</span></span>
                  <textarea
                    className={`${CONSULT_INPUT} min-h-[90px] resize-y`}
                    placeholder="Describe symptoms, reason for visit, or initial complaint..."
                    value={newComplaint}
                    onChange={(e) => setNewComplaint(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className={MODAL_FOOTER}>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button
                    type="button"
                    className={PILL}
                    onClick={() => setNewConsultModalOpen(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={BTN_INFO}
                    disabled={busy || !selectedPatientId || !newComplaint.trim()}
                    onClick={() => handleCreateConsultation(false)}
                  >
                    {busy ? 'Saving...' : 'Schedule'}
                  </button>
                  <button
                    type="submit"
                    className={PRIMARY_BTN}
                    disabled={busy || !selectedPatientId || !newComplaint.trim()}
                  >
                    {busy ? 'Starting...' : 'Start Immediately'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Consultations
