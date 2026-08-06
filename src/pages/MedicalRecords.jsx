import { useEffect, useMemo, useRef, useState } from 'react'
import { useMedicalRecords } from '../hooks/useMedicalRecords'
import { useConsultations } from '../hooks/useConsultations'
import { useToast } from '../hooks/useToast'
import { useForm } from '../hooks/useForm'
import { useMedicalRecordList } from '../hooks/useMedicalRecordList'
import { useAuth } from '../hooks/useAuth'
import { formatDate, initials, todayISO } from '../lib/format'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT, SIDEBAR_FORM,
  FORM_LABEL, FORM_FIELD, FORM_ROW, BTN_SUCCESS, BTN_DANGER, BTN_INFO, BTN_VIEW, BTN_ACTION_DANGER,
  DISPO_TAG, dispoClasses,
} from '../lib/ui'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'

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

// Timeline event type → Tailwind classes for the type tag.
const TIMELINE_CLASS = {
  Consultation: 'bg-[#e8f0fe] text-[#1a56c4]',
  'Medical Condition': 'bg-[#fff3d6] text-[#8a5a00]',
  'Allergy Recorded': 'bg-[#ffebe6] text-[#b3361f]',
  'Medication Prescribed': 'bg-[#dff6dd] text-[#1e5a1b]',
  'Medical History': 'bg-[#eef2f1] text-[#4d615e]',
}

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
const REASON_BOX = 'rounded-lg border border-[#cfe5df] bg-[#f4faf8] p-[12px_14px]'
const MINI_CARD = 'rounded-lg border border-line bg-[#fafcfb] p-[10px_12px]'
const MINI_HEADER = 'mb-[5px] flex items-center justify-between'
const MINI_BODY = 'm-0 text-[12px] leading-[1.4] text-muted'
const EMPTY_MINI = 'rounded-lg border border-dashed border-[#c2dcd6] p-4 text-center text-[12.5px] text-muted'
const SECTION_TITLE = 'm-0 mb-3 text-[16px] text-[#143d40]'
const AUTH_NOTICE = 'mb-[14px] flex items-center gap-2 rounded-lg border border-dashed border-[#f2cfc2] bg-[#fdf1ec] p-[10px_14px] text-[12.5px] font-bold text-[#a33c12]'

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
    <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label={`Consultation ${cons.reference} details`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={MODAL_CARD}>
        <div className={MODAL_HEADER}>
          <h3 className="m-0 text-[18px] text-ink">Consultation Details — {cons.reference}</h3>
          <button type="button" className={MODAL_CLOSE} onClick={onClose}>✕</button>
        </div>
        <div className={MODAL_BODY}>
          <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
            <StatusBadge status={cons.status} />
            <div>
              <strong className="block text-[15px] text-ink">{cons.patient}</strong>
              <span className="block text-[12px] text-muted">{cons.patientId} · {formatDate(cons.date)} at {cons.time}</span>
            </div>
          </div>

          <div className={PROFILE_GRID}>
            <div>
              <span className={PROFILE_LBL}>Attending Staff</span>
              <p className={PROFILE_VAL}>{cons.staff}</p>
            </div>
            <div>
              <span className={PROFILE_LBL}>Started</span>
              <p className={PROFILE_VAL}>{cons.startedAt || '—'}</p>
            </div>
            <div>
              <span className={PROFILE_LBL}>Completed</span>
              <p className={PROFILE_VAL}>{cons.completedAt || '—'}</p>
            </div>
          </div>

          <div className={`${REASON_BOX} mt-3`}>
            <h4 className="mb-1 m-0 text-[13px] text-primary">Chief Complaint</h4>
            <p className="m-0 text-[13px]">{cons.chiefComplaint || '—'}</p>
          </div>

          {cons.vitals && (
            <div className={`${REASON_BOX} mt-3`}>
              <h4 className="mb-1 m-0 text-[13px] text-primary">Vital Signs</h4>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-[6px_14px] text-[13px] text-ink">
                <span>Temp: {cons.vitals.temperature || '—'}</span>
                <span>BP: {cons.vitals.bloodPressure || '—'}</span>
                <span>Pulse: {cons.vitals.pulseRate || '—'}</span>
                <span>RR: {cons.vitals.respiratoryRate || '—'}</span>
                <span>Height: {cons.vitals.height || '—'}</span>
                <span>Weight: {cons.vitals.weight || '—'}</span>
              </div>
            </div>
          )}

          <div className={`${REASON_BOX} mt-3`}>
            <h4 className="mb-1 m-0 text-[13px] text-primary">Clinical Findings</h4>
            <p className="m-0 text-[13px]">{cons.clinicalFindings || '—'}</p>
          </div>
          <div className={`${REASON_BOX} mt-3`}>
            <h4 className="mb-1 m-0 text-[13px] text-primary">Assessment / Diagnosis</h4>
            <p className="m-0 text-[13px]">{cons.diagnosis || '—'}</p>
          </div>
          <div className={`${REASON_BOX} mt-3`}>
            <h4 className="mb-1 m-0 text-[13px] text-primary">Treatment and Advice</h4>
            <p className="m-0 text-[13px]">{cons.treatment || '—'}</p>
          </div>
          {cons.disposition && (
            <div className={`${REASON_BOX} mt-3`}>
              <h4 className="mb-1 m-0 text-[13px] text-primary">Disposition</h4>
              <span className={`${DISPO_TAG} ${dispoClasses(cons.disposition)}`}>{cons.disposition}</span>
            </div>
          )}
        </div>
        <div className={MODAL_FOOTER}>
          <button type="button" className={PILL} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ---------- Read-only medication details modal ----------
function MedicationDetailsModal({ med, patientName, onClose }) {
  return (
    <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label={`Medication ${med.name} details`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={MODAL_CARD_SM}>
        <div className={MODAL_HEADER}>
          <h3 className="m-0 text-[18px] text-ink">Medication Details</h3>
          <button type="button" className={MODAL_CLOSE} onClick={onClose}>✕</button>
        </div>
        <div className={MODAL_BODY}>
          <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
            <StatusBadge status={med.status} />
            <div>
              <strong className="block text-[15px] text-ink">{med.name} {med.dosage}</strong>
              <span className="block text-[12px] text-muted">Prescribed to {patientName}</span>
            </div>
          </div>
          <div className={PROFILE_GRID}>
            <div>
              <span className={PROFILE_LBL}>Dosage</span>
              <p className={PROFILE_VAL}>{med.dosage || '—'}</p>
            </div>
            <div>
              <span className={PROFILE_LBL}>Frequency</span>
              <p className={PROFILE_VAL}>{med.frequency || '—'}</p>
            </div>
            <div>
              <span className={PROFILE_LBL}>Route</span>
              <p className={PROFILE_VAL}>{med.route || '—'}</p>
            </div>
            <div>
              <span className={PROFILE_LBL}>Prescribed By</span>
              <p className={PROFILE_VAL}>{med.prescribedBy || '—'}</p>
            </div>
            <div>
              <span className={PROFILE_LBL}>Prescribed Date</span>
              <p className={PROFILE_VAL}>{formatDate(med.prescribedDate)}</p>
            </div>
            <div>
              <span className={PROFILE_LBL}>Start Date</span>
              <p className={PROFILE_VAL}>{med.startDate ? formatDate(med.startDate) : '—'}</p>
            </div>
            <div>
              <span className={PROFILE_LBL}>End Date</span>
              <p className={PROFILE_VAL}>{med.endDate ? formatDate(med.endDate) : '—'}</p>
            </div>
          </div>
          {med.instructions && (
            <div className={`${REASON_BOX} mt-3`}>
              <h4 className="mb-1 m-0 text-[13px] text-primary">Instructions</h4>
              <p className="m-0 text-[13px]">{med.instructions}</p>
            </div>
          )}
        </div>
        <div className={MODAL_FOOTER}>
          <button type="button" className={PILL} onClick={onClose}>Close</button>
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
    isRefetching,
    addCondition,
    updateCondition,
    removeCondition,
    addAllergy,
    updateAllergy,
    removeAllergy,
  } = useMedicalRecords()
  const { data: consultations } = useConsultations()
  const { showToast } = useToast()
  const { userRole } = useAuth()
  const canEdit = MEDICAL_ROLES.includes(userRole)

  // ---------- List state (debounced search + filter + pagination, API-ready) ----------
  // pageSize 5 so pagination is visible with the current dataset; the
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
      <div className="mb-[18px] grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
        {['All', ...RECORD_STATUSES].map((status) => (
          <button
            type="button"
            key={status}
            className={`flex cursor-pointer flex-col gap-[2px] rounded-lg border border-line-strong bg-white p-[14px_16px] text-left transition-all duration-200 hover:border-primary ${statusFilter === status ? 'border-primary bg-[#f0faf8] shadow-[inset_0_0_0_1px_var(--color-primary)]' : ''}`}
            onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
          >
            <small className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-muted">{status === 'All' ? 'All Records' : status}</small>
            <strong className="text-[26px] leading-none text-ink">{statusCounts[status] || 0}</strong>
          </button>
        ))}
      </div>

      <div className={`${PANEL} p-5`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[18px] text-[#143d40]">Patient Medical Records</h3>
            <p className={KICKER}>Search patient records and open complete medical histories</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-[10px]">
            <input
              type="text"
              className={`${SEARCH_INPUT} min-w-[200px] flex-[1_1_220px]`}
              placeholder="Search patient, ID, record no., condition, or allergen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={SELECT_INPUT}
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
              <button type="button" className={PILL} onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {!isLoading && !error && (
              <>
                <RefreshingBadge refreshing={isRefetching} />
                <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">
                  {filtered.length} of {records.length} records
                </span>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : isLoading ? (
            <TableSkeleton columns={9} />
          ) : (
            <table className={`${TABLE} [&_tbody_tr]:cursor-pointer [&_tbody_tr:hover]:bg-[#f7fbfb]`}>
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
                      <td className="font-mono font-bold text-primary">{record.id}</td>
                      <td>
                        <div className="flex items-center gap-[10px]">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-extrabold tracking-[0.03em] text-white" aria-hidden="true">{initials(record.name)}</span>
                          <span>
                            <strong className="font-bold text-ink">{record.name}</strong>
                            <span className="block text-[12px] text-muted">
                              {record.patientId} · {record.age} · {record.sex}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="text-muted">{record.contact}</td>
                      <td>
                        {meta && meta.count > 0 ? (
                          <>
                            <span className="font-bold text-ink">{formatDate(meta.last)}</span>
                            <span className="block text-[12px] text-muted">{meta.count} visit{meta.count > 1 ? 's' : ''}</span>
                          </>
                        ) : (
                          <span className="text-muted">No visits</span>
                        )}
                      </td>
                      <td>
                        {active.length > 0 ? (
                          <div className="flex flex-wrap gap-[5px]">
                            {active.slice(0, 2).map((c) => (
                              <span key={c.id} className="inline-flex items-center whitespace-nowrap rounded-full bg-bg px-[9px] py-[3px] text-[11px] font-extrabold text-[#4d615e]">{c.name}</span>
                            ))}
                            {active.length > 2 && <span className="inline-flex items-center whitespace-nowrap rounded-full bg-bg px-[9px] py-[3px] text-[11px] font-extrabold text-muted">+{active.length - 2}</span>}
                          </div>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                      <td>
                        {record.allergies.length > 0 ? (
                          <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#ffebe6] px-[9px] py-[3px] text-[11px] font-extrabold text-[#b3361f]">
                            ⚠ {record.allergies.length} allergy{record.allergies.length > 1 ? 'ies' : 'y'}
                          </span>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                      <td className="text-muted">{formatDate(record.lastUpdated)}</td>
                      <td>
                        <StatusBadge status={record.status} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-[6px]">
                          <button type="button" className={BTN_VIEW} onClick={() => openRecord(record)}>
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
      <div className={`${PANEL} p-5`}>
        <h3 className={SECTION_TITLE}>Patient Information</h3>
        <div className={PROFILE_GRID}>
          <div>
            <span className={PROFILE_LBL}>Patient</span>
            <p className={PROFILE_VAL}>{selected.name}</p>
          </div>
          <div>
            <span className={PROFILE_LBL}>Patient ID</span>
            <p className={PROFILE_VAL}>{selected.patientId}</p>
          </div>
          <div>
            <span className={PROFILE_LBL}>Age</span>
            <p className={PROFILE_VAL}>{selected.age} years</p>
          </div>
          <div>
            <span className={PROFILE_LBL}>Sex</span>
            <p className={PROFILE_VAL}>{selected.sex}</p>
          </div>
          <div>
            <span className={PROFILE_LBL}>Type</span>
            <p className={PROFILE_VAL}>{selected.type}</p>
          </div>
          <div>
            <span className={PROFILE_LBL}>Course / Dept.</span>
            <p className={PROFILE_VAL}>{selected.courseDept}</p>
          </div>
          <div>
            <span className={PROFILE_LBL}>Contact</span>
            <p className={PROFILE_VAL}>{selected.contact}</p>
          </div>
          <div>
            <span className={PROFILE_LBL}>Emergency Contact</span>
            <p className={PROFILE_VAL}>{selected.emergencyContact}</p>
          </div>
          <div>
            <span className={PROFILE_LBL}>Record No.</span>
            <p className={PROFILE_VAL}>{selected.id}</p>
          </div>
          <div>
            <span className={PROFILE_LBL}>Last Updated</span>
            <p className={PROFILE_VAL}>{formatDate(selected.lastUpdated)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <div className={`${PANEL} p-5`}>
          <h3 className={SECTION_TITLE}>Current Conditions</h3>
          {activeConditions.length > 0 ? (
            <div className="grid gap-[10px]">
              {activeConditions.map((c) => (
                <div className={MINI_CARD} key={c.id}>
                  <div className={MINI_HEADER}>
                    <strong className="text-[12px] text-primary">{c.name}</strong>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className={MINI_BODY}>
                    Diagnosed {formatDate(c.diagnosedDate)}
                    {c.notes ? ` — ${c.notes}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className={EMPTY_MINI}>No active conditions on file.</div>
          )}
        </div>

        <div className={`${PANEL} p-5`}>
          <h3 className={SECTION_TITLE}>Latest Consultation</h3>
          {latestConsult ? (
            <div className={MINI_CARD}>
              <div className={MINI_HEADER}>
                <strong className="text-[12px] text-primary">{latestConsult.reference}</strong>
                <StatusBadge status={latestConsult.status} />
              </div>
              <p className={MINI_BODY}>
                {formatDate(latestConsult.date)} at {latestConsult.time} — {latestConsult.staff}
              </p>
              <p className={MINI_BODY}>
                <strong>Complaint:</strong> {latestConsult.chiefComplaint || '—'}
              </p>
              <p className={MINI_BODY}>
                <strong>Diagnosis:</strong> {latestConsult.diagnosis || '—'}
              </p>
              <div className="mt-[10px] flex flex-wrap items-center gap-[10px] border-t border-line pt-4">
                <button type="button" className={BTN_VIEW} onClick={() => setConsultDetails(latestConsult)}>
                  View Details
                </button>
              </div>
            </div>
          ) : (
            <div className={EMPTY_MINI}>No consultations recorded yet.</div>
          )}
        </div>
      </div>
    </>
    )
  }

  const renderHistory = () => (
    <div className={`${PANEL} p-5`}>
      <h3 className={SECTION_TITLE}>Medical History</h3>
      {selected.medicalHistory.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className={TABLE}>
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
                  <td className="font-bold text-ink">{formatDate(h.date)}</td>
                  <td className="font-bold text-ink">{h.condition}</td>
                  <td className="text-muted">{h.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={EMPTY_MINI}>No previous medical history recorded.</div>
      )}
    </div>
  )

  const renderConditions = () => (
    <div className={`${PANEL} p-5`}>
      <div className="mb-[14px] flex flex-wrap items-center justify-between gap-[10px]">
        <div>
          <h3 className="m-0 mb-0.5 text-[16px] text-[#143d40]">Medical Conditions</h3>
          <p className="m-0 text-muted">Track active, inactive, and resolved conditions.</p>
        </div>
        {canEdit && (
          <button type="button" className={`${PRIMARY_BTN} min-h-[38px] text-[13px]`} onClick={() => openConditionModal(selected)} disabled={busy}>
            + Add Condition
          </button>
        )}
      </div>

      {!canEdit && <div className={AUTH_NOTICE}>⚠ You have view-only access. Only authorized medical personnel can manage conditions.</div>}

      {selected.conditions.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className={TABLE}>
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
                  <td className="font-bold text-ink">{c.name}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{formatDate(c.diagnosedDate)}</td>
                  <td className="text-muted">{c.notes || '—'}</td>
                  {canEdit && (
                    <td>
                      <div className="flex flex-wrap gap-[6px]">
                        <button type="button" className={BTN_INFO} onClick={() => openConditionModal(selected, c)} disabled={busy}>
                          Edit
                        </button>
                        <button type="button" className={c.status === 'Resolved' ? BTN_SUCCESS : BTN_INFO} onClick={() => quickToggleCondition(selected, c)} disabled={busy}>
                          {c.status === 'Resolved' ? 'Mark Active' : 'Mark Resolved'}
                        </button>
                        <button type="button" className={BTN_DANGER} onClick={() => setRemoveTarget({ kind: 'condition', record: selected, item: c })} disabled={busy}>
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
        <div className={EMPTY_MINI}>No medical conditions on file.</div>
      )}
    </div>
  )

  const renderAllergies = () => (
    <div className={`${PANEL} p-5`}>
      <div className="mb-[14px] flex flex-wrap items-center justify-between gap-[10px]">
        <div>
          <h3 className="m-0 mb-0.5 text-[16px] text-[#143d40]">Allergies</h3>
          <p className="m-0 text-muted">Known allergens with reaction and severity.</p>
        </div>
        {canEdit && (
          <button type="button" className={`${PRIMARY_BTN} min-h-[38px] text-[13px]`} onClick={() => openAllergyModal(selected)} disabled={busy}>
            + Add Allergy
          </button>
        )}
      </div>

      {!canEdit && <div className={AUTH_NOTICE}>⚠ You have view-only access. Only authorized medical personnel can manage allergies.</div>}

      {selected.allergies.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {selected.allergies.map((a) => (
            <div
              className={`rounded-lg border border-line border-l-4 bg-white p-[12px_14px] ${a.severity.toLowerCase() === 'mild' ? 'border-l-[#2fa96b]' : a.severity.toLowerCase() === 'severe' ? 'border-l-[#d95f35]' : 'border-l-[#e0a13c]'}`}
              key={a.id}
            >
              <div className="mb-[6px] flex items-center justify-between gap-2">
                <strong className="text-[14px] text-danger">⚠ {a.allergen}</strong>
                <StatusBadge status={a.severity} />
              </div>
              <p className="mb-1 m-0 text-[13px] text-ink">
                <span className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Reaction</span>
                {a.reaction || '—'}
              </p>
              <p className="m-0 text-[12px] text-muted">Recorded {formatDate(a.dateRecorded)}</p>
              {a.notes && <p className="mt-2 rounded-md bg-[#f4faf8] p-[8px_10px] text-[12px] text-muted">{a.notes}</p>}
              {canEdit && (
                <div className="mt-[10px] flex flex-wrap gap-[6px]">
                  <button type="button" className={BTN_INFO} onClick={() => openAllergyModal(selected, a)} disabled={busy}>
                    Edit
                  </button>
                  <button type="button" className={BTN_DANGER} onClick={() => setRemoveTarget({ kind: 'allergy', record: selected, item: a })} disabled={busy}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={EMPTY_MINI}>No known allergies on file.</div>
      )}
    </div>
  )

  const renderConsultations = () => (
    <div className={`${PANEL} p-5`}>
      <div className="mb-[14px] flex flex-wrap items-center justify-between gap-[10px]">
        <div>
          <h3 className="m-0 mb-0.5 text-[16px] text-[#143d40]">Consultation History</h3>
          <p className="m-0 text-muted">
            {patientConsults.length > 0
              ? `${patientConsults.length} consultation${patientConsults.length > 1 ? 's' : ''} on record (read-only view).`
              : 'No consultations on record for this patient.'}
          </p>
        </div>
      </div>

      {patientConsults.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className={TABLE}>
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
                  <td className="font-mono font-bold text-primary">{c.reference}</td>
                  <td>
                    <span className="font-bold text-ink">{formatDate(c.date)}</span>
                    <span className="block text-[12px] text-muted">{c.time}</span>
                  </td>
                  <td>{c.staff}</td>
                  <td className="text-muted">{c.chiefComplaint || '—'}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <button type="button" className={BTN_VIEW} onClick={() => setConsultDetails(c)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={EMPTY_MINI}>This patient has no consultation history yet.</div>
      )}
    </div>
  )

  const renderMedications = () => (
    <div className={`${PANEL} p-5`}>
      <h3 className={SECTION_TITLE}>Medication History</h3>
      {selected.medications.length > 0 ? (
        <div className="grid gap-[10px]">
          {selected.medications.map((m) => (
            <div className="rounded-lg border border-line bg-white p-[12px_14px]" key={m.id}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <strong className="text-[14px] text-ink">{m.name}</strong>
                  <span className="ml-[6px] font-extrabold text-primary">{m.dosage}</span>
                </div>
                <StatusBadge status={m.status} />
              </div>
              <div className="mt-[6px] flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink">
                <span>{m.frequency}</span>
                <span className="text-muted">{m.route ? `Route: ${m.route}` : ''}</span>
                <span className="text-muted">
                  {m.prescribedBy} · {formatDate(m.prescribedDate)}
                </span>
              </div>
              {m.instructions && <p className="mt-2 text-[12.5px] text-muted">{m.instructions}</p>}
              <div className="mt-[10px] flex flex-wrap items-center gap-[10px] border-t border-line pt-[10px]">
                <button type="button" className={BTN_VIEW} onClick={() => setMedDetails({ med: m, patientName: selected.name })}>
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={EMPTY_MINI}>No medications recorded for this patient.</div>
      )}
    </div>
  )

  const renderTimeline = () => (
    <div className={`${PANEL} p-5`}>
      <h3 className={SECTION_TITLE}>Medical Record Timeline</h3>
      {timeline.length > 0 ? (
        <div className="grid">
          {timeline.map((event) => (
            <div className="relative ml-[9px] border-l-2 border-[#dce8e5] p-[0_0_22px_24px] last:border-l-transparent last:pb-0" key={event.id}>
              <span className="absolute -left-2 top-0.5 size-[13px] rounded-full border-2 border-white bg-primary shadow-[0_0_0_2px_#dce8e5]" aria-hidden="true" />
              <div className="text-[11px] font-extrabold uppercase tracking-[0.03em] text-primary">{formatDate(event.date)}</div>
              <span className={`mb-[5px] mt-[3px] inline-flex rounded-full px-[9px] py-[2px] text-[10.5px] font-extrabold uppercase tracking-[0.02em] ${TIMELINE_CLASS[event.type] || TIMELINE_CLASS['Medical History']}`}>{event.type}</span>
              {event.consultation ? (
                <button type="button" className="m-0 cursor-pointer border-0 bg-transparent p-0 text-left text-[14px] font-extrabold text-primary hover:underline" onClick={() => setConsultDetails(event.consultation)}>
                  {event.title}
                </button>
              ) : (
                <h4 className="m-0 text-[14px] text-ink">{event.title}</h4>
              )}
              {event.subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{event.subtitle}</p>}
              {event.staff && <p className="mt-0.5 text-[12.5px] text-muted">{event.staff}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className={EMPTY_MINI}>No timeline events recorded yet.</div>
      )}
    </div>
  )

  const renderDetail = () => (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" className={PILL} onClick={closeRecord}>
          ← Back to Records
        </button>
        <span className="text-muted">{selected.id}</span>
      </div>

      <div className={`${PANEL} flex flex-wrap items-center gap-4 p-5`}>
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-[17px] font-extrabold text-white" aria-hidden="true">{initials(selected.name)}</span>
        <div>
          <h3 className="m-0 mb-0.5 text-[20px] text-ink">{selected.name}</h3>
          <p className="m-0 text-[12.5px] text-muted">{selected.patientId} · {selected.type} · {selected.courseDept}</p>
          <p className="m-0 text-[12.5px] text-muted">{selected.age} years old · {selected.sex} · {selected.contact}</p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-[6px]">
          <StatusBadge status={selected.status} />
          <span className="block text-[12px] text-muted">Updated {formatDate(selected.lastUpdated)}</span>
        </div>
      </div>

      {selected.allergies.length > 0 && (
        <div className="mt-[14px] flex items-center gap-2 rounded-lg border border-[#f2cfc2] bg-[#fdf1ec] p-[10px_14px] text-[12.5px] font-bold text-danger">
          <span>⚠</span>
          <span>
            Allergies on file: <strong>{selected.allergies.map((a) => a.allergen).join(', ')}</strong>
          </span>
        </div>
      )}

      <div className="my-[14px] mb-[18px] grid grid-cols-4 gap-3 max-[760px]:grid-cols-2">
        <div className="rounded-lg border border-line-strong bg-white p-[12px_14px]">
          <small className="block text-[11px] font-extrabold uppercase tracking-[0.02em] text-muted">Consultations</small>
          <strong className="mt-1 block text-[22px] leading-none text-ink">{patientConsults.length}</strong>
        </div>
        <div className="rounded-lg border border-line-strong bg-white p-[12px_14px]">
          <small className="block text-[11px] font-extrabold uppercase tracking-[0.02em] text-muted">Active Conditions</small>
          <strong className="mt-1 block text-[22px] leading-none text-ink">{activeConditions.length}</strong>
        </div>
        <div className="rounded-lg border border-line-strong bg-white p-[12px_14px]">
          <small className="block text-[11px] font-extrabold uppercase tracking-[0.02em] text-muted">Allergies</small>
          <strong className="mt-1 block text-[22px] leading-none text-ink">{selected.allergies.length}</strong>
        </div>
        <div className="rounded-lg border border-line-strong bg-white p-[12px_14px]">
          <small className="block text-[11px] font-extrabold uppercase tracking-[0.02em] text-muted">Active Medications</small>
          <strong className="mt-1 block text-[22px] leading-none text-ink">{activeMedications.length}</strong>
        </div>
      </div>

      <nav className="mt-[14px] flex gap-2 overflow-x-auto border-b-2 border-[#dce8e5] pb-px" aria-label="Record sections">
        {DETAIL_TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={`cursor-pointer whitespace-nowrap border-0 border-b-[3px] border-transparent bg-transparent px-4 py-[10px] font-bold text-muted-soft transition-all duration-200 hover:border-[#a9d1ca] hover:text-primary ${activeTab === tab.id ? 'border-primary text-primary' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-[18px] grid gap-4">
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
    <div>
      {/* Page header */}
      <section className="mb-5 flex items-center justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <p className={KICKER}>{page.eyebrow}</p>
          <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">{page.title}</h2>
          <span className="mt-[6px] block text-[13px] text-muted">{page.description}</span>
        </div>
      </section>

      {selected ? renderDetail() : renderList()}

      {/* ============ CONDITION FORM MODAL ============ */}
      {conditionModal && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Medical condition form"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setConditionModal(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{conditionModal.condition ? 'Edit Condition' : 'Add Medical Condition'}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setConditionModal(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <div className={SIDEBAR_FORM}>
                <label className={FORM_LABEL}>
                  Condition name *
                  <input
                    type="text"
                    placeholder="e.g. Hypertension"
                    className={FORM_FIELD}
                    value={conditionForm.values.name}
                    onChange={(e) => conditionForm.setValue('name', e.target.value)}
                    disabled={busy}
                  />
                </label>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Status
                    <select className={FORM_FIELD} value={conditionForm.values.status} onChange={(e) => conditionForm.setValue('status', e.target.value)} disabled={busy}>
                      {CONDITION_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className={FORM_LABEL}>
                    Date diagnosed
                    <input
                      type="date"
                      className={FORM_FIELD}
                      value={conditionForm.values.diagnosedDate}
                      onChange={(e) => conditionForm.setValue('diagnosedDate', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>
                <label className={FORM_LABEL}>
                  Notes
                  <textarea
                    placeholder="e.g. Patient advised to monitor blood pressure regularly."
                    className={`${FORM_FIELD} min-h-20 resize-y`}
                    value={conditionForm.values.notes}
                    onChange={(e) => conditionForm.setValue('notes', e.target.value)}
                    disabled={busy}
                  />
                </label>
                {conditionForm.errors.name && <p className="mt-2 text-[12px] font-bold text-danger">{conditionForm.errors.name}</p>}
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => { if (!busy) setConditionModal(null) }} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={handleSaveCondition} disabled={busy}>
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
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Allergy form"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setAllergyModal(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{allergyModal.allergy ? 'Edit Allergy' : 'Record Allergy'}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setAllergyModal(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <div className={SIDEBAR_FORM}>
                <label className={FORM_LABEL}>
                  Allergen *
                  <input
                    type="text"
                    placeholder="e.g. Penicillin"
                    className={FORM_FIELD}
                    value={allergyForm.values.allergen}
                    onChange={(e) => allergyForm.setValue('allergen', e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label className={FORM_LABEL}>
                  Reaction
                  <input
                    type="text"
                    placeholder="e.g. Skin rash"
                    className={FORM_FIELD}
                    value={allergyForm.values.reaction}
                    onChange={(e) => allergyForm.setValue('reaction', e.target.value)}
                    disabled={busy}
                  />
                </label>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Severity
                    <select className={FORM_FIELD} value={allergyForm.values.severity} onChange={(e) => allergyForm.setValue('severity', e.target.value)} disabled={busy}>
                      {ALLERGY_SEVERITIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className={FORM_LABEL}>
                    Date recorded
                    <input
                      type="date"
                      className={FORM_FIELD}
                      value={allergyForm.values.dateRecorded}
                      onChange={(e) => allergyForm.setValue('dateRecorded', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>
                <label className={FORM_LABEL}>
                  Notes
                  <textarea
                    placeholder="e.g. Avoid penicillin-based antibiotics."
                    className={`${FORM_FIELD} min-h-20 resize-y`}
                    value={allergyForm.values.notes}
                    onChange={(e) => allergyForm.setValue('notes', e.target.value)}
                    disabled={busy}
                  />
                </label>
                {allergyForm.errors.allergen && <p className="mt-2 text-[12px] font-bold text-danger">{allergyForm.errors.allergen}</p>}
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => { if (!busy) setAllergyModal(null) }} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={handleSaveAllergy} disabled={busy}>
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
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm removal"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setRemoveTarget(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{removeTarget.kind === 'condition' ? 'Remove Condition' : 'Remove Allergy'}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setRemoveTarget(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0">
                Remove <strong>{removeTarget.kind === 'condition' ? removeTarget.item.name : removeTarget.item.allergen}</strong>{' '}
                from <strong>{removeTarget.record.name}</strong>&apos;s medical record?
              </p>
              <p className="mb-0 text-muted">
                This will permanently delete the entry. This action cannot be undone.
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => { if (!busy) setRemoveTarget(null) }} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className={`${BTN_ACTION_DANGER} min-h-10 px-[14px] text-[13px]`} onClick={handleConfirmRemove} disabled={busy}>
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

    </div>
  )
}

export default MedicalRecords
