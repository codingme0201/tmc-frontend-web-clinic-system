import { useEffect, useMemo, useRef, useState } from 'react'
import { useMedicalRecords } from '../hooks/useMedicalRecords'
import { useConsultations } from '../hooks/useConsultations'
import { useToast } from '../hooks/useToast'
import { useForm } from '../hooks/useForm'
import { useMedicalRecordList } from '../hooks/useMedicalRecordList'
import { useAppContext } from '../context/AppContext'
import { formatDate, initials, todayISO } from '../lib/format'
import Toast from '../components/Toast'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState'

// Roles permitted to manage clinical information (conditions/allergies).
const MEDICAL_ROLES = ['admin', 'doctor', 'nurse']

const RECORD_STATUSES = ['Active', 'Archived']
const CONDITION_STATUSES = ['Active', 'Inactive', 'Resolved']
const ALLERGY_SEVERITIES = ['Mild', 'Moderate', 'Severe']

const DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'Medical History' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'medications', label: 'Medications' },
  { id: 'timeline', label: 'Timeline' },
]

// Timeline event type → CSS class for the type tag.
const TIMELINE_CLASS = {
  Consultation: 'tl-consultation',
  'Medical Condition': 'tl-condition',
  'Allergy Recorded': 'tl-allergy',
  'Medication Prescribed': 'tl-medication',
  'Medical History': 'tl-history',
}

