import { useEffect, useMemo, useRef, useState } from 'react'
import { useConsultations } from '../hooks/useConsultations'
import { useStaff } from '../hooks/useStaff'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { useModal } from '../hooks/useModal'
import { usePagination } from '../hooks/usePagination'
import { useAuth } from '../hooks/useAuth'
import { formatDate, timeToMinutes } from '../lib/format'
import Toast from '../components/Toast'
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
  const { toast, showToast, dismiss } = useToast()
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
        <button key="start" type="button" className="btn-success-small" onClick={() => handleStart(cons)} disabled={busy}>
          Start Consultation
        </button>,
      )
    }
    if (cons.status === 'In Progress' && canRecord) {
      buttons.push(
        <button key="continue" type="button" className="btn-info-small" onClick={() => openWorkspace(cons)} disabled={busy}>
          Continue
        </button>,
      )
    }
    buttons.push(
      <button key="view" type="button" className="btn-view-small" onClick={() => setDetails(cons)}>
        View
      </button>,
    )
    return buttons
  }

  return (
    <div className="consultations-page">
      {/* Page header */}
      <section className="page-heading">
        <div>
          <p>{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <span className="page-heading-description">{page.description}</span>
        </div>
      </section>

      {/* Status summary chips (click to filter) */}
      <div className="consultations-summary">
        {STATUSES.map((status) => (
          <button
            type="button"
            key={status}
            className={`summary-chip ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
          >
            <small>{status}</small>
            <strong>{counts[status]}</strong>
          </button>
        ))}
      </div>

      {/* List panel */}
      <div className="panel main-panel consultations-list-panel">
        <div className="panel-header flex-header">
          <div>
            <h3>Consultation Records</h3>
            <p>Review scheduled and completed patient consultations</p>
          </div>
          <div className="appointments-toolbar">
            <input
              type="text"
              className="search-input toolbar-search"
              placeholder="Search patient, reference, complaint, or diagnosis..."
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
            {(search || statusFilter !== 'All') && (
              <button type="button" className="secondary-pill" onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {!isLoading && !error && (
              <span className="results-count">
                {filtered.length} of {consultations.length} consultations
              </span>
            )}
          </div>
        </div>

        {!canRecord && (
          <div className="auth-notice">
            ⚠ You have view-only access. Only authorized medical personnel can start or record consultations.
          </div>
        )}

        <div className="records-table-container">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : isLoading ? (
            <LoadingState label="Loading consultations..." />
          ) : (
            <table className="records-table">
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
                    <td className="bold-text text-teal font-monospace">{cons.reference}</td>
                    <td>
                      <strong className="bold-text">{cons.patient}</strong>
                      {cons.patientId ? <span className="block-sub muted-text">{cons.patientId}</span> : null}
                    </td>
                    <td>
                      <span className="bold-text">{formatDate(cons.date)}</span>
                      <span className="block-sub muted-text">{cons.time}</span>
                    </td>
                    <td>{cons.staff}</td>
                    <td>
                      <StatusBadge status={cons.status} />
                    </td>
                    <td className="actions-cell">
                      <div className="row-actions">{listActions(cons)}</div>
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
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Record consultation ${workspace.reference}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setWorkspace(null)
          }}
        >
          <div className="modal-card modal-card-wide">
            <div className="modal-header">
              <h3>Record Consultation — {workspace.reference}</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => {
                  if (!busy) setWorkspace(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="consultation-patient-banner">
                <StatusBadge status={workspace.status} />
                <div>
                  <strong>{workspace.patient}</strong>
                  <span className="block-sub muted-text">
                    {workspace.patientId} · {formatDate(workspace.date)} at {workspace.time}
                  </span>
                </div>
              </div>

              <div className="consultation-sections">
                {/* Patient information */}
                <section className="consultation-section">
                  <h4>Patient Information</h4>
                  <div className="profile-details-grid">
                    <div>
                      <span className="profile-lbl">Patient</span>
                      <p className="profile-val">{workspace.patient}</p>
                    </div>
                    <div>
                      <span className="profile-lbl">Patient ID</span>
                      <p className="profile-val">{workspace.patientId}</p>
                    </div>
                    <div>
                      <span className="profile-lbl">Schedule</span>
                      <p className="profile-val">
                        {formatDate(workspace.date)} · {workspace.time}
                      </p>
                    </div>
                    <label className="consultation-field">
                      <span>Attending Medical Staff</span>
                      <select
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
                <section className={`consultation-section ${draftErrors.complaint ? 'section-invalid' : ''}`}>
                  <h4>Chief Complaint</h4>
                  <label className="consultation-field">
                    <span>Primary complaint or reason for consultation</span>
                    <textarea
                      placeholder="e.g. High fever and body aches since morning"
                      value={draft.chiefComplaint}
                      onChange={(e) => updateDraft('chiefComplaint', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  {draftErrors.complaint && (
                    <p className="section-error">Required: {draftErrors.complaint.join(', ')}</p>
                  )}
                </section>

                {/* Vital signs */}
                <section className={`consultation-section ${draftErrors.vitals ? 'section-invalid' : ''}`}>
                  <h4>Vital Signs</h4>
                  <div className="vitals-grid">
                    <label>
                      Temperature
                      <input
                        type="text"
                        placeholder="36.5°C"
                        value={draft.temperature}
                        onChange={(e) => updateDraft('temperature', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label>
                      Blood Pressure
                      <input
                        type="text"
                        placeholder="120/80"
                        value={draft.bloodPressure}
                        onChange={(e) => updateDraft('bloodPressure', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label>
                      Pulse Rate
                      <input
                        type="text"
                        placeholder="75 bpm"
                        value={draft.pulseRate}
                        onChange={(e) => updateDraft('pulseRate', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label>
                      Respiratory Rate
                      <input
                        type="text"
                        placeholder="16 /min"
                        value={draft.respiratoryRate}
                        onChange={(e) => updateDraft('respiratoryRate', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label>
                      Height
                      <input
                        type="text"
                        placeholder="165 cm"
                        value={draft.height}
                        onChange={(e) => updateDraft('height', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label>
                      Weight
                      <input
                        type="text"
                        placeholder="55 kg"
                        value={draft.weight}
                        onChange={(e) => updateDraft('weight', e.target.value)}
                        disabled={busy}
                      />
                    </label>
                  </div>
                  {draftErrors.vitals && (
                    <p className="section-error">Required: {draftErrors.vitals.join(', ')}</p>
                  )}
                </section>

                {/* Clinical findings */}
                <section className="consultation-section">
                  <h4>Clinical Findings</h4>
                  <label className="consultation-field">
                    <span>Objective findings observed during the examination</span>
                    <textarea
                      placeholder="e.g. Flushed skin, mild dehydration. Throat slightly red."
                      value={draft.clinicalFindings}
                      onChange={(e) => updateDraft('clinicalFindings', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </section>

                {/* Assessment / diagnosis */}
                <section className={`consultation-section ${draftErrors.diagnosis ? 'section-invalid' : ''}`}>
                  <h4>Assessment / Diagnosis</h4>
                  <label className="consultation-field">
                    <span>Clinical assessment or working diagnosis</span>
                    <input
                      type="text"
                      placeholder="e.g. Mild Flu Symptoms"
                      value={draft.diagnosis}
                      onChange={(e) => updateDraft('diagnosis', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  {draftErrors.diagnosis && (
                    <p className="section-error">Required: {draftErrors.diagnosis.join(', ')}</p>
                  )}
                </section>

                {/* Treatment and advice */}
                <section className={`consultation-section ${draftErrors.treatment ? 'section-invalid' : ''}`}>
                  <h4>Treatment and Advice</h4>
                  <label className="consultation-field">
                    <span>Treatment, recommendations, and medical advice</span>
                    <textarea
                      placeholder="e.g. Paracetamol 500mg every 4 hours. Hydrate well. Return if fever persists."
                      value={draft.treatment}
                      onChange={(e) => updateDraft('treatment', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <label className="consultation-field" style={{ marginTop: 10 }}>
                    <span>Disposition (outcome)</span>
                    <select
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
                    <p className="section-error">Required: {draftErrors.treatment.join(', ')}</p>
                  )}
                </section>
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="secondary-pill"
                  onClick={() => {
                    if (!busy) setWorkspace(null)
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="button" className="btn-info-small" onClick={handleSaveProgress} disabled={busy}>
                  Save Progress
                </button>
                <button type="button" className="primary-action" onClick={handleCompleteClick} disabled={busy}>
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
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm consultation completion"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) confirmComplete.close()
          }}
        >
          <div className="modal-card modal-card-sm">
            <div className="modal-header">
              <h3>Complete Consultation</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => {
                  if (!busy) confirmComplete.close()
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>
                Mark consultation <strong>{workspace.reference}</strong> for <strong>{workspace.patient}</strong> as{' '}
                <strong>Completed</strong>?
              </p>
              <div className="profile-alert-box reason-box">
                <h4 className="text-teal">Summary</h4>
                <p>
                  <strong>Chief Complaint:</strong> {draft.chiefComplaint}
                </p>
                <p>
                  <strong>Diagnosis:</strong> {draft.diagnosis}
                </p>
              </div>
              <p className="muted-text" style={{ marginBottom: 0 }}>
                The consultation will be locked for editing once completed.
              </p>
            </div>
            <div className="modal-footer">
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="secondary-pill"
                  onClick={() => {
                    if (!busy) confirmComplete.close()
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="button" className="primary-action" onClick={handleConfirmComplete} disabled={busy}>
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
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Consultation ${details.reference} details`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetails(null)
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <h3>Consultation Details — {details.reference}</h3>
              <button type="button" className="btn-modal-close" onClick={() => setDetails(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="appointment-detail-banner">
                <StatusBadge status={details.status} />
                <div>
                  <strong>{details.patient}</strong>
                  <span className="block-sub muted-text">
                    {details.patientId} · {formatDate(details.date)} at {details.time}
                  </span>
                </div>
              </div>

              <div className="profile-details-grid">
                <div>
                  <span className="profile-lbl">Reference</span>
                  <p className="profile-val">{details.reference}</p>
                </div>
                <div>
                  <span className="profile-lbl">Attending Staff</span>
                  <p className="profile-val">{details.staff}</p>
                </div>
                <div>
                  <span className="profile-lbl">Started</span>
                  <p className="profile-val">{details.startedAt || '—'}</p>
                </div>
                <div>
                  <span className="profile-lbl">Completed</span>
                  <p className="profile-val">{details.completedAt || '—'}</p>
                </div>
              </div>

              <div className="profile-alert-box reason-box">
                <h4 className="text-teal">Chief Complaint</h4>
                <p>{details.chiefComplaint || '—'}</p>
              </div>

              {details.vitals && (
                <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
                  <h4 className="text-teal">Vital Signs</h4>
                  <div className="vitals-readout">
                    <span>Temp: {details.vitals.temperature || '—'}</span>
                    <span>BP: {details.vitals.bloodPressure || '—'}</span>
                    <span>Pulse: {details.vitals.pulseRate || '—'}</span>
                    <span>RR: {details.vitals.respiratoryRate || '—'}</span>
                    <span>Height: {details.vitals.height || '—'}</span>
                    <span>Weight: {details.vitals.weight || '—'}</span>
                  </div>
                </div>
              )}

              <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
                <h4 className="text-teal">Clinical Findings</h4>
                <p>{details.clinicalFindings || '—'}</p>
              </div>

              <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
                <h4 className="text-teal">Assessment / Diagnosis</h4>
                <p>{details.diagnosis || '—'}</p>
              </div>

              <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
                <h4 className="text-teal">Treatment and Advice</h4>
                <p>{details.treatment || '—'}</p>
              </div>

              {details.disposition && (
                <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
                  <h4 className="text-teal">Disposition</h4>
                  <span className={`dispo-tag dispo-${details.disposition.toLowerCase().replace(/ /g, '-')}`}>
                    {details.disposition}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-pill" onClick={() => setDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}

export default Consultations
