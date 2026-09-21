import { useEffect, useMemo, useRef, useState } from 'react'
import { usePatients, usePatientProfile, usePatientMedicalInfo, usePatientRecordHistory, useUpdatePatientStatus } from '../hooks/usePatients'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { formatDate, formatPhone } from '../lib/format'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
  BTN_INFO, BTN_SUCCESS, BTN_DANGER, BTN_VIEW,
  FORM_LABEL, FORM_FIELD, FORM_ROW,
} from '../lib/ui'
import InlineSpinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'

const MODAL_CARD = 'flex max-h-[90vh] w-[min(700px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_CARD_SM = 'flex max-h-[90vh] w-[min(440px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'
const PROFILE_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4'
const PROFILE_LBL = 'mb-0.5 block text-[11px] font-extrabold uppercase text-muted'
const PROFILE_VAL = 'm-0 text-[14px] font-bold text-ink'
const ALERT_BOX = 'rounded-lg border border-[#cfe5df] bg-[#f4faf8] p-[12px_14px]'
const TAB_BTN = 'cursor-pointer border-0 bg-transparent px-4 py-2 text-[13px] font-extrabold transition-all duration-200 border-b-2 border-transparent text-muted hover:text-ink'
const TAB_BTN_ACTIVE = TAB_BTN + ' border-primary text-primary'
const HISTORY_ROW = 'flex items-start gap-3 rounded-lg border border-line bg-white p-[14px] transition-all duration-200 hover:border-primary/40'
const HISTORY_DOT = 'mt-1 flex size-[10px] shrink-0 items-center justify-center rounded-full'
const TYPE_COLORS = {
  Appointment: 'bg-[#e3f2fd] text-[#1565c0]',
  Consultation: 'bg-[#e8f5e9] text-[#2e7d32]',
  'Medical Record': 'bg-[#f3e5f5] text-[#7b1fa2]',
  'Medical Certificate': 'bg-[#fff3e0] text-[#ef6c00]',
  Prescription: 'bg-[#fce4ec] text-[#c62828]',
}

function Patients({ page }) {
  const {
    data: patients,
    isLoading,
    error,
    refetch,
    isRefetching,
    addPatient,
  } = usePatients()
  const updateStatus = useUpdatePatientStatus()
  const { showToast } = useToast()

  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [statusFilter, setStatusFilter] = useState('All')

  const [selectedId, setSelectedId] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [activateTarget, setActivateTarget] = useState(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [newPatient, setNewPatient] = useState({
    id: '',
    name: '',
    type: 'Student',
    courseDept: '',
    contact: '',
    emergencyContact: '',
    allergies: '',
    history: '',
  })
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return patients
      .filter((p) => {
        const matchQuery =
          !q ||
          (p.patientId && p.patientId.toLowerCase().includes(q)) ||
          p.name.toLowerCase().includes(q) ||
          (p.courseDept && p.courseDept.toLowerCase().includes(q)) ||
          (p.type && p.type.toLowerCase().includes(q))
        const matchStatus = statusFilter === 'All' || p.status === statusFilter
        return matchQuery && matchStatus
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [patients, debouncedSearch, statusFilter])

  const pagination = usePagination(filtered, { pageSize: 8 })
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  useEffect(() => {
    resetPage()
  }, [debouncedSearch, statusFilter, resetPage])

  const activeCount = patients.filter((p) => p.status === 'Active').length
  const inactiveCount = patients.filter((p) => p.status === 'Inactive').length

  const handleDeactivate = async () => {
    if (!deactivateTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await updateStatus(deactivateTarget.id, 'Inactive')
      showToast(`"${deactivateTarget.name}" has been deactivated.`)
      setDeactivateTarget(null)
      if (selectedId === deactivateTarget.id) setSelectedId(null)
    } catch (err) {
      showToast(err?.message || 'Failed to deactivate patient.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleActivate = async () => {
    if (!activateTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await updateStatus(activateTarget.id, 'Active')
      showToast(`"${activateTarget.name}" has been activated.`)
      setActivateTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to activate patient.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleRegisterPatient = async (e) => {
    e.preventDefault()
    if (!newPatient.name.trim() || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await addPatient({
        id: newPatient.id.trim(),
        name: newPatient.name.trim(),
        type: newPatient.type,
        courseDept: newPatient.courseDept.trim(),
        contact: newPatient.contact.trim(),
        emergencyContact: newPatient.emergencyContact.trim(),
        allergies: newPatient.allergies.trim() || 'None',
        history: newPatient.history.trim() || 'None',
      })
      showToast(`Patient profile created for ${newPatient.name}.`)
      setRegisterOpen(false)
      setNewPatient({
        id: '',
        name: '',
        type: 'Student',
        courseDept: '',
        contact: '',
        emergencyContact: '',
        allergies: '',
        history: '',
      })
    } catch (err) {
      showToast(err?.message || 'Failed to create patient profile.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <div>
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
        <div className="w-full sm:w-auto">
          <button
            type="button"
            className={`${PRIMARY_BTN} w-full sm:w-auto`}
            onClick={() => setRegisterOpen(true)}
          >
            + Register Patient
          </button>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-3 gap-2.5 sm:gap-3">
        {[
          { label: 'All Patients', count: patients.length, value: 'All', dot: 'bg-primary' },
          { label: 'Active', count: activeCount, value: 'Active', dot: 'bg-success' },
          { label: 'Inactive', count: inactiveCount, value: 'Inactive', dot: 'bg-muted' },
        ].map((chip) => (
          <button
            type="button"
            key={chip.value}
            className={`group flex cursor-pointer flex-col justify-between gap-1.5 rounded-2xl border bg-white p-3 sm:p-4 text-left shadow-[0_4px_20px_rgba(18,57,59,0.05)] transition-all duration-150 hover:border-primary/50 hover:shadow-xs active:scale-[0.98] ${
              statusFilter === chip.value
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-line-strong/80'
            }`}
            onClick={() => setStatusFilter(chip.value)}
          >
            <div className="flex items-center justify-between gap-1">
              <small className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted truncate">
                {chip.label}
              </small>
              <span className={`size-2 rounded-full ${chip.dot}`} />
            </div>
            <strong className="text-[22px] sm:text-[26px] font-extrabold leading-none text-ink tracking-tight">
              {chip.count}
            </strong>
          </button>
        ))}
      </div>

      <div className={`${PANEL} p-4 sm:p-5`}>
        <div className="mb-4 sm:mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[17px] sm:text-[18px] font-bold text-[#143d40]">Patient Registry</h3>
            <p className={KICKER}>View and manage registered student, faculty, and staff patients</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
            <input
              type="text"
              placeholder="Search by ID, name, type, or course..."
              className={`${SEARCH_INPUT} w-full sm:w-auto sm:min-w-[200px] sm:flex-[1_1_220px]`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {(search || statusFilter !== 'All') && (
              <button type="button" className={PILL} onClick={() => { resetSearch(); setStatusFilter('All') }}>
                Clear filters
              </button>
            )}
            {!isLoading && !error && (
              <div className="flex items-center gap-2 sm:ml-auto">
                <RefreshingBadge refreshing={isRefetching} />
                <span className="whitespace-nowrap text-[12px] font-bold text-muted">
                  {filtered.length} of {patients.length} patients
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line-strong/80 shadow-2xs">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : isLoading ? (
            <TableSkeleton columns={7} />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Course / Department</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((patient) => (
                  <tr key={patient.id}>
                    <td className="font-mono font-bold text-primary">{patient.patientId}</td>
                    <td>
                      <strong className="font-bold text-ink">{patient.name}</strong>
                    </td>
                    <td>{patient.type}</td>
                    <td className="text-[12.5px] text-muted">{patient.courseDept || '—'}</td>
                    <td className="text-[12.5px] text-muted">{patient.contact || '—'}</td>
                    <td>
                      <StatusBadge status={patient.status} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-[6px]">
                        <a
                          href={`/#/consultations?patientId=${patient.patientId}`}
                          className={BTN_INFO}
                        >
                          Consult
                        </a>
                        <button type="button" className={BTN_VIEW} onClick={() => { setSelectedId(patient.id); setActiveTab('profile') }}>
                          View
                        </button>
                        {patient.status === 'Active' ? (
                          <button type="button" className={BTN_DANGER} onClick={() => setDeactivateTarget(patient)}>
                            Deactivate
                          </button>
                        ) : (
                          <button type="button" className={BTN_SUCCESS} onClick={() => setActivateTarget(patient)}>
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <EmptyState
                        message={
                          search || statusFilter !== 'All'
                            ? 'No patients match the current filters.'
                            : 'No patients registered yet.'
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      {selectedId && (
        <PatientProfileModal
          patientId={selectedId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => setSelectedId(null)}
          onDeactivate={(p) => setDeactivateTarget(p)}
          onActivate={(p) => setActivateTarget(p)}
        />
      )}

      {deactivateTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Deactivate patient"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setDeactivateTarget(null) }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Deactivate Patient</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setDeactivateTarget(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <p className="m-0 text-[14px] text-ink">
                Are you sure you want to deactivate <strong>{deactivateTarget.name}</strong> ({deactivateTarget.patientId})?
              </p>
              <p className="m-0 mt-2 text-[13px] text-muted">
                This patient will no longer appear in active patient lists until reactivated.
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setDeactivateTarget(null)} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className={`${BTN_DANGER} min-h-10 px-[14px] text-[13px]`} onClick={handleDeactivate} disabled={busy}>
                  {busy && <InlineSpinner />}
                  {busy ? 'Deactivating...' : 'Confirm Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activateTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Activate patient"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setActivateTarget(null) }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Activate Patient</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setActivateTarget(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <p className="m-0 text-[14px] text-ink">
                Are you sure you want to activate <strong>{activateTarget.name}</strong> ({activateTarget.patientId})?
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setActivateTarget(null)} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className={`${BTN_SUCCESS} min-h-10 px-[14px] text-[13px]`} onClick={handleActivate} disabled={busy}>
                  {busy && <InlineSpinner />}
                  {busy ? 'Activating...' : 'Confirm Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Patient Modal */}
      {registerOpen && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Register patient"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setRegisterOpen(false) }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <div>
                <span className={KICKER}>Patient Registry</span>
                <h3 className="m-0 text-[18px] font-bold text-ink">Register New Patient</h3>
              </div>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => { if (!busy) setRegisterOpen(false) }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRegisterPatient} className="flex flex-col flex-1 overflow-hidden">
              <div className={`${MODAL_BODY} flex flex-col gap-3.5`}>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    <span>Patient / Student ID</span>
                    <input
                      type="text"
                      className={FORM_FIELD}
                      placeholder="e.g. 2024-00123 (Optional)"
                      value={newPatient.id}
                      onChange={(e) => setNewPatient({ ...newPatient, id: e.target.value })}
                    />
                  </label>
                  <label className={FORM_LABEL}>
                    <span>Patient Type <span className="text-danger">*</span></span>
                    <select
                      className={SELECT_INPUT}
                      value={newPatient.type}
                      onChange={(e) => setNewPatient({ ...newPatient, type: e.target.value })}
                    >
                      <option value="Student">Student</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Staff">Staff</option>
                      <option value="Visitor">Visitor</option>
                    </select>
                  </label>
                </div>

                <label className={FORM_LABEL}>
                  <span>Full Name <span className="text-danger">*</span></span>
                  <input
                    type="text"
                    className={FORM_FIELD}
                    placeholder="e.g. Maria Santos"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    required
                  />
                </label>

                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    <span>Course / Department</span>
                    <input
                      type="text"
                      className={FORM_FIELD}
                      placeholder="e.g. BS Information Technology"
                      value={newPatient.courseDept}
                      onChange={(e) => setNewPatient({ ...newPatient, courseDept: e.target.value })}
                    />
                  </label>
                  <label className={FORM_LABEL}>
                    <span>Contact Number</span>
                      <input
                        type="tel"
                        className={FORM_FIELD}
                        placeholder="0917-123-4567"
                        value={newPatient.contact}
                        onChange={(e) => setNewPatient({ ...newPatient, contact: formatPhone(e.target.value) })}
                        maxLength={13}
                      />
                  </label>
                </div>

                <label className={FORM_LABEL}>
                  <span>Emergency Contact</span>
                  <input
                    type="text"
                    className={FORM_FIELD}
                    placeholder="e.g. Parent / Guardian: 0918-765-4321"
                    value={newPatient.emergencyContact}
                    onChange={(e) => setNewPatient({ ...newPatient, emergencyContact: e.target.value })}
                  />
                </label>

                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    <span>Known Allergies</span>
                    <input
                      type="text"
                      className={FORM_FIELD}
                      placeholder="e.g. Penicillin, Peanuts (or None)"
                      value={newPatient.allergies}
                      onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                    />
                  </label>
                  <label className={FORM_LABEL}>
                    <span>Medical History / Notes</span>
                    <input
                      type="text"
                      className={FORM_FIELD}
                      placeholder="e.g. Asthma, Hypertension (or None)"
                      value={newPatient.history}
                      onChange={(e) => setNewPatient({ ...newPatient, history: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className={MODAL_FOOTER}>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button
                    type="button"
                    className={PILL}
                    onClick={() => setRegisterOpen(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={PRIMARY_BTN}
                    disabled={busy || !newPatient.name.trim()}
                  >
                    {busy && <InlineSpinner />}
                    {busy ? 'Registering...' : 'Register Patient'}
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

function PatientProfileModal({ patientId, activeTab, setActiveTab, onClose, onDeactivate, onActivate }) {
  const { data: patient, isLoading: profileLoading, error: profileError } = usePatientProfile(patientId)
  const { data: medicalInfo, isLoading: medicalLoading } = usePatientMedicalInfo(patientId)
  const { data: history, isLoading: historyLoading } = usePatientRecordHistory(patientId)

  return (
    <div
      className={MODAL_BACKDROP}
      role="dialog"
      aria-modal="true"
      aria-label="Patient profile"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={MODAL_CARD}>
        <div className={MODAL_HEADER}>
          <h3 className="m-0 text-[18px] text-ink">
            {profileLoading ? 'Loading...' : patient ? `Patient Profile — ${patient.name}` : 'Patient Profile'}
          </h3>
          <button type="button" className={MODAL_CLOSE} onClick={onClose}>✕</button>
        </div>

        <div className="flex border-b border-line px-5">
          {[
            { key: 'profile', label: 'Profile' },
            { key: 'medical', label: 'Medical Information' },
            { key: 'history', label: 'Record History' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? TAB_BTN_ACTIVE : TAB_BTN}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={MODAL_BODY}>
          {profileLoading ? (
            <div className="flex items-center justify-center py-10">
              <InlineSpinner />
            </div>
          ) : profileError ? (
            <ErrorState message={profileError} />
          ) : !patient ? (
            <EmptyState message="Patient not found." />
          ) : activeTab === 'profile' ? (
            <ProfileTab patient={patient} />
          ) : activeTab === 'medical' ? (
            <MedicalInfoTab medicalInfo={medicalInfo} isLoading={medicalLoading} />
          ) : (
            <RecordHistoryTab history={history} isLoading={historyLoading} />
          )}
        </div>

        <div className={MODAL_FOOTER}>
          <div className={MODAL_FOOTER_ACTIONS}>
            {patient && patient.status === 'Active' ? (
              <button type="button" className={BTN_DANGER} onClick={() => { onDeactivate(patient); onClose() }}>
                Deactivate
              </button>
            ) : patient && patient.status === 'Inactive' ? (
              <button type="button" className={BTN_SUCCESS} onClick={() => { onActivate(patient); onClose() }}>
                Activate
              </button>
            ) : null}
            {patient && patient.status === 'Active' && (
              <a
                href={`/#/consultations?patientId=${patient.patientId}`}
                className={BTN_INFO}
                onClick={onClose}
              >
                Start Consultation
              </a>
            )}
            <button type="button" className={PILL} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileTab({ patient }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
        <StatusBadge status={patient.status} />
        <div>
          <strong className="block text-[15px] text-ink">{patient.name}</strong>
          <span className="block text-[12px] text-muted">{patient.patientId} · {patient.type}</span>
        </div>
      </div>

      <h4 className="m-0 mb-3 text-[13px] font-extrabold uppercase text-muted">Personal Information</h4>
      <div className={PROFILE_GRID}>
        <div>
          <span className={PROFILE_LBL}>Patient ID</span>
          <p className={PROFILE_VAL}>{patient.patientId}</p>
        </div>
        <div>
          <span className={PROFILE_LBL}>Full Name</span>
          <p className={PROFILE_VAL}>{patient.name}</p>
        </div>
        <div>
          <span className={PROFILE_LBL}>Type</span>
          <p className={PROFILE_VAL}>{patient.type}</p>
        </div>
        <div>
          <span className={PROFILE_LBL}>Course / Department</span>
          <p className={PROFILE_VAL}>{patient.courseDept || '—'}</p>
        </div>
        <div>
          <span className={PROFILE_LBL}>Contact</span>
          <p className={PROFILE_VAL}>{patient.contact || '—'}</p>
        </div>
        <div>
          <span className={PROFILE_LBL}>Status</span>
          <p className={PROFILE_VAL}>{patient.status}</p>
        </div>
      </div>

      <h4 className="m-0 mb-3 mt-5 text-[13px] font-extrabold uppercase text-muted">Emergency Contact</h4>
      <div className={ALERT_BOX}>
        <p className="m-0 text-[13px]">{patient.emergencyContact || 'No emergency contact on file.'}</p>
      </div>

      <h4 className="m-0 mb-3 mt-5 text-[13px] font-extrabold uppercase text-muted">Allergies</h4>
      <div className={ALERT_BOX}>
        <p className="m-0 text-[13px]">{patient.allergies || 'None'}</p>
      </div>

      <h4 className="m-0 mb-3 mt-5 text-[13px] font-extrabold uppercase text-muted">Medical History</h4>
      <div className={ALERT_BOX}>
        <p className="m-0 text-[13px]">{patient.history || 'None'}</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Appointments', count: patient.appointmentsCount ?? 0 },
          { label: 'Consultations', count: patient.consultationsCount ?? 0 },
          { label: 'Prescriptions', count: patient.prescriptionsCount ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-line bg-white p-3 text-center">
            <strong className="block text-[22px] text-ink">{stat.count}</strong>
            <span className="text-[11px] font-extrabold uppercase text-muted">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MedicalInfoTab({ medicalInfo, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <InlineSpinner />
      </div>
    )
  }

  if (!medicalInfo) {
    return <EmptyState message="No medical record found for this patient." />
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
        <StatusBadge status={medicalInfo.status} />
        <div>
          <strong className="block text-[15px] text-ink">Medical Record</strong>
          <span className="block text-[12px] text-muted">Last updated: {formatDate(medicalInfo.lastUpdated)}</span>
        </div>
      </div>

      <div className={PROFILE_GRID}>
        <div>
          <span className={PROFILE_LBL}>Name</span>
          <p className={PROFILE_VAL}>{medicalInfo.name}</p>
        </div>
        <div>
          <span className={PROFILE_LBL}>Age</span>
          <p className={PROFILE_VAL}>{medicalInfo.age || '—'}</p>
        </div>
        <div>
          <span className={PROFILE_LBL}>Sex</span>
          <p className={PROFILE_VAL}>{medicalInfo.sex || '—'}</p>
        </div>
      </div>

      {medicalInfo.conditions && medicalInfo.conditions.length > 0 && (
        <>
          <h4 className="m-0 mb-3 mt-5 text-[13px] font-extrabold uppercase text-muted">Conditions</h4>
          <div className="flex flex-col gap-2">
            {medicalInfo.conditions.map((c) => (
              <div key={c.id} className="flex items-start justify-between rounded-lg border border-line p-[12px_14px]">
                <div>
                  <strong className="block text-[13px] text-ink">{c.name}</strong>
                  <span className="block text-[12px] text-muted">
                    {c.diagnosedDate ? `Diagnosed: ${formatDate(c.diagnosedDate)}` : ''}
                    {c.notes ? ` · ${c.notes}` : ''}
                  </span>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </>
      )}

      {medicalInfo.allergies && medicalInfo.allergies.length > 0 && (
        <>
          <h4 className="m-0 mb-3 mt-5 text-[13px] font-extrabold uppercase text-muted">Allergies</h4>
          <div className="flex flex-col gap-2">
            {medicalInfo.allergies.map((a) => (
              <div key={a.id} className="flex items-start justify-between rounded-lg border border-line p-[12px_14px]">
                <div>
                  <strong className="block text-[13px] text-ink">{a.allergen}</strong>
                  <span className="block text-[12px] text-muted">
                    {a.reaction ? `Reaction: ${a.reaction}` : ''}
                    {a.severity ? ` · Severity: ${a.severity}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {medicalInfo.medications && medicalInfo.medications.length > 0 && (
        <>
          <h4 className="m-0 mb-3 mt-5 text-[13px] font-extrabold uppercase text-muted">Medications</h4>
          <div className="flex flex-col gap-2">
            {medicalInfo.medications.map((m) => (
              <div key={m.id} className="flex items-start justify-between rounded-lg border border-line p-[12px_14px]">
                <div>
                  <strong className="block text-[13px] text-ink">{m.name}</strong>
                  <span className="block text-[12px] text-muted">
                    {m.dosage ? `${m.dosage}` : ''}
                    {m.frequency ? ` · ${m.frequency}` : ''}
                    {m.prescribedBy ? ` · Prescribed by ${m.prescribedBy}` : ''}
                  </span>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        </>
      )}

      {medicalInfo.medicalHistory && medicalInfo.medicalHistory.length > 0 && (
        <>
          <h4 className="m-0 mb-3 mt-5 text-[13px] font-extrabold uppercase text-muted">Medical History</h4>
          <div className="flex flex-col gap-2">
            {medicalInfo.medicalHistory.map((h) => (
              <div key={h.id} className="rounded-lg border border-line p-[12px_14px]">
                <strong className="block text-[13px] text-ink">{h.condition}</strong>
                <span className="block text-[12px] text-muted">
                  {h.date ? formatDate(h.date) : ''}
                  {h.notes ? ` · ${h.notes}` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RecordHistoryTab({ history, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <InlineSpinner />
      </div>
    )
  }

  if (!history || history.length === 0) {
    return <EmptyState message="No record history found for this patient." />
  }

  return (
    <div className="flex flex-col gap-3">
      {history.map((record, idx) => (
        <div key={`${record.reference}-${idx}`} className={HISTORY_ROW}>
          <div className={`${HISTORY_DOT} ${TYPE_COLORS[record.type] || 'bg-[#eef2f1] text-[#4d615e]'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex rounded-[4px] bg-bg px-2 py-[2px] text-[11px] font-bold text-muted-soft">
                {record.type}
              </span>
              <span className="font-mono text-[12px] font-bold text-primary">{record.reference}</span>
              <StatusBadge status={record.status} />
            </div>
            <strong className="mt-1 block text-[13px] text-ink">{record.title}</strong>
            {record.summary && (
              <span className="block text-[12px] text-muted">{record.summary}</span>
            )}
            {record.extra && (
              <span className="block text-[11px] text-muted-soft">{record.extra}</span>
            )}
          </div>
          <span className="shrink-0 text-[12px] font-bold text-muted">{formatDate(record.date)}</span>
        </div>
      ))}
    </div>
  )
}

export default Patients
