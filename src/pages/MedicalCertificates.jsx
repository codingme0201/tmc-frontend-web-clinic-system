import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMedicalCertificates } from '../hooks/useMedicalCertificates'
import { usePatients } from '../hooks/usePatients'
import { useConsultations } from '../hooks/useConsultations'
import { useStaff } from '../hooks/useStaff'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { useModal } from '../hooks/useModal'
import { usePagination } from '../hooks/usePagination'
import { useForm } from '../hooks/useForm'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/format'
import { KICKER, PANEL, TABLE, SEARCH_INPUT, SELECT_INPUT, PILL, PRIMARY_BTN, FORM_LABEL, FORM_FIELD, BTN_VIEW } from '../lib/ui'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'
import InlineSpinner from '../components/Spinner'

// Roles permitted to generate/manage certificates (mirrors Consultations).
const MEDICAL_ROLES = ['admin', 'doctor', 'nurse']
// Only staff whose role carries medical_certificates.update may void.
const VOID_ROLES = ['admin', 'doctor']

const STATUSES = ['Issued', 'Void']

const PURPOSES = [
  'Medical Excuse — Clinic Visit',
  'Fit to Return to Class',
  'Medical Clearance',
  'School Requirement — Medical Certificate',
  'Fitness for Work',
]

const MODAL_CARD = 'flex max-h-[90vh] w-[min(650px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_CARD_WIDE = MODAL_CARD + ' w-[min(820px,100%)]'
const MODAL_CARD_SM = MODAL_CARD + ' w-[min(480px,100%)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'
const FORM_ROW = 'grid grid-cols-2 gap-[10px] max-[620px]:grid-cols-1'
const FIELD_ERROR = 'text-[12px] font-bold text-danger'
const ALERT_BOX = 'rounded-lg border border-[#f2cfc2] bg-[#fdf1ec] p-[12px_14px]'

/**
 * Printable certificate sheet — used by both the details modal and (via the
 * print-area class) the browser's print output.
 */
function CertificateSheet({ certificate }) {
  return (
    <div className="mx-auto w-full max-w-[700px] rounded-md border border-[#c9d8d4] bg-white p-[26px_28px]">
      {/* Clinic letterhead */}
      <header className="border-b-2 border-[#147a70] pb-3 text-center">
        <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#147a70]">TMC University Health Services</p>
        <h3 className="m-0 mt-1 text-[22px] font-extrabold tracking-[0.08em] text-ink">MEDICAL CERTIFICATE</h3>
        <p className="m-0 mt-1 font-mono text-[11.5px] font-bold text-muted">Ref. No. {certificate.reference}</p>
      </header>

      {/* Patient block */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13.5px] max-[560px]:grid-cols-1">
        <div>
          <span className="block text-[10.5px] font-extrabold uppercase text-muted">Patient</span>
          <strong className="text-ink">{certificate.patient}</strong>
        </div>
        <div>
          <span className="block text-[10.5px] font-extrabold uppercase text-muted">Patient ID</span>
          <strong className="text-ink">{certificate.patientId || '—'}</strong>
        </div>
        <div>
          <span className="block text-[10.5px] font-extrabold uppercase text-muted">Date of Examination</span>
          <strong className="text-ink">{formatDate(certificate.issueDate)}</strong>
        </div>
        <div>
          <span className="block text-[10.5px] font-extrabold uppercase text-muted">Issued By</span>
          <strong className="text-ink">{certificate.issuedBy || '—'}</strong>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink">
        <p className="m-0">
          This is to certify that <strong>{certificate.patient}</strong> was examined at the TMC University Clinic
          on <strong>{formatDate(certificate.issueDate)}</strong> and was diagnosed with{' '}
          <strong>{certificate.diagnosis || '—'}</strong>.
        </p>
        <p className="m-0">
          <span className="font-extrabold">Purpose:</span> {certificate.purpose}
        </p>
        {certificate.recommendation && (
          <p className="m-0">
            <span className="font-extrabold">Recommendation:</span> {certificate.recommendation}
          </p>
        )}
        <p className="m-0">
          <span className="font-extrabold">Valid Until:</span>{' '}
          {certificate.validUntil ? formatDate(certificate.validUntil) : '—'}
        </p>
      </div>

      {/* Signature block */}
      <div className="mt-10 flex items-end justify-between gap-6">
        <div className="text-[12.5px] text-muted">
          <p className="m-0 font-extrabold text-ink">Issued on {formatDate(certificate.issueDate)}</p>
          <p className="m-0 mt-1">University Clinic, TMC</p>
        </div>
        <div className="text-center">
          <div className="mb-1 w-[200px] border-t border-ink/60 pt-1 text-[12.5px] font-extrabold text-ink">
            {certificate.issuedBy || 'Attending Physician'}
          </div>
          <p className="m-0 text-[10.5px] font-bold uppercase text-muted">Signature over printed name</p>
        </div>
      </div>
    </div>
  )
}

