import { useCallback, useMemo, useRef, useState } from 'react'
import { usePrescriptions, usePrescriptionDetail } from '../hooks/usePrescriptions'
import { usePatients } from '../hooks/usePatients'
import { useConsultations } from '../hooks/useConsultations'
import { useStaff } from '../hooks/useStaff'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { useModal } from '../hooks/useModal'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/format'
import { KICKER, PANEL, TABLE, SEARCH_INPUT, SELECT_INPUT, PILL, PRIMARY_BTN, BTN_VIEW, BTN_INFO } from '../lib/ui'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'
import PrescriptionForm from '../components/PrescriptionForm'
import PrescriptionDetailsModal from '../components/PrescriptionDetailsModal'

const PAGE_SIZE = 8

const emptyMedication = () => ({ medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '' })

function Prescriptions({ page }) {
  const { user, can } = useAuth()
  const { data: patients } = usePatients()
  const { data: consultations } = useConsultations()
  const { data: staff } = useStaff()
  const { showToast } = useToast()

  // UI gating mirrors the backend permission catalog; the API remains the
  // security boundary.
  const canCreate = can('prescriptions.create')
  const canUpdate = can('prescriptions.update')

  // ---------- Server-side search / filters / pagination -------------------

  // Debounced search text — only the settled value triggers an API request
  // (reused `useSearch` → `useDebounce`, 300ms).
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [patientFilter, setPatientFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // Server-side pagination keeps the current page with the query params (the
  // existing `usePagination` hook slices a full list client-side — its own
  // docs describe the server-side swap as fetching each page from the API,
  // which is exactly what happens here; the shared Pagination UI is reused).
  //
  // The page belongs to the filter set it was chosen for: when the debounced
  // search, patient, or date filter changes, the effective page derives back
  // to 1 during render (React's recommended replacement for resetting state
  // in an effect), so an out-of-range page never requests stale data.
  const filterKey = `${debouncedSearch}|${patientFilter}|${dateFilter}`
  const [pageState, setPageState] = useState(() => ({ key: filterKey, page: 1 }))
  const currentPage = pageState.key === filterKey ? pageState.page : 1
  const goToPage = useCallback((next) => setPageState({ key: filterKey, page: next }), [filterKey])

  const query = useMemo(
    () => ({
      search: debouncedSearch,
      patient: patientFilter,
      date: dateFilter,
      page: currentPage,
      perPage: PAGE_SIZE,
    }),
    [debouncedSearch, patientFilter, dateFilter, currentPage],
  )

  const {
    data: prescriptions,
    total,
    isLoading,
    error,
    refetch,
    isFetching,
    addPrescription,
    updatePrescription,
  } = usePrescriptions('page', query)

  // Total pages comes from the server's pagination metadata.
  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE))

  // ---------- Modal / form state -------------------------------------------

  const formModal = useModal()
  const [editing, setEditing] = useState(null) // prescription being edited; null = create mode
  const [details, setDetails] = useState(null) // prescription being viewed
  const { data: detailData } = usePrescriptionDetail(details?.id, Boolean(details))
  const detailPrescription = detailData ?? details
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const hasFilters = debouncedSearch.trim() !== '' || patientFilter !== '' || dateFilter !== ''

  const clearFilters = () => {
    resetSearch()
    setPatientFilter('')
    setDateFilter('')
  }

  const openCreate = () => {
    setEditing(null)
    formModal.open()
  }

  const openEdit = (prescription) => {
    setEditing(prescription)
    formModal.open()
  }

  // Resource (camelCase) → form (backend field names) mapping.
  const formInitialValues = useMemo(() => {
    if (editing) {
      return {
        patient: editing.patient,
        patient_id: editing.patientId || '',
        consultation_id: editing.consultationId ?? '',
        prescribed_by: editing.prescribedBy || staff[0]?.name || user?.name || '',
        date: editing.date || todayISO(),
        medications: editing.medications?.length
          ? editing.medications.map((med) => ({
              medicine_name: med.medicineName,
              dosage: med.dosage,
              frequency: med.frequency,
              duration: med.duration,
              instructions: med.instructions,
            }))
          : [emptyMedication()],
      }
    }
    return {
      patient: '',
      patient_id: '',
      consultation_id: '',
      prescribed_by: staff[0]?.name || user?.name || '',
      date: todayISO(),
      medications: [emptyMedication()],
    }
  }, [editing, staff, user])

  // Remounts the form per open so create/edit start from fresh state.
  const formKey = formModal.isOpen ? (editing ? `edit-${editing.id}` : 'create') : 'closed'

  const handleFormSubmit = async (payload) => {
    if (busy || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      if (editing) {
        const updated = await updatePrescription(editing.id, payload)
        showToast(`Prescription ${updated.reference} updated for ${updated.patient}.`)
        formModal.close()
        if (details?.id === updated.id) setDetails(updated)
      } else {
        const created = await addPrescription(payload)
        showToast(`Prescription ${created.reference} saved for ${created.patient}.`)
        formModal.close()
        setDetails(created) // show the new record right away
      }
    } catch (err) {
      showToast(err?.message || 'Failed to save the prescription.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const medicationSummary = (rx) => {
    const first = rx.medications?.[0]
    if (!first) return '—'
    const extra = rx.medications.length - 1
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <span>
          {first.medicineName}
          {first.dosage ? ` ${first.dosage}` : ''}
        </span>
        {extra > 0 && (
          <span className="rounded-full bg-bg px-[7px] py-[2px] text-[11px] font-extrabold text-primary">
            +{extra} more
          </span>
        )}
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
        {canCreate && (
          <button type="button" className={`${PRIMARY_BTN} px-[16px] text-[13.5px]`} onClick={openCreate}>
            + New Prescription
          </button>
        )}
      </section>

      {/* List panel */}
      <div className={`${PANEL} p-5`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[18px] text-[#143d40]">Prescription Records</h3>
            <p className={KICKER}>Record and review prescribed medicines, dosages, and instructions</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-[10px]">
            <input
              type="text"
              className={`${SEARCH_INPUT} min-w-[200px] flex-[1_1_220px]`}
              placeholder="Search patient, reference, medicine, or prescriber..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={SELECT_INPUT}
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              aria-label="Filter by patient"
            >
              <option value="">All Patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.patientId || p.name}>
                  {p.name} ({p.patientId || p.id})
                </option>
              ))}
            </select>
            <input
              type="date"
              className={SELECT_INPUT}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by prescription date"
            />
            {hasFilters && (
              <button type="button" className={PILL} onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {!isLoading && !error && (
              <>
                <RefreshingBadge refreshing={isFetching && !isLoading} />
                <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">
                  {prescriptions.length} of {total} prescriptions
                </span>
              </>
            )}
          </div>
        </div>

        {!canCreate && (
          <div className="mb-[14px] flex items-center gap-2 rounded-lg border border-dashed border-[#f2cfc2] bg-[#fdf1ec] p-[10px_14px] text-[12.5px] font-bold text-[#a33c12]">
            ⚠ You have view-only access. Only authorized medical personnel can create or update prescriptions.
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-line">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : isLoading ? (
            <TableSkeleton columns={7} />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Medications</th>
                  <th>Prescribed By</th>
                  <th>Consultation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => (
                  <tr key={rx.id}>
                    <td className="whitespace-nowrap font-mono font-bold text-primary">{rx.reference}</td>
                    <td>
                      <strong className="font-bold text-ink">{rx.patient}</strong>
                      {rx.patientId ? <span className="block text-[12px] text-muted">{rx.patientId}</span> : null}
                    </td>
                    <td className="whitespace-nowrap font-bold text-ink">{formatDate(rx.date)}</td>
                    <td className="max-w-[250px]">{medicationSummary(rx)}</td>
                    <td className="whitespace-nowrap">{rx.prescribedBy || '—'}</td>
                    <td className="whitespace-nowrap font-mono text-[12.5px] font-bold text-[#0d47a1]">
                      {rx.consultation?.reference || '—'}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-[6px]">
                        <button type="button" className={BTN_VIEW} onClick={() => setDetails(rx)}>
                          View
                        </button>
                        {canUpdate && (
                          <button type="button" className={BTN_INFO} onClick={() => openEdit(rx)}>
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {prescriptions.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <EmptyState
                        message={
                          hasFilters
                            ? 'No prescriptions matched your search or filters.'
                            : 'No prescriptions have been recorded yet. Create the first one to get started.'
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

      {/* ============ CREATE / EDIT PRESCRIPTION MODAL ============ */}
      {formModal.isOpen && (
        <PrescriptionForm
          key={formKey}
          title={editing ? `Edit Prescription — ${editing.reference}` : 'New Prescription'}
          initialValues={formInitialValues}
          patients={patients}
          consultations={consultations}
          staff={staff}
          busy={busy}
          submitLabel={editing ? 'Save Changes' : 'Save Prescription'}
          onSubmit={handleFormSubmit}
          onInvalid={() => showToast('Please complete the required fields.', 'error')}
          onClose={() => {
            if (!busy) formModal.close()
          }}
        />
      )}

      {/* ============ PRESCRIPTION DETAILS MODAL ============ */}
      {details && (
        <PrescriptionDetailsModal
          prescription={detailPrescription}
          canUpdate={canUpdate}
          onEdit={() => openEdit(details)}
          onClose={() => setDetails(null)}
        />
      )}
    </div>
  )
}

export default Prescriptions
