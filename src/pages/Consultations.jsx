import { useEffect, useMemo, useRef, useState } from 'react'
import { useConsultations } from '../hooks/useConsultations'
import { useStaff } from '../hooks/useStaff'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { useModal } from '../hooks/useModal'
import { usePagination } from '../hooks/usePagination'
import { useAuth } from '../hooks/useAuth'
import { formatDate, timeToMinutes } from '../lib/format'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
  BTN_SUCCESS, BTN_INFO, BTN_VIEW, DISPO_TAG, dispoClasses,
} from '../lib/ui'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState'

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

// Maps a consultation record to editable draft fields.
function consultationToDraft(consultation, defaultStaff = '') {
  return {
    staff: consultation.staff || defaultStaff,
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
  }
}

// Maps the draft back to the consultation record shape.
function draftToPatch(draft) {
  return {
    staff: draft.staff,
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
  // mock data or services directly.
  const {
    data: consultations,
    isLoading,
    error,
    refetch,
    startConsultation,
    saveConsultation,
    completeConsultation,
  } = useConsultations()
  const { data: staff } = useStaff()
  const { showToast } = useToast()
  const { userRole } = useAuth()
  const canRecord = MEDICAL_ROLES.includes(userRole)

  // Search / filter state
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [statusFilter, setStatusFilter] = useState('All')

  // Modal state
  const [workspace, setWorkspace] = useState(null) // consultation being recorded
  const [details, setDetails] = useState(null) // read-only details target
  const confirmComplete = useModal()
  const [busy, setBusy] = useState(false)
  // Ref latch guards against double-submission within the same render tick
  // (state-based `busy` only protects after the next re-render).
  const busyRef = useRef(false)

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
        const matchQuery =
          !q ||
          cons.patient.toLowerCase().includes(q) ||
          cons.reference.toLowerCase().includes(q) ||
          (cons.chiefComplaint || '').toLowerCase().includes(q) ||
          (cons.diagnosis || '').toLowerCase().includes(q) ||
          cons.staff.toLowerCase().includes(q)
        return matchStatus && matchQuery
      })
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (statusDiff !== 0) return statusDiff
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return timeToMinutes(a.time) - timeToMinutes(b.time)
      })
  }, [consultations, debouncedSearch, statusFilter])

  // Client-side pagination over the filtered list; swap for API pagination later.
  const pagination = usePagination(filtered)
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  // Any search/filter change starts back at page 1.
  useEffect(() => {
    resetPage()
  }, [debouncedSearch, statusFilter, resetPage])

  // ---------------- Workspace helpers ----------------

  const openWorkspace = (consultation) => {
    setDraft(consultationToDraft(consultation, staff[0]?.name || ''))
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
      const completed = await completeConsultation(workspace.id, draftToPatch(draft))
      showToast(`Consultation ${completed.reference} completed successfully.`)
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

  const clearFilters = () => {
    resetSearch()
    setStatusFilter('All')
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
          <p className={KICKER}>{page.eyebrow}</p>
          <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">{page.title}</h2>
          <span className="mt-[6px] block text-[13px] text-muted">{page.description}</span>
        </div>
      </section>

      {/* Status summary chips (click to filter) */}
      <div className="mb-[18px] grid grid-cols-3 gap-3 max-[700px]:grid-cols-1">
        {STATUSES.map((status) => (
          <button
            type="button"
            key={status}
            className={`flex cursor-pointer flex-col gap-[2px] rounded-lg border border-line-strong bg-white p-[14px_16px] text-left transition-all duration-200 hover:border-primary ${statusFilter === status ? 'border-primary bg-[#f0faf8] shadow-[inset_0_0_0_1px_var(--color-primary)]' : ''}`}
            onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
          >
            <small className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-muted">{status}</small>
            <strong className="text-[26px] leading-none text-ink">{counts[status]}</strong>
          </button>
        ))}
      </div>

      {/* List panel */}
      <div className={`${PANEL} p-5`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[18px] text-[#143d40]">Consultation Records</h3>
            <p className={KICKER}>Review scheduled and completed patient consultations</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-[10px]">
            <input
              type="text"
              className={`${SEARCH_INPUT} min-w-[200px] flex-[1_1_220px]`}
              placeholder="Search patient, reference, complaint, or diagnosis..."
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
            {(search || statusFilter !== 'All') && (
              <button type="button" className={PILL} onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {!isLoading && !error && (
              <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">
                {filtered.length} of {consultations.length} consultations
              </span>
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
            <LoadingState label="Loading consultations..." />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Patient</th>
                  <th>Schedule</th>
                  <th>Attending Staff</th>
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
                    </td>
                    <td>
                      <span className="font-bold text-ink">{formatDate(cons.date)}</span>
                      <span className="block text-[12px] text-muted">{cons.time}</span>
                    </td>
                    <td>{cons.staff}</td>
                    <td>
                      <StatusBadge status={cons.status} />
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
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[12px_14px]">
                <StatusBadge status={workspace.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{workspace.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {workspace.patientId} · {formatDate(workspace.date)} at {workspace.time}
                  </span>
                </div>
              </div>

              <div className="grid gap-[14px]">
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
                      <span>Attending Medical Staff</span>
                      <select
                        className={CONSULT_INPUT}
                        value={draft.staff}
                        onChange={(e) => updateDraft('staff', e.target.value)}
                        disabled={busy}
                      >
                        {staff.map((m) => (
                          <option key={m.name} value={m.name}>
                            {m.name} — {m.role}
                          </option>
                        ))}
                      </select>
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
              <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <StatusBadge status={details.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{details.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {details.patientId} · {formatDate(details.date)} at {details.time}
                  </span>
                </div>
              </div>

              <div className={PROFILE_GRID}>
                <div>
                  <span className={PROFILE_LBL}>Reference</span>
                  <p className={PROFILE_VAL}>{details.reference}</p>
                </div>
                <div>
                  <span className={PROFILE_LBL}>Attending Staff</span>
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
            </div>
            <div className={MODAL_FOOTER}>
              <button type="button" className={PILL} onClick={() => setDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Consultations
