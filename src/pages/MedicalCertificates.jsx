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
import { KICKER, PANEL, TABLE, SEARCH_INPUT, SELECT_INPUT, PILL, PRIMARY_BTN, FORM_LABEL, FORM_FIELD, BTN_VIEW, BTN_SUCCESS, BTN_DANGER } from '../lib/ui'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import StudentSelect from '../components/StudentSelect'
import { EmptyState, ErrorState } from '../components/AsyncState'
import InlineSpinner from '../components/Spinner'

// Roles permitted to submit certificate requests (mirrors Consultations).
const MEDICAL_ROLES = ['admin', 'doctor', 'nurse']

// Certificate lifecycle — a request moves through review, then issue.
const STATUSES = ['Pending', 'Approved', 'Issued', 'Rejected', 'Void']

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
const INFO_BOX = 'rounded-lg border border-[#cfe5df] bg-[#f4faf8] p-[12px_14px]'
const PROFILE_LBL = 'mb-0.5 block text-[11px] font-extrabold uppercase text-muted'
const PROFILE_VAL = 'm-0 text-[14px] font-bold text-ink'

/**
 * Printable certificate sheet — used by the details modal (via the print-area
 * class) so the browser prints only the certificate, and rendered as a draft
 * preview while the request is still pending/approved.
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
    approveCertificate,
    rejectCertificate,
    issueCertificate,
  } = useMedicalCertificates()
  const { data: patients } = usePatients()
  const { data: consultations } = useConsultations()
  const { data: staff } = useStaff()
  const { showToast } = useToast()
  const { user, userRole, can } = useAuth()
  // UI gating mirrors the backend permission catalog; the API remains the
  // security boundary.
  const canCreate = MEDICAL_ROLES.includes(userRole)
  const canApprove = can('medical_certificates.approve')
  const canUpdate = can('medical_certificates.update') // issue + void

  // Search / filter state
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [statusFilter, setStatusFilter] = useState('All')

  // Modal state
  const requestModal = useModal()
  const [details, setDetails] = useState(null) // certificate being viewed/printed
  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [issueTarget, setIssueTarget] = useState(null)
  const confirmVoid = useModal()
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  // Request form (submits a Pending certificate request)
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
        if (!values.consultationId) errors.consultationId = 'A completed consultation is required'
        if (!values.purpose.trim()) errors.purpose = 'Purpose is required'
        if (values.validUntil && values.issueDate && values.validUntil < values.issueDate) {
          errors.validUntil = 'Must be on or after the issue date'
        }
        return errors
      },
    },
  )

  // Issue form (finalizes issuer/date at issue time)
  const issueForm = useForm(
    {
      issuedBy: '',
      issueDate: todayISO(),
    },
    {
      validate: (values) => {
        const errors = {}
        if (!values.issuedBy.trim()) errors.issuedBy = 'Issuing clinician is required'
        if (!values.issueDate) errors.issueDate = 'Issue date is required'
        return errors
      },
    },
  )

  // Completed consultations for the currently selected patient (for prefill and requirement).
  const patientConsults = useMemo(
    () =>
      form.values.patient
        ? consultations.filter(
            (c) =>
              (c.patient === form.values.patient ||
                (form.values.patientId && c.patientId === form.values.patientId)) &&
              c.status === 'Completed',
          )
        : [],
    [consultations, form.values.patient, form.values.patientId],
  )

  // Status summary counts
  const counts = useMemo(() => {
    const count = (status) => certificates.filter((c) => c.status === status).length
    return {
      Pending: count('Pending'),
      Approved: count('Approved'),
      Issued: count('Issued'),
      Rejected: count('Rejected'),
      Void: count('Void'),
    }
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

  // ---------------- Request helpers ----------------

  const openRequest = () => {
    form.reset({
      patient: '',
      patientDbId: '',
      patientId: '',
      consultationId: '',
      purpose: '',
      diagnosis: '',
      recommendation: '',
      issueDate: todayISO(),
      validUntil: '',
      issuedBy: staff[0]?.name || '',
    })
    requestModal.open()
  }

  const handlePatientChange = (patientDbId) => {
    const patient = patients.find(
      (p) => String(p.id) === String(patientDbId) || p.patientId === patientDbId
    )
    const patConsults = patient
      ? consultations.filter(
          (c) =>
            (c.patient === patient.name || (patient.patientId && c.patientId === patient.patientId)) &&
            c.status === 'Completed',
        )
      : []
    const latest = patConsults[0] || null
    form.setValues({
      ...form.values,
      patient: patient?.name || '',
      patientDbId: patient ? String(patient.id) : '',
      patientId: patient?.patientId || (patient ? String(patient.id) : ''),
      consultationId: latest ? latest.id : '',
      diagnosis: latest?.diagnosis || latest?.chiefComplaint || '',
      issueDate: latest?.date || todayISO(),
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

  const handleSubmitRequest = async () => {
    if (busy || busyRef.current) return
    const errors = form.runValidation()
    if (Object.keys(errors).length > 0) {
      showToast('Please complete the required fields.', 'error')
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      const patientObj = patients.find(
        (p) =>
          String(p.id) === String(form.values.patientDbId) ||
          p.patientId === form.values.patientId ||
          p.name === form.values.patient
      )
      const patientIdVal = patientObj?.patientId || form.values.patientId || form.values.patientDbId
      const created = await addCertificate({
        patient: form.values.patient,
        patient_id: patientIdVal,
        patientId: patientIdVal,
        consultation_id: form.values.consultationId || null,
        consultationId: form.values.consultationId || null,
        issued_by: form.values.issuedBy,
        issuedBy: form.values.issuedBy,
        purpose: form.values.purpose.trim(),
        diagnosis: form.values.diagnosis.trim(),
        recommendation: form.values.recommendation.trim(),
        issue_date: form.values.issueDate,
        issueDate: form.values.issueDate,
        valid_until: form.values.validUntil || null,
        validUntil: form.values.validUntil || null,
      })
      showToast(`Certificate request ${created.reference} submitted for review.`)
      requestModal.close()
      setDetails(created) // show the request summary right away
    } catch (err) {
      showToast(err?.message || 'Failed to submit the certificate request.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------------- Review helpers (approve / reject) ----------------

  const handleApprove = async () => {
    if (!approveTarget || busy || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const updated = await approveCertificate(approveTarget.id)
      showToast(`Request ${updated.reference} approved.`)
      setApproveTarget(null)
      if (details?.id === updated.id) setDetails(updated)
    } catch (err) {
      showToast(err?.message || 'Failed to approve the request.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || busy || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const updated = await rejectCertificate(rejectTarget.id, rejectReason.trim())
      showToast(`Request ${updated.reference} rejected.`)
      setRejectTarget(null)
      if (details?.id === updated.id) setDetails(updated)
    } catch (err) {
      showToast(err?.message || 'Failed to reject the request.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------------- Issue helpers ----------------

  const openIssue = (cert) => {
    issueForm.reset({
      issuedBy: user?.name || cert.issuedBy || staff[0]?.name || '',
      issueDate: cert.issueDate || todayISO(),
    })
    setIssueTarget(cert)
  }

  const handleIssue = async () => {
    if (!issueTarget || busy || busyRef.current) return
    const errors = issueForm.runValidation()
    if (Object.keys(errors).length > 0) {
      showToast('Please complete the required fields.', 'error')
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      const updated = await issueCertificate(issueTarget.id, {
        issued_by: issueForm.values.issuedBy.trim(),
        issue_date: issueForm.values.issueDate,
      })
      showToast(`Certificate ${updated.reference} issued.`)
      setIssueTarget(null)
      if (details?.id === updated.id) setDetails(updated)
    } catch (err) {
      showToast(err?.message || 'Failed to issue the certificate.', 'error')
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

  // Contextual quick actions per status (table rows)
  const actionButtons = (cert) => {
    const buttons = []
    const add = (label, className, onClick) => {
      buttons.push(
        <button key={label} type="button" className={className} onClick={onClick}>
          {label}
        </button>,
      )
    }
    if (cert.status === 'Pending' && canApprove) {
      add('Approve', BTN_SUCCESS, () => setApproveTarget(cert))
      add('Reject', BTN_DANGER, () => {
        setRejectTarget(cert)
        setRejectReason('')
      })
    } else if (cert.status === 'Approved' && canUpdate) {
      add('Issue', BTN_SUCCESS, () => openIssue(cert))
    }
    return buttons
  }

  const clearFilters = () => {
    resetSearch()
    setStatusFilter('All')
  }

  const isIssued = details?.status === 'Issued'

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
          <button type="button" className={`${PRIMARY_BTN} px-[16px] text-[13.5px]`} onClick={openRequest}>
            + Request Certificate
          </button>
        )}
      </section>

      {/* Status summary chips (click to filter) */}
      <div className="mb-[18px] grid grid-cols-5 gap-3 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
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
            <h3 className="m-0 text-[18px] text-[#143d40]">Certificate Requests & Records</h3>
            <p className={KICKER}>Review, approve, and issue medical certificate requests</p>
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
            ⚠ You have view-only access. Only authorized medical personnel can submit certificate requests.
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
                      <div className="flex flex-wrap gap-[6px]">
                        <button type="button" className={BTN_VIEW} onClick={() => setDetails(cert)}>
                          View
                        </button>
                        {actionButtons(cert)}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8">
                      <EmptyState message="No certificate requests matched your search or filters." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      {/* ============ REQUEST CERTIFICATE MODAL ============ */}
      {requestModal.isOpen && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Request medical certificate"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) requestModal.close()
          }}
        >
          <div className={MODAL_CARD_WIDE}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Request Medical Certificate</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) requestModal.close()
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className={`${INFO_BOX} mb-4`}>
                <p className="m-0 text-[13px]">
                  Submits a certificate <strong>request</strong> for review. A physician must approve the request before
                  the certificate can be issued — requests stay <strong>Pending</strong> until then.
                </p>
              </div>
              <p className="mt-0 mb-4 text-[13px] text-muted">
                Reuses existing patient and consultation data — select a patient, then optionally a completed
                consultation to prefill the diagnosis and date.
              </p>
              <div className="grid gap-[14px]">
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    <span>Student / Patient *</span>
                    <StudentSelect
                      value={form.values.patientDbId || form.values.patientId}
                      onChange={(val) => handlePatientChange(val)}
                      patients={patients}
                      disabled={busy}
                      placeholder="Type student name or ID (e.g. 24-012345)..."
                    />
                    {form.errors.patient && <span className={FIELD_ERROR}>{form.errors.patient}</span>}
                  </label>
                  <label className={FORM_LABEL}>
                    <span>Accomplished Consultation *</span>
                    <select
                      className={FORM_FIELD}
                      value={form.values.consultationId}
                      onChange={(e) => handleConsultationChange(e.target.value)}
                      disabled={busy || !form.values.patient || patientConsults.length === 0}
                    >
                      <option value="">
                        {!form.values.patient
                          ? '— Select a patient first —'
                          : patientConsults.length === 0
                            ? '— No completed consultations on file —'
                            : '— Select completed consultation —'}
                      </option>
                      {patientConsults.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.reference} · {formatDate(c.date)} · {c.diagnosis || c.chiefComplaint || 'Consultation'}
                        </option>
                      ))}
                    </select>
                    {form.errors.consultationId && (
                      <span className={FIELD_ERROR}>{form.errors.consultationId}</span>
                    )}
                  </label>
                </div>

                {form.values.patient && patientConsults.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#f2cfc2] bg-[#fdf1ec] p-[10px_14px] text-[12.5px] font-bold text-[#a33c12]">
                    ⚠ This student has no accomplished consultations on file. A clinic consultation must be completed first before requesting or issuing a medical certificate.
                  </div>
                )}

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
                    <span>Requested Date</span>
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
                  <span>Requested By</span>
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
                    if (!busy) requestModal.close()
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`}
                  onClick={handleSubmitRequest}
                  disabled={busy || !form.values.consultationId}
                >
                  {busy ? (
                    <>
                      <InlineSpinner /> Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ CERTIFICATE DETAILS / REVIEW MODAL ============ */}
      {details && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Certificate ${details.reference} details`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDetails(null)
          }}
        >
          <div className={MODAL_CARD_WIDE}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Certificate — {details.reference}</h3>
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

              {/* Workflow audit trail */}
              <div className="mb-4 grid grid-cols-3 gap-3 max-[560px]:grid-cols-1">
                <div className="rounded-lg border border-line bg-white p-[10px_12px]">
                  <span className={PROFILE_LBL}>Requested By</span>
                  <p className={PROFILE_VAL}>{details.requestedBy || '—'}</p>
                </div>
                <div className="rounded-lg border border-line bg-white p-[10px_12px]">
                  <span className={PROFILE_LBL}>Approved By</span>
                  <p className={PROFILE_VAL}>{details.approvedBy || '—'}</p>
                </div>
                <div className="rounded-lg border border-line bg-white p-[10px_12px]">
                  <span className={PROFILE_LBL}>Approved At</span>
                  <p className={PROFILE_VAL}>{details.approvedAt ? formatDate(details.approvedAt) : '—'}</p>
                </div>
                {details.status === 'Rejected' && (
                  <>
                    <div className="rounded-lg border border-line bg-white p-[10px_12px]">
                      <span className={PROFILE_LBL}>Rejected By</span>
                      <p className={PROFILE_VAL}>{details.rejectedBy || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-[10px_12px]">
                      <span className={PROFILE_LBL}>Rejected At</span>
                      <p className={PROFILE_VAL}>{details.rejectedAt ? formatDate(details.rejectedAt) : '—'}</p>
                    </div>
                  </>
                )}
              </div>

              {details.status === 'Rejected' && details.rejectionReason && (
                <div className={`${ALERT_BOX} mb-4`}>
                  <h4 className="mb-1 m-0 text-[13px] font-bold text-danger">Rejection Reason</h4>
                  <p className="m-0 text-[13px]">{details.rejectionReason}</p>
                </div>
              )}

              {!isIssued && (
                <div className={`${INFO_BOX} mb-4`}>
                  <p className="m-0 text-[13px]">
                    {details.status === 'Pending'
                      ? 'Draft preview — this request is awaiting review and is not yet valid.'
                      : details.status === 'Approved'
                        ? 'Draft preview — approved, but not yet issued. Issue it to finalize the printable certificate.'
                        : 'Preview of the request — this certificate was not issued.'}
                  </p>
                </div>
              )}

              <CertificateSheet certificate={details} />
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                {details.status === 'Pending' && canApprove && (
                  <>
                    <button type="button" className={PILL} onClick={() => { setRejectTarget(details); setRejectReason('') }} disabled={busy}>
                      Reject
                    </button>
                    <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={() => setApproveTarget(details)} disabled={busy}>
                      Approve Request
                    </button>
                  </>
                )}
                {details.status === 'Approved' && canUpdate && (
                  <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={() => openIssue(details)} disabled={busy}>
                    Issue Certificate
                  </button>
                )}
                {isIssued && (
                  <>
                    {canUpdate && (
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
                  </>
                )}
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
        isIssued &&
        createPortal(
          <div className="print-only" aria-hidden="true">
            <CertificateSheet certificate={details} />
          </div>,
          document.body,
        )}

      {/* ============ APPROVE CONFIRMATION MODAL ============ */}
      {approveTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Approve certificate request"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setApproveTarget(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Approve Certificate Request</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) setApproveTarget(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <StatusBadge status={approveTarget.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{approveTarget.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {approveTarget.reference} · {approveTarget.purpose}
                  </span>
                </div>
              </div>
              <p className="mt-0 text-[13px]">
                Approving moves this request to <strong>Approved</strong> and records your name in the audit trail. The
                certificate can then be issued.
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setApproveTarget(null)} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={handleApprove} disabled={busy}>
                  {busy ? (
                    <>
                      <InlineSpinner /> Approving...
                    </>
                  ) : (
                    'Confirm Approval'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ REJECT REASON MODAL ============ */}
      {rejectTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Reject certificate request"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setRejectTarget(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Reject Certificate Request</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) setRejectTarget(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <StatusBadge status={rejectTarget.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{rejectTarget.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {rejectTarget.reference} · {rejectTarget.purpose}
                  </span>
                </div>
              </div>
              <label className={FORM_LABEL}>
                <span>Reason for Rejection</span>
                <textarea
                  className={`${FORM_FIELD} min-h-20 resize-y`}
                  placeholder="Explain why this request is being rejected (shown on the record)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
              </label>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button
                  type="button"
                  className={PILL}
                  onClick={() => {
                    if (!busy) setRejectTarget(null)
                  }}
                  disabled={busy}
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  className="min-h-10 cursor-pointer rounded-lg bg-[#c0392b] px-[14px] text-[13px] font-extrabold text-white transition-all duration-200 hover:bg-[#a93226]"
                  onClick={handleReject}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <InlineSpinner /> Rejecting...
                    </>
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ ISSUE CERTIFICATE MODAL ============ */}
      {issueTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Issue medical certificate"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setIssueTarget(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Issue Certificate</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) setIssueTarget(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-[18px] flex items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[14px]">
                <StatusBadge status={issueTarget.status} />
                <div>
                  <strong className="block text-[15px] text-ink">{issueTarget.patient}</strong>
                  <span className="block text-[12px] text-muted">
                    {issueTarget.reference} · {issueTarget.purpose}
                  </span>
                </div>
              </div>
              <p className="mt-0 mb-4 text-[13px] text-muted">
                Finalize the printable certificate. The issuing clinician and printed date are recorded on the
                document.
              </p>
              <div className="grid gap-[14px]">
                <label className={FORM_LABEL}>
                  <span>Issuing Clinician *</span>
                  <select
                    className={FORM_FIELD}
                    value={issueForm.values.issuedBy}
                    onChange={(e) => issueForm.setValue('issuedBy', e.target.value)}
                    disabled={busy}
                  >
                    {staff.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} — {m.role}
                      </option>
                    ))}
                  </select>
                  {issueForm.errors.issuedBy && <span className={FIELD_ERROR}>{issueForm.errors.issuedBy}</span>}
                </label>
                <label className={FORM_LABEL}>
                  <span>Issue Date *</span>
                  <input
                    type="date"
                    className={FORM_FIELD}
                    value={issueForm.values.issueDate}
                    onChange={(e) => issueForm.setValue('issueDate', e.target.value)}
                    disabled={busy}
                  />
                  {issueForm.errors.issueDate && <span className={FIELD_ERROR}>{issueForm.errors.issueDate}</span>}
                </label>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button
                  type="button"
                  className={PILL}
                  onClick={() => {
                    if (!busy) setIssueTarget(null)
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={handleIssue} disabled={busy}>
                  {busy ? (
                    <>
                      <InlineSpinner /> Issuing...
                    </>
                  ) : (
                    'Confirm Issue'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
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