function MedicalCertificates({ page }) {
  const {
    data: certificates,
    isLoading,
    error,
    refetch,
    isRefetching,
    addCertificate,
    updateCertificate,
  } = useMedicalCertificates()
  const { data: patients } = usePatients()
  const { data: consultations } = useConsultations()
  const { data: staff } = useStaff()
  const { showToast } = useToast()
  const { userRole } = useAuth()
  const canCreate = MEDICAL_ROLES.includes(userRole)
  const canVoid = VOID_ROLES.includes(userRole)

  // Search / filter state
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [statusFilter, setStatusFilter] = useState('All')

  // Modal state
  const generateModal = useModal()
  const [details, setDetails] = useState(null) // certificate being viewed/printed
  const confirmVoid = useModal()
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  // Generate form
  const form = useForm(
    {
      patient: '',
      patientId: '',
      consultationId: '',
      purpose: '',
      diagnosis: '',
      recommendation: '',
      issueDate: todayISO(),
      validUntil: '',
      issuedBy: '',
    },
    {
      validate: (values) => {
        const errors = {}
        if (!values.patient) errors.patient = 'Select a patient'
        if (!values.purpose.trim()) errors.purpose = 'Purpose is required'
        if (values.validUntil && values.issueDate && values.validUntil < values.issueDate) {
          errors.validUntil = 'Must be on or after the issue date'
        }
        return errors
      },
    },
  )

  // Completed consultations for the currently selected patient (for prefill).
  const patientConsults = useMemo(
    () =>
      form.values.patient
        ? consultations.filter(
            (c) => c.patient === form.values.patient && c.status === 'Completed' && c.diagnosis,
          )
        : [],
    [consultations, form.values.patient],
  )

  // Status summary counts
  const counts = useMemo(() => {
    const count = (status) => certificates.filter((c) => c.status === status).length
    return { Issued: count('Issued'), Void: count('Void') }
  }, [certificates])

  // Search + filter pipeline
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return certificates
      .filter((cert) => {
        const matchStatus = statusFilter === 'All' || cert.status === statusFilter
        const matchQuery =
          !q ||
          cert.reference.toLowerCase().includes(q) ||
          cert.patient.toLowerCase().includes(q) ||
          (cert.purpose || '').toLowerCase().includes(q) ||
          (cert.diagnosis || '').toLowerCase().includes(q) ||
          (cert.issuedBy || '').toLowerCase().includes(q)
        return matchStatus && matchQuery
      })
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.id - a.id)
  }, [certificates, debouncedSearch, statusFilter])

  const pagination = usePagination(filtered)
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  useEffect(() => {
    resetPage()
  }, [debouncedSearch, statusFilter, resetPage])

  // ---------------- Generate helpers ----------------

  const openGenerate = () => {
    form.reset({
      patient: '',
      patientId: '',
      consultationId: '',
      purpose: '',
      diagnosis: '',
      recommendation: '',
      issueDate: todayISO(),
      validUntil: '',
      issuedBy: staff[0]?.name || '',
    })
    generateModal.open()
  }

  const handlePatientChange = (patientId) => {
    const patient = patients.find((p) => p.id === patientId)
    form.setValues({
      ...form.values,
      patient: patient?.name || '',
      patientId: patient?.id || '',
      consultationId: '',
      diagnosis: '',
      issueDate: todayISO(),
      validUntil: '',
    })
  }

  const handleConsultationChange = (consultationId) => {
    const consultation = patientConsults.find((c) => String(c.id) === String(consultationId))
    form.setValues({
      ...form.values,
      consultationId: consultation ? consultation.id : '',
      diagnosis: consultation?.diagnosis || '',
      issueDate: consultation?.date || form.values.issueDate,
    })
  }

  const handleGenerate = async () => {
    if (busy || busyRef.current) return
    const errors = form.runValidation()
    if (Object.keys(errors).length > 0) {
      showToast('Please complete the required fields.', 'error')
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      const created = await addCertificate({
        patient: form.values.patient,
        patientId: form.values.patientId,
        consultationId: form.values.consultationId || null,
        issuedBy: form.values.issuedBy,
        purpose: form.values.purpose.trim(),
        diagnosis: form.values.diagnosis.trim(),
        recommendation: form.values.recommendation.trim(),
        issueDate: form.values.issueDate,
        validUntil: form.values.validUntil || null,
      })
      showToast(`Medical certificate ${created.reference} generated.`)
      generateModal.close()
      setDetails(created) // show the printable preview right away
    } catch (err) {
      showToast(err?.message || 'Failed to generate the certificate.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------------- Void helpers ----------------

  const handleVoidClick = () => {
    if (!details || busy || busyRef.current) return
    confirmVoid.open()
  }

  const handleVoid = async () => {
    if (!details || busy || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await updateCertificate(details.id, { status: 'Void' })
      showToast(`Certificate ${details.reference} voided.`)
      confirmVoid.close()
      setDetails(null)
    } catch (err) {
      showToast(err?.message || 'Failed to void the certificate.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const clearFilters = () => {
    resetSearch()
    setStatusFilter('All')
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
          <button type="button" className={`${PRIMARY_BTN} px-[16px] text-[13.5px]`} onClick={openGenerate}>
            + Generate Certificate
          </button>
        )}
      </section>

      {/* Status summary chips (click to filter) */}
      <div className="mb-[18px] grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
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
            <h3 className="m-0 text-[18px] text-[#143d40]">Issued Certificates</h3>
            <p className={KICKER}>Browse and print clinic-issued medical certificates</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-[10px]">
            <input
              type="text"
              className={`${SEARCH_INPUT} min-w-[200px] flex-[1_1_220px]`}
              placeholder="Search reference, patient, purpose, or diagnosis..."
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
              <>
                <RefreshingBadge refreshing={isRefetching} />
                <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">
                  {filtered.length} of {certificates.length} certificates
                </span>
              </>
            )}
          </div>
        </div>

        {!canCreate && (
          <div className="mb-[14px] flex items-center gap-2 rounded-lg border border-dashed border-[#f2cfc2] bg-[#fdf1ec] p-[10px_14px] text-[12.5px] font-bold text-[#a33c12]">
            ⚠ You have view-only access. Only authorized medical personnel can generate certificates.
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
                  <th>Issue Date</th>
                  <th>Purpose</th>
                  <th>Diagnosis</th>
                  <th>Issued By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((cert) => (
                  <tr key={cert.id}>
                    <td className="whitespace-nowrap font-mono font-bold text-primary">{cert.reference}</td>
                    <td>
                      <strong className="font-bold text-ink">{cert.patient}</strong>
                      {cert.patientId ? <span className="block text-[12px] text-muted">{cert.patientId}</span> : null}
                    </td>
                    <td className="whitespace-nowrap font-bold text-ink">{formatDate(cert.issueDate)}</td>
                    <td className="max-w-[220px]">{cert.purpose}</td>
                    <td className="max-w-[200px]">{cert.diagnosis || '—'}</td>
                    <td className="whitespace-nowrap">{cert.issuedBy || '—'}</td>
                    <td>
                      <StatusBadge status={cert.status} />
                    </td>
                    <td>
                      <button type="button" className={BTN_VIEW} onClick={() => setDetails(cert)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8">
                      <EmptyState message="No certificates matched your search or filters." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      {/* ============ GENERATE CERTIFICATE MODAL ============ */}
      {generateModal.isOpen && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Generate medical certificate"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) generateModal.close()
          }}
        >
          <div className={MODAL_CARD_WIDE}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Generate Medical Certificate</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) generateModal.close()
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0 mb-4 text-[13px] text-muted">
                Reuses existing patient and consultation data — select a patient, then optionally a completed
                consultation to prefill the diagnosis and date.
              </p>
              <div className="grid gap-[14px]">
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    <span>Patient *</span>
                    <select
                      className={FORM_FIELD}
                      value={form.values.patientId}
                      onChange={(e) => handlePatientChange(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">— Select patient —</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.id} {p.type ? `(${p.type})` : ''}
                        </option>
                      ))}
                    </select>
                    {form.errors.patient && <span className={FIELD_ERROR}>{form.errors.patient}</span>}
                  </label>
                  <label className={FORM_LABEL}>
                    <span>Source Consultation (optional)</span>
                    <select
                      className={FORM_FIELD}
                      value={form.values.consultationId}
                      onChange={(e) => handleConsultationChange(e.target.value)}
                      disabled={busy || !form.values.patient}
                    >
                      <option value="">— No consultation —</option>
                      {patientConsults.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.reference} · {formatDate(c.date)} · {c.diagnosis}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className={FORM_LABEL}>
                  <span>Purpose *</span>
                  <input
                    type="text"
                    list="certificate-purposes"
                    className={FORM_FIELD}
                    placeholder="e.g. Medical Excuse — Clinic Visit"
                    value={form.values.purpose}
                    onChange={(e) => form.setValue('purpose', e.target.value)}
                    disabled={busy}
                  />
                  <datalist id="certificate-purposes">
                    {PURPOSES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                  {form.errors.purpose && <span className={FIELD_ERROR}>{form.errors.purpose}</span>}
                </label>

                <label className={FORM_LABEL}>
                  <span>Diagnosis / Certified Condition</span>
                  <input
                    type="text"
                    className={FORM_FIELD}
                    placeholder="e.g. Mild Flu Symptoms"
                    value={form.values.diagnosis}
                    onChange={(e) => form.setValue('diagnosis', e.target.value)}
                    disabled={busy}
                  />
                </label>

                <label className={FORM_LABEL}>
                  <span>Recommendation / Advice</span>
                  <textarea
                    className={`${FORM_FIELD} min-h-[76px] resize-y`}
                    placeholder="e.g. Excused from classes and physical activities for 24 hours..."
                    value={form.values.recommendation}
                    onChange={(e) => form.setValue('recommendation', e.target.value)}
                    disabled={busy}
                  />
                </label>

                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    <span>Issue Date</span>
                    <input
                      type="date"
                      className={FORM_FIELD}
                      value={form.values.issueDate}
                      onChange={(e) => form.setValue('issueDate', e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <label className={FORM_LABEL}>
                    <span>Valid Until (optional)</span>
                    <input
                      type="date"
                      className={FORM_FIELD}
                      value={form.values.validUntil}
                      onChange={(e) => form.setValue('validUntil', e.target.value)}
                      disabled={busy}
                    />
                    {form.errors.validUntil && <span className={FIELD_ERROR}>{form.errors.validUntil}</span>}
                  </label>
                </div>

                <label className={FORM_LABEL}>
                  <span>Issued By</span>
                  <select
                    className={FORM_FIELD}
                    value={form.values.issuedBy}
                    onChange={(e) => form.setValue('issuedBy', e.target.value)}
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
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button
                  type="button"
                  className={PILL}
                  onClick={() => {
                    if (!busy) generateModal.close()
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={handleGenerate} disabled={busy}>
                  {busy ? (
                    <>
                      <InlineSpinner /> Generating...
                    </>
                  ) : (
                    'Generate Certificate'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ CERTIFICATE DETAILS / PREVIEW MODAL ============ */}
      {details && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Certificate ${details.reference} preview`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDetails(null)
          }}
        >
          <div className={MODAL_CARD_WIDE}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Certificate Preview — {details.reference}</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) setDetails(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[12px_14px]">
                <StatusBadge status={details.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{details.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {details.patientId} · {details.purpose}
                  </span>
                </div>
              </div>
              <CertificateSheet certificate={details} />
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                {details.status === 'Issued' && canVoid && (
                  <button type="button" className={PILL} onClick={handleVoidClick} disabled={busy}>
                    Void Certificate
                  </button>
                )}
                <button
                  type="button"
                  className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`}
                  onClick={() => window.print()}
                >
                  🖨 Print Certificate
                </button>
                <button
                  type="button"
                  className={PILL}
                  onClick={() => {
                    if (!busy) setDetails(null)
                  }}
                  disabled={busy}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-only copy of the open certificate, portaled to <body> so no
          transformed ancestor (modal card / backdrop) can trap it. The app
          chrome and the modal are all visibility-hidden during print, and
          this sheet is shown alone. */}
      {details &&
        createPortal(
          <div className="print-only" aria-hidden="true">
            <CertificateSheet certificate={details} />
          </div>,
          document.body,
        )}

      {/* ============ VOID CONFIRMATION MODAL ============ */}
      {confirmVoid.isOpen && details && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm certificate voiding"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) confirmVoid.close()
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Void Certificate</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) confirmVoid.close()
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0">
                Void certificate <strong>{details.reference}</strong> for <strong>{details.patient}</strong>? It will
                remain in the list for audit purposes but can no longer be presented as valid.
              </p>
              <div className={ALERT_BOX}>
                <p className="m-0 text-[13px]">A voided certificate cannot be un-voided. Generate a new one if needed.</p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button
                  type="button"
                  className={PILL}
                  onClick={() => {
                    if (!busy) confirmVoid.close()
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="button" className="min-h-10 cursor-pointer rounded-lg bg-[#c0392b] px-[14px] text-[13px] font-extrabold text-white transition-all duration-200 hover:bg-[#a93226]" onClick={handleVoid} disabled={busy}>
                  {busy ? (
                    <>
                      <InlineSpinner /> Voiding...
                    </>
                  ) : (
                    'Confirm Void'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MedicalCertificates