// Builds the chronological record timeline from the record + consultations.
function buildTimeline(record, consults) {
  const events = []
  for (const h of record.medicalHistory) {
    events.push({ id: `hist-${h.id}`, date: h.date, type: 'Medical History', title: h.condition, subtitle: h.notes, staff: '' })
  }
  for (const c of record.conditions) {
    events.push({ id: `cond-${c.id}`, date: c.diagnosedDate, type: 'Medical Condition', title: c.name, subtitle: `Status: ${c.status}`, staff: '' })
  }
  for (const a of record.allergies) {
    events.push({ id: `allergy-${a.id}`, date: a.dateRecorded, type: 'Allergy Recorded', title: a.allergen, subtitle: `${a.reaction || 'Reaction'} · ${a.severity}`, staff: '' })
  }
  for (const m of record.medications) {
    events.push({ id: `med-${m.id}`, date: m.prescribedDate, type: 'Medication Prescribed', title: `${m.name} ${m.dosage}`.trim(), subtitle: m.frequency, staff: m.prescribedBy })
  }
  for (const c of consults) {
    events.push({ id: `cons-${c.id}`, date: c.date, type: 'Consultation', title: c.diagnosis || c.chiefComplaint || 'Consultation', subtitle: c.chiefComplaint, staff: c.staff, consultation: c })
  }
  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

// ---------- Read-only consultation details modal (reused in the Consultations tab) ----------
function ConsultationDetailsModal({ cons, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Consultation ${cons.reference} details`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>Consultation Details — {cons.reference}</h3>
          <button type="button" className="btn-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="appointment-detail-banner">
            <StatusBadge status={cons.status} />
            <div>
              <strong>{cons.patient}</strong>
              <span className="block-sub muted-text">{cons.patientId} · {formatDate(cons.date)} at {cons.time}</span>
            </div>
          </div>

          <div className="profile-details-grid">
            <div>
              <span className="profile-lbl">Attending Staff</span>
              <p className="profile-val">{cons.staff}</p>
            </div>
            <div>
              <span className="profile-lbl">Started</span>
              <p className="profile-val">{cons.startedAt || '—'}</p>
            </div>
            <div>
              <span className="profile-lbl">Completed</span>
              <p className="profile-val">{cons.completedAt || '—'}</p>
            </div>
          </div>

          <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
            <h4 className="text-teal">Chief Complaint</h4>
            <p>{cons.chiefComplaint || '—'}</p>
          </div>

          {cons.vitals && (
            <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
              <h4 className="text-teal">Vital Signs</h4>
              <div className="vitals-readout">
                <span>Temp: {cons.vitals.temperature || '—'}</span>
                <span>BP: {cons.vitals.bloodPressure || '—'}</span>
                <span>Pulse: {cons.vitals.pulseRate || '—'}</span>
                <span>RR: {cons.vitals.respiratoryRate || '—'}</span>
                <span>Height: {cons.vitals.height || '—'}</span>
                <span>Weight: {cons.vitals.weight || '—'}</span>
              </div>
            </div>
          )}

          <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
            <h4 className="text-teal">Clinical Findings</h4>
            <p>{cons.clinicalFindings || '—'}</p>
          </div>
          <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
            <h4 className="text-teal">Assessment / Diagnosis</h4>
            <p>{cons.diagnosis || '—'}</p>
          </div>
          <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
            <h4 className="text-teal">Treatment and Advice</h4>
            <p>{cons.treatment || '—'}</p>
          </div>
          {cons.disposition && (
            <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
              <h4 className="text-teal">Disposition</h4>
              <span className={`dispo-tag dispo-${cons.disposition.toLowerCase().replace(/ /g, '-')}`}>{cons.disposition}</span>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-pill" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ---------- Read-only medication details modal ----------
function MedicationDetailsModal({ med, patientName, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Medication ${med.name} details`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card modal-card-sm">
        <div className="modal-header">
          <h3>Medication Details</h3>
          <button type="button" className="btn-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="appointment-detail-banner">
            <StatusBadge status={med.status} />
            <div>
              <strong>{med.name} {med.dosage}</strong>
              <span className="block-sub muted-text">Prescribed to {patientName}</span>
            </div>
          </div>
          <div className="profile-details-grid">
            <div>
              <span className="profile-lbl">Dosage</span>
              <p className="profile-val">{med.dosage || '—'}</p>
            </div>
            <div>
              <span className="profile-lbl">Frequency</span>
              <p className="profile-val">{med.frequency || '—'}</p>
            </div>
            <div>
              <span className="profile-lbl">Route</span>
              <p className="profile-val">{med.route || '—'}</p>
            </div>
            <div>
              <span className="profile-lbl">Prescribed By</span>
              <p className="profile-val">{med.prescribedBy || '—'}</p>
            </div>
            <div>
              <span className="profile-lbl">Prescribed Date</span>
              <p className="profile-val">{formatDate(med.prescribedDate)}</p>
            </div>
            <div>
              <span className="profile-lbl">Start Date</span>
              <p className="profile-val">{med.startDate ? formatDate(med.startDate) : '—'}</p>
            </div>
            <div>
              <span className="profile-lbl">End Date</span>
              <p className="profile-val">{med.endDate ? formatDate(med.endDate) : '—'}</p>
            </div>
          </div>
          {med.instructions && (
            <div className="profile-alert-box reason-box" style={{ marginTop: 12 }}>
              <h4 className="text-teal">Instructions</h4>
              <p>{med.instructions}</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-pill" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function MedicalRecords({ page }) {
  const {
    data: records,
    isLoading,
    error,
    refetch,
    addCondition,
    updateCondition,
    removeCondition,
    addAllergy,
    updateAllergy,
    removeAllergy,
  } = useMedicalRecords()
  const { data: consultations } = useConsultations()
  const { toast, showToast, dismiss } = useToast()
  const { userRole } = useAppContext()
  const canEdit = MEDICAL_ROLES.includes(userRole)

  // ---------- List state (debounced search + filter + pagination, API-ready) ----------
  // pageSize 5 so pagination is visible with the current mock dataset; the
  // hook accepts any pageSize/limit and is structured for server pagination.
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    clearFilters,
    filtered,
    pageItems,
    currentPage,
    totalPages,
    goToPage,
  } = useMedicalRecordList(records, { pageSize: 5, debounceDelay: 300 })

  // ---------- Detail view state ----------
  const [selectedId, setSelectedId] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // ---------- Modal state ----------
  const [conditionModal, setConditionModal] = useState(null) // { record, condition? }
  const [allergyModal, setAllergyModal] = useState(null) // { record, allergy? }
  const [removeTarget, setRemoveTarget] = useState(null) // { kind, record, item }
  const [consultDetails, setConsultDetails] = useState(null)
  const [medDetails, setMedDetails] = useState(null) // { med, patientName }
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  // Form drafts for the management modals
  const emptyConditionForm = () => ({ name: '', status: 'Active', diagnosedDate: todayISO(), notes: '' })
  const emptyAllergyForm = () => ({ allergen: '', reaction: '', severity: 'Moderate', dateRecorded: todayISO(), notes: '' })
  const conditionForm = useForm(emptyConditionForm(), {
    validate: (values) => (values.name.trim() ? {} : { name: 'Condition name is required.' }),
  })
  const allergyForm = useForm(emptyAllergyForm(), {
    validate: (values) => (values.allergen.trim() ? {} : { allergen: 'Allergen is required.' }),
  })

  // Per-patient consultation metadata (count + last date) from the shared store.
  const consultMeta = useMemo(() => {
    const map = {}
    for (const c of consultations) {
      const entry = map[c.patientId] || (map[c.patientId] = { count: 0, last: '' })
      entry.count += 1
      if (c.date > entry.last) entry.last = c.date
    }
    return map
  }, [consultations])

  const statusCounts = useMemo(() => {
    const counts = { All: records.length, Active: 0, Archived: 0 }
    for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1
    return counts
  }, [records])

  // ---------- Detail derivations ----------
  const selected = selectedId ? records.find((r) => r.id === selectedId) || null : null
  const patientConsults = useMemo(
    () => (selected ? consultations.filter((c) => c.patientId === selected.patientId) : []),
    [selected, consultations],
  )
  const timeline = useMemo(
    () => (selected ? buildTimeline(selected, patientConsults) : []),
    [selected, patientConsults],
  )
  const activeConditions = selected ? selected.conditions.filter((c) => c.status === 'Active') : []
  const activeMedications = selected ? selected.medications.filter((m) => m.status === 'Active') : []

  // Escape closes whichever dialog is on top.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || busy) return
      if (conditionModal) setConditionModal(null)
      else if (allergyModal) setAllergyModal(null)
      else if (removeTarget) setRemoveTarget(null)
      else if (consultDetails) setConsultDetails(null)
      else if (medDetails) setMedDetails(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, conditionModal, allergyModal, removeTarget, consultDetails, medDetails])

  const openRecord = (record) => {
    setSelectedId(record.id)
    setActiveTab('overview')
  }

  const closeRecord = () => {
    setSelectedId(null)
    setActiveTab('overview')
  }

  // ---------- Condition handlers ----------
  const openConditionModal = (record, condition = null) => {
    setConditionModal({ record, condition })
    conditionForm.reset(
      condition
        ? { name: condition.name, status: condition.status, diagnosedDate: condition.diagnosedDate, notes: condition.notes }
        : emptyConditionForm(),
    )
  }

  const handleSaveCondition = async () => {
    if (!conditionModal || busy || busyRef.current) return
    const validationErrors = conditionForm.runValidation()
    if (Object.keys(validationErrors).length > 0) return
    busyRef.current = true
    setBusy(true)
    try {
      const payload = {
        name: conditionForm.values.name.trim(),
        status: conditionForm.values.status,
        diagnosedDate: conditionForm.values.diagnosedDate || todayISO(),
        notes: conditionForm.values.notes.trim(),
      }
      if (conditionModal.condition) {
        await updateCondition(conditionModal.record.id, conditionModal.condition.id, payload)
        showToast(`"${payload.name}" updated.`)
      } else {
        await addCondition(conditionModal.record.id, payload)
        showToast(`Condition "${payload.name}" added.`)
      }
      setConditionModal(null)
    } catch (err) {
      showToast(err?.message || 'Failed to save the condition.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const quickToggleCondition = async (record, condition) => {
    if (!canEdit || busy || busyRef.current) return
    const next = condition.status === 'Resolved' ? 'Active' : 'Resolved'
    busyRef.current = true
    setBusy(true)
    try {
      await updateCondition(record.id, condition.id, { status: next })
      showToast(`"${condition.name}" marked ${next}.`)
    } catch (err) {
      showToast(err?.message || 'Failed to update the condition.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Allergy handlers ----------
  const openAllergyModal = (record, allergy = null) => {
    setAllergyModal({ record, allergy })
    allergyForm.reset(
      allergy
        ? { allergen: allergy.allergen, reaction: allergy.reaction, severity: allergy.severity, dateRecorded: allergy.dateRecorded, notes: allergy.notes }
        : emptyAllergyForm(),
    )
  }

  const handleSaveAllergy = async () => {
    if (!allergyModal || busy || busyRef.current) return
    const validationErrors = allergyForm.runValidation()
    if (Object.keys(validationErrors).length > 0) return
    busyRef.current = true
    setBusy(true)
    try {
      const payload = {
        allergen: allergyForm.values.allergen.trim(),
        reaction: allergyForm.values.reaction.trim(),
        severity: allergyForm.values.severity,
        dateRecorded: allergyForm.values.dateRecorded || todayISO(),
        notes: allergyForm.values.notes.trim(),
      }
      if (allergyModal.allergy) {
        await updateAllergy(allergyModal.record.id, allergyModal.allergy.id, payload)
        showToast(`Allergy "${payload.allergen}" updated.`)
      } else {
        await addAllergy(allergyModal.record.id, payload)
        showToast(`Allergy "${payload.allergen}" recorded.`)
      }
      setAllergyModal(null)
    } catch (err) {
      showToast(err?.message || 'Failed to save the allergy.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!removeTarget || busy || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      if (removeTarget.kind === 'condition') {
        await removeCondition(removeTarget.record.id, removeTarget.item.id, removeTarget.item.name)
        showToast(`Condition "${removeTarget.item.name}" removed.`)
      } else {
        await removeAllergy(removeTarget.record.id, removeTarget.item.id, removeTarget.item.allergen)
        showToast(`Allergy "${removeTarget.item.allergen}" removed.`)
      }
      setRemoveTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to remove the entry.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Render helpers ----------
  const renderList = () => (
    <>
      {/* Status summary chips (click to filter) */}
      <div className="appointments-summary mr-summary">
        {['All', ...RECORD_STATUSES].map((status) => (
          <button
            type="button"
            key={status}
            className={`summary-chip ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
          >
            <small>{status === 'All' ? 'All Records' : status}</small>
            <strong>{statusCounts[status] || 0}</strong>
          </button>
        ))}
      </div>

      <div className="panel main-panel medical-records-list-panel">
        <div className="panel-header flex-header">
          <div>
            <h3>Patient Medical Records</h3>
            <p>Search patient records and open complete medical histories</p>
          </div>
          <div className="appointments-toolbar">
            <input
              type="text"
              className="search-input toolbar-search"
              placeholder="Search patient, ID, record no., condition, or allergen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by record status"
            >
              <option value="All">All Statuses</option>
              {RECORD_STATUSES.map((s) => (
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
                {filtered.length} of {records.length} records
              </span>
            )}
          </div>
        </div>

        <div className="records-table-container">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : isLoading ? (
            <LoadingState label="Loading medical records..." />
          ) : (
            <table className="records-table clickable-rows">
              <thead>
                <tr>
                  <th>Record No.</th>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Consultations</th>
                  <th>Conditions</th>
                  <th>Allergies</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((record) => {
                  const meta = consultMeta[record.patientId]
                  const active = record.conditions.filter((c) => c.status === 'Active')
                  return (
                    <tr key={record.id} onClick={() => openRecord(record)}>
                      <td className="bold-text text-teal font-monospace">{record.id}</td>
                      <td>
                        <div className="patient-cell">
                          <span className="patient-avatar" aria-hidden="true">{initials(record.name)}</span>
                          <span>
                            <strong className="bold-text">{record.name}</strong>
                            <span className="block-sub muted-text">
                              {record.patientId} · {record.age} · {record.sex}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="muted-text">{record.contact}</td>
                      <td>
                        {meta && meta.count > 0 ? (
                          <>
                            <span className="bold-text">{formatDate(meta.last)}</span>
                            <span className="block-sub muted-text">{meta.count} visit{meta.count > 1 ? 's' : ''}</span>
                          </>
                        ) : (
                          <span className="muted-text">No visits</span>
                        )}
                      </td>
                      <td>
                        {active.length > 0 ? (
                          <div className="chip-group">
                            {active.slice(0, 2).map((c) => (
                              <span key={c.id} className="chip-tag">{c.name}</span>
                            ))}
                            {active.length > 2 && <span className="chip-tag muted">+{active.length - 2}</span>}
                          </div>
                        ) : (
                          <span className="muted-text">None</span>
                        )}
                      </td>
                      <td>
                        {record.allergies.length > 0 ? (
                          <span className="chip-tag chip-danger">
                            ⚠ {record.allergies.length} allergy{record.allergies.length > 1 ? 'ies' : 'y'}
                          </span>
                        ) : (
                          <span className="muted-text">None</span>
                        )}
                      </td>
                      <td className="muted-text">{formatDate(record.lastUpdated)}</td>
                      <td>
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button type="button" className="btn-view-small" onClick={() => openRecord(record)}>
                            View Record
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="9">
                      <EmptyState message="No medical records matched your search or filters." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>
    </>
  )

  const renderOverview = () => {
    const latestConsult =
      patientConsults.length > 0
        ? [...patientConsults].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0]
        : null
    return (
    <>
      <div className="panel main-panel">
        <h3 className="mr-section-title">Patient Information</h3>
        <div className="profile-details-grid">
          <div>
            <span className="profile-lbl">Patient</span>
            <p className="profile-val">{selected.name}</p>
          </div>
          <div>
            <span className="profile-lbl">Patient ID</span>
            <p className="profile-val">{selected.patientId}</p>
          </div>
          <div>
            <span className="profile-lbl">Age</span>
            <p className="profile-val">{selected.age} years</p>
          </div>
          <div>
            <span className="profile-lbl">Sex</span>
            <p className="profile-val">{selected.sex}</p>
          </div>
          <div>
            <span className="profile-lbl">Type</span>
            <p className="profile-val">{selected.type}</p>
          </div>
          <div>
            <span className="profile-lbl">Course / Dept.</span>
            <p className="profile-val">{selected.courseDept}</p>
          </div>
          <div>
            <span className="profile-lbl">Contact</span>
            <p className="profile-val">{selected.contact}</p>
          </div>
          <div>
            <span className="profile-lbl">Emergency Contact</span>
            <p className="profile-val">{selected.emergencyContact}</p>
          </div>
          <div>
            <span className="profile-lbl">Record No.</span>
            <p className="profile-val">{selected.id}</p>
          </div>
          <div>
            <span className="profile-lbl">Last Updated</span>
            <p className="profile-val">{formatDate(selected.lastUpdated)}</p>
          </div>
        </div>
      </div>

      <div className="mr-overview-grid">
        <div className="panel main-panel">
          <h3 className="mr-section-title">Current Conditions</h3>
          {activeConditions.length > 0 ? (
            <div className="mini-log-list">
              {activeConditions.map((c) => (
                <div className="mini-log-card" key={c.id}>
                  <div className="mini-log-header">
                    <strong>{c.name}</strong>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mini-log-body">
                    Diagnosed {formatDate(c.diagnosedDate)}
                    {c.notes ? ` — ${c.notes}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-mini-state">No active conditions on file.</div>
          )}
        </div>

        <div className="panel main-panel">
          <h3 className="mr-section-title">Latest Consultation</h3>
          {latestConsult ? (
            <div className="mini-log-card">
              <div className="mini-log-header">
                <strong>{latestConsult.reference}</strong>
                <StatusBadge status={latestConsult.status} />
              </div>
              <p className="mini-log-body">
                {formatDate(latestConsult.date)} at {latestConsult.time} — {latestConsult.staff}
              </p>
              <p className="mini-log-body">
                <strong>Complaint:</strong> {latestConsult.chiefComplaint || '—'}
              </p>
              <p className="mini-log-body">
                <strong>Diagnosis:</strong> {latestConsult.diagnosis || '—'}
              </p>
              <div className="status-manage-row" style={{ marginTop: 10 }}>
                <button type="button" className="btn-view-small" onClick={() => setConsultDetails(latestConsult)}>
                  View Details
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-mini-state">No consultations recorded yet.</div>
          )}
        </div>
      </div>
    </>
    )
  }

  const renderHistory = () => (
    <div className="panel main-panel">
      <h3 className="mr-section-title">Medical History</h3>
      {selected.medicalHistory.length > 0 ? (
        <div className="records-table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>History / Event</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {[...selected.medicalHistory].sort((a, b) => (a.date < b.date ? 1 : -1)).map((h) => (
                <tr key={h.id}>
                  <td className="bold-text">{formatDate(h.date)}</td>
                  <td className="bold-text">{h.condition}</td>
                  <td className="muted-text">{h.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-mini-state">No previous medical history recorded.</div>
      )}
    </div>
  )

  const renderConditions = () => (
    <div className="panel main-panel">
      <div className="mr-section-header">
        <div>
          <h3 className="mr-section-title" style={{ marginBottom: 2 }}>Medical Conditions</h3>
          <p className="muted-text" style={{ margin: 0 }}>Track active, inactive, and resolved conditions.</p>
        </div>
        {canEdit && (
          <button type="button" className="primary-action" onClick={() => openConditionModal(selected)} disabled={busy}>
            + Add Condition
          </button>
        )}
      </div>

      {!canEdit && <div className="auth-notice">⚠ You have view-only access. Only authorized medical personnel can manage conditions.</div>}

      {selected.conditions.length > 0 ? (
        <div className="records-table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Condition</th>
                <th>Status</th>
                <th>Diagnosed</th>
                <th>Notes</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {selected.conditions.map((c) => (
                <tr key={c.id}>
                  <td className="bold-text">{c.name}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{formatDate(c.diagnosedDate)}</td>
                  <td className="muted-text">{c.notes || '—'}</td>
                  {canEdit && (
                    <td className="actions-cell">
                      <div className="row-actions">
                        <button type="button" className="btn-info-small" onClick={() => openConditionModal(selected, c)} disabled={busy}>
                          Edit
                        </button>
                        <button type="button" className={c.status === 'Resolved' ? 'btn-success-small' : 'btn-primary-small'} onClick={() => quickToggleCondition(selected, c)} disabled={busy}>
                          {c.status === 'Resolved' ? 'Mark Active' : 'Mark Resolved'}
                        </button>
                        <button type="button" className="btn-danger-small" onClick={() => setRemoveTarget({ kind: 'condition', record: selected, item: c })} disabled={busy}>
                          Remove
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-mini-state">No medical conditions on file.</div>
      )}
    </div>
  )

  const renderAllergies = () => (
    <div className="panel main-panel">
      <div className="mr-section-header">
        <div>
          <h3 className="mr-section-title" style={{ marginBottom: 2 }}>Allergies</h3>
          <p className="muted-text" style={{ margin: 0 }}>Known allergens with reaction and severity.</p>
        </div>
        {canEdit && (
          <button type="button" className="primary-action" onClick={() => openAllergyModal(selected)} disabled={busy}>
            + Add Allergy
          </button>
        )}
      </div>

      {!canEdit && <div className="auth-notice">⚠ You have view-only access. Only authorized medical personnel can manage allergies.</div>}

      {selected.allergies.length > 0 ? (
        <div className="allergy-grid">
          {selected.allergies.map((a) => (
            <div className={`allergy-card sev-${a.severity.toLowerCase()}`} key={a.id}>
              <div className="allergy-card-head">
                <strong>⚠ {a.allergen}</strong>
                <StatusBadge status={a.severity} />
              </div>
              <p className="allergy-reaction">
                <span className="profile-lbl">Reaction</span>
                {a.reaction || '—'}
              </p>
              <p className="allergy-meta muted-text">Recorded {formatDate(a.dateRecorded)}</p>
              {a.notes && <p className="allergy-notes">{a.notes}</p>}
              {canEdit && (
                <div className="row-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="btn-info-small" onClick={() => openAllergyModal(selected, a)} disabled={busy}>
                    Edit
                  </button>
                  <button type="button" className="btn-danger-small" onClick={() => setRemoveTarget({ kind: 'allergy', record: selected, item: a })} disabled={busy}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-mini-state">No known allergies on file.</div>
      )}
    </div>
  )

  const renderConsultations = () => (
    <div className="panel main-panel">
      <div className="mr-section-header">
        <div>
          <h3 className="mr-section-title" style={{ marginBottom: 2 }}>Consultation History</h3>
          <p className="muted-text" style={{ margin: 0 }}>
            {patientConsults.length > 0
              ? `${patientConsults.length} consultation${patientConsults.length > 1 ? 's' : ''} on record (read-only view).`
              : 'No consultations on record for this patient.'}
          </p>
        </div>
      </div>

      {patientConsults.length > 0 ? (
        <div className="records-table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Medical Personnel</th>
                <th>Chief Complaint</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patientConsults.map((c) => (
                <tr key={c.id}>
                  <td className="bold-text text-teal font-monospace">{c.reference}</td>
                  <td>
                    <span className="bold-text">{formatDate(c.date)}</span>
                    <span className="block-sub muted-text">{c.time}</span>
                  </td>
                  <td>{c.staff}</td>
                  <td className="muted-text">{c.chiefComplaint || '—'}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="btn-view-small" onClick={() => setConsultDetails(c)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-mini-state">This patient has no consultation history yet.</div>
      )}
    </div>
  )

  const renderMedications = () => (
    <div className="panel main-panel">
      <h3 className="mr-section-title">Medication History</h3>
      {selected.medications.length > 0 ? (
        <div className="med-list">
          {selected.medications.map((m) => (
            <div className="med-card" key={m.id}>
              <div className="med-card-head">
                <div>
                  <strong>{m.name}</strong>
                  <span className="med-dosage">{m.dosage}</span>
                </div>
                <StatusBadge status={m.status} />
              </div>
              <div className="med-card-meta">
                <span>{m.frequency}</span>
                <span className="muted-text">{m.route ? `Route: ${m.route}` : ''}</span>
                <span className="muted-text">
                  {m.prescribedBy} · {formatDate(m.prescribedDate)}
                </span>
              </div>
              {m.instructions && <p className="med-instructions muted-text">{m.instructions}</p>}
              <div className="status-manage-row" style={{ marginTop: 10, paddingTop: 10 }}>
                <button type="button" className="btn-view-small" onClick={() => setMedDetails({ med: m, patientName: selected.name })}>
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-mini-state">No medications recorded for this patient.</div>
      )}
    </div>
  )

  const renderTimeline = () => (
    <div className="panel main-panel">
      <h3 className="mr-section-title">Medical Record Timeline</h3>
      {timeline.length > 0 ? (
        <div className="timeline">
          {timeline.map((event) => (
            <div className="timeline-item" key={event.id}>
              <span className="timeline-dot" aria-hidden="true" />
              <div className="timeline-date">{formatDate(event.date)}</div>
              <span className={`tl-type ${TIMELINE_CLASS[event.type] || 'tl-history'}`}>{event.type}</span>
              {event.consultation ? (
                <button type="button" className="timeline-title timeline-link" onClick={() => setConsultDetails(event.consultation)}>
                  {event.title}
                </button>
              ) : (
                <h4 className="timeline-title">{event.title}</h4>
              )}
              {event.subtitle && <p className="timeline-sub">{event.subtitle}</p>}
              {event.staff && <p className="timeline-sub muted-text">{event.staff}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-mini-state">No timeline events recorded yet.</div>
      )}
    </div>
  )

  const renderDetail = () => (
    <div className="mr-detail">
      <div className="mr-back-row">
        <button type="button" className="secondary-pill" onClick={closeRecord}>
          ← Back to Records
        </button>
        <span className="muted-text">{selected.id}</span>
      </div>

      <div className="panel main-panel mr-patient-header">
        <span className="mr-avatar-lg" aria-hidden="true">{initials(selected.name)}</span>
        <div className="mr-patient-id">
          <h3>{selected.name}</h3>
          <p>{selected.patientId} · {selected.type} · {selected.courseDept}</p>
          <p className="muted-text">{selected.age} years old · {selected.sex} · {selected.contact}</p>
        </div>
        <div className="mr-header-right">
          <StatusBadge status={selected.status} />
          <span className="block-sub muted-text">Updated {formatDate(selected.lastUpdated)}</span>
        </div>
      </div>

      {selected.allergies.length > 0 && (
        <div className="mr-allergy-warning">
          <span>⚠</span>
          <span>
            Allergies on file: <strong>{selected.allergies.map((a) => a.allergen).join(', ')}</strong>
          </span>
        </div>
      )}

      <div className="mr-stats-strip">
        <div className="mr-stat">
          <small>Consultations</small>
          <strong>{patientConsults.length}</strong>
        </div>
        <div className="mr-stat">
          <small>Active Conditions</small>
          <strong>{activeConditions.length}</strong>
        </div>
        <div className="mr-stat">
          <small>Allergies</small>
          <strong>{selected.allergies.length}</strong>
        </div>
        <div className="mr-stat">
          <small>Active Medications</small>
          <strong>{activeMedications.length}</strong>
        </div>
      </div>

      <nav className="dashboard-tabs" aria-label="Record sections">
        {DETAIL_TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mr-tab-view">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'conditions' && renderConditions()}
        {activeTab === 'allergies' && renderAllergies()}
        {activeTab === 'consultations' && renderConsultations()}
        {activeTab === 'medications' && renderMedications()}
        {activeTab === 'timeline' && renderTimeline()}
      </div>
    </div>
  )

  return (
    <div className="medical-records-page">
      {/* Page header */}
      <section className="page-heading">
        <div>
          <p>{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <span className="page-heading-description">{page.description}</span>
        </div>
      </section>

      {selected ? renderDetail() : renderList()}

      {/* ============ CONDITION FORM MODAL ============ */}
      {conditionModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Medical condition form"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setConditionModal(null)
          }}
        >
          <div className="modal-card modal-card-sm">
            <div className="modal-header">
              <h3>{conditionModal.condition ? 'Edit Condition' : 'Add Medical Condition'}</h3>
              <button type="button" className="btn-modal-close" onClick={() => { if (!busy) setConditionModal(null) }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="sidebar-form">
                <label>
                  Condition name *
                  <input
                    type="text"
                    placeholder="e.g. Hypertension"
                    value={conditionForm.values.name}
                    onChange={(e) => conditionForm.setValue('name', e.target.value)}
                    disabled={busy}
                  />
                </label>
                <div className="form-row-grid">
                  <label>
                    Status
                    <select value={conditionForm.values.status} onChange={(e) => conditionForm.setValue('status', e.target.value)} disabled={busy}>
                      {CONDITION_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Date diagnosed
                    <input
                      type="date"
                      value={conditionForm.values.diagnosedDate}
                      onChange={(e) => conditionForm.setValue('diagnosedDate', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>
                <label>
                  Notes
                  <textarea
                    placeholder="e.g. Patient advised to monitor blood pressure regularly."
                    value={conditionForm.values.notes}
                    onChange={(e) => conditionForm.setValue('notes', e.target.value)}
                    disabled={busy}
                  />
                </label>
                {conditionForm.errors.name && <p className="section-error">{conditionForm.errors.name}</p>}
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-footer-actions">
                <button type="button" className="secondary-pill" onClick={() => { if (!busy) setConditionModal(null) }} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="primary-action" onClick={handleSaveCondition} disabled={busy}>
                  {busy ? 'Saving...' : 'Save Condition'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ ALLERGY FORM MODAL ============ */}
      {allergyModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Allergy form"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setAllergyModal(null)
          }}
        >
          <div className="modal-card modal-card-sm">
            <div className="modal-header">
              <h3>{allergyModal.allergy ? 'Edit Allergy' : 'Record Allergy'}</h3>
              <button type="button" className="btn-modal-close" onClick={() => { if (!busy) setAllergyModal(null) }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="sidebar-form">
                <label>
                  Allergen *
                  <input
                    type="text"
                    placeholder="e.g. Penicillin"
                    value={allergyForm.values.allergen}
                    onChange={(e) => allergyForm.setValue('allergen', e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label>
                  Reaction
                  <input
                    type="text"
                    placeholder="e.g. Skin rash"
                    value={allergyForm.values.reaction}
                    onChange={(e) => allergyForm.setValue('reaction', e.target.value)}
                    disabled={busy}
                  />
                </label>
                <div className="form-row-grid">
                  <label>
                    Severity
                    <select value={allergyForm.values.severity} onChange={(e) => allergyForm.setValue('severity', e.target.value)} disabled={busy}>
                      {ALLERGY_SEVERITIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Date recorded
                    <input
                      type="date"
                      value={allergyForm.values.dateRecorded}
                      onChange={(e) => allergyForm.setValue('dateRecorded', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>
                <label>
                  Notes
                  <textarea
                    placeholder="e.g. Avoid penicillin-based antibiotics."
                    value={allergyForm.values.notes}
                    onChange={(e) => allergyForm.setValue('notes', e.target.value)}
                    disabled={busy}
                  />
                </label>
                {allergyForm.errors.allergen && <p className="section-error">{allergyForm.errors.allergen}</p>}
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-footer-actions">
                <button type="button" className="secondary-pill" onClick={() => { if (!busy) setAllergyModal(null) }} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="primary-action" onClick={handleSaveAllergy} disabled={busy}>
                  {busy ? 'Saving...' : 'Save Allergy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ REMOVE CONFIRMATION MODAL ============ */}
      {removeTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm removal"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setRemoveTarget(null)
          }}
        >
          <div className="modal-card modal-card-sm">
            <div className="modal-header">
              <h3>{removeTarget.kind === 'condition' ? 'Remove Condition' : 'Remove Allergy'}</h3>
              <button type="button" className="btn-modal-close" onClick={() => { if (!busy) setRemoveTarget(null) }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>
                Remove <strong>{removeTarget.kind === 'condition' ? removeTarget.item.name : removeTarget.item.allergen}</strong>{' '}
                from <strong>{removeTarget.record.name}</strong>&apos;s medical record?
              </p>
              <p className="muted-text" style={{ marginBottom: 0 }}>
                This will permanently delete the entry. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <div className="modal-footer-actions">
                <button type="button" className="secondary-pill" onClick={() => { if (!busy) setRemoveTarget(null) }} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="btn-action-danger" onClick={handleConfirmRemove} disabled={busy}>
                  {busy ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ READ-ONLY CONSULTATION DETAILS ============ */}
      {consultDetails && <ConsultationDetailsModal cons={consultDetails} onClose={() => setConsultDetails(null)} />}

      {/* ============ READ-ONLY MEDICATION DETAILS ============ */}
      {medDetails && <MedicationDetailsModal med={medDetails.med} patientName={medDetails.patientName} onClose={() => setMedDetails(null)} />}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}

export default MedicalRecords
