import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'
import { useClinicStaff, useClinicStaffMember } from '../hooks/useClinicStaff'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { formatDate, todayISO } from '../lib/format'
import { LICENSE_TYPES, LICENSE_TYPES_BY_ROLE, roleLabel } from '../lib/clinic'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
  SIDEBAR_FORM, FORM_LABEL, FORM_FIELD, FORM_ROW, BTN_VIEW, BTN_INFO, BTN_SUCCESS,
} from '../lib/ui'
import InlineSpinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import VisitTypeBadge from '../components/VisitTypeBadge'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import DetailSkeleton from '../components/skeletons/DetailSkeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'

const MODAL_CARD = 'flex max-h-[90vh] w-[min(560px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_CARD_WIDE = MODAL_CARD + ' w-[min(760px,100%)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'
const PROFILE_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4'
const PROFILE_LBL = 'mb-0.5 block text-[11px] font-extrabold uppercase text-muted'
const PROFILE_VAL = 'm-0 text-[14px] font-bold text-ink'
const CARD = 'rounded-lg border border-line p-[14px_16px]'

const CLINIC_ROLES = ['doctor', 'nurse', 'front_desk']
const CREDENTIAL_STATUSES = ['Not Submitted', 'Pending Verification', 'Verified', 'Rejected']

const EMPTY_PROFILE = {
  position: '', specialization: '', contactNumber: '', licenseType: '', licenseNumber: '',
  licenseIssuedAt: '', licenseExpiresAt: '', otherCredentials: '',
}

function profileToForm(member) {
  return {
    position: member.position || '',
    specialization: member.specialization || '',
    contactNumber: member.contactNumber || '',
    licenseType: member.credentials.licenseType || '',
    licenseNumber: member.credentials.licenseNumber || '',
    licenseIssuedAt: member.credentials.licenseIssuedAt || '',
    licenseExpiresAt: member.credentials.licenseExpiresAt || '',
    otherCredentials: member.credentials.otherCredentials || '',
  }
}

function ClinicStaff({ page }) {
  const { can, user, userRole } = useAuth()
  const staff = useClinicStaff()
  const { showToast } = useToast()
  const canManage = can('users.update')
  const isClinicStaff = CLINIC_ROLES.includes(userRole)

  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [roleFilter, setRoleFilter] = useState('All')
  const [credentialFilter, setCredentialFilter] = useState('All')

  const [viewId, setViewId] = useState(null)
  const [editTarget, setEditTarget] = useState(null) // member being edited
  const [verifyTarget, setVerifyTarget] = useState(null)
  const [verifyStatus, setVerifyStatus] = useState('Verified')
  const [verifyNotes, setVerifyNotes] = useState('')

  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)

  const profileForm = useForm({ defaultValues: EMPTY_PROFILE })
  const formLicenseType = useWatch({ control: profileForm.control, name: 'licenseType' })

  const detail = useClinicStaffMember(viewId)

  const counts = useMemo(() => ({
    doctor: staff.data.filter((m) => m.role === 'doctor').length,
    nurse: staff.data.filter((m) => m.role === 'nurse').length,
    front_desk: staff.data.filter((m) => m.role === 'front_desk').length,
    pending: staff.data.filter((m) => m.credentials.status === 'Pending Verification').length,
  }), [staff.data])

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return staff.data.filter((m) => {
      const matchQuery = !q
        || m.name.toLowerCase().includes(q)
        || (m.email || '').toLowerCase().includes(q)
        || (m.specialization || '').toLowerCase().includes(q)
        || (m.credentials.licenseNumber || '').includes(q)
      const matchRole = roleFilter === 'All' || m.role === roleFilter
      const matchCredential = credentialFilter === 'All' || m.credentials.status === credentialFilter
      return matchQuery && matchRole && matchCredential
    })
  }, [staff.data, debouncedSearch, roleFilter, credentialFilter])

  const pagination = usePagination(filtered, { pageSize: 10 })
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  useEffect(() => {
    resetPage()
  }, [debouncedSearch, roleFilter, credentialFilter, resetPage])

  const myEntry = staff.data.find((m) => m.id === user?.id) || null

  const openEdit = (member) => {
    setEditTarget(member)
    profileForm.reset(profileToForm(member))
  }

  const licenseOptions = editTarget ? LICENSE_TYPES_BY_ROLE[editTarget.role] || LICENSE_TYPES : LICENSE_TYPES

  const handleSaveProfile = async (values) => {
    if (!editTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const payload = {
        ...values,
        licenseType: values.licenseType || null,
        licenseNumber: values.licenseNumber.trim() || null,
        licenseIssuedAt: values.licenseIssuedAt || null,
        licenseExpiresAt: values.licenseExpiresAt || null,
      }
      const saved = editTarget.id === user?.id
        ? await staff.updateMyProfile(payload)
        : await staff.updateProfile(editTarget.id, payload)
      showToast(
        saved.credentials.status === 'Pending Verification'
          ? 'Profile saved. The license was sent to the administrator for verification.'
          : 'Profile saved.',
      )
      setEditTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to save the profile.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const openVerify = (member) => {
    setVerifyTarget(member)
    setVerifyStatus('Verified')
    setVerifyNotes('')
  }

  const handleVerify = async () => {
    if (!verifyTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const saved = await staff.verifyCredentials(verifyTarget.id, verifyStatus, verifyNotes.trim())
      showToast(`Credentials of ${saved.name} marked as ${saved.credentials.status}.`)
      setVerifyTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to update the verification.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const licenseCell = (m) => {
    if (m.role === 'front_desk') return <span className="text-muted">Not required</span>
    if (!m.credentials.licenseNumber) return <span className="font-bold text-[#a33c12]">Not submitted</span>
    return (
      <>
        <strong className="block font-mono text-ink">{m.credentials.licenseNumber}</strong>
        <span className="block text-[11.5px] text-muted">{m.credentials.licenseType}</span>
        {m.credentials.licenseExpiresAt && (
          <span className={`block text-[11.5px] font-bold ${m.credentials.isExpired ? 'text-danger' : 'text-muted'}`}>
            {m.credentials.isExpired ? 'Expired' : 'Valid until'} {formatDate(m.credentials.licenseExpiresAt)}
          </span>
        )}
      </>
    )
  }

  const member = detail.data

  return (
    <div>
      <section className="mb-5 flex items-center justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <p className={KICKER}>{page.eyebrow}</p>
          <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">{page.title}</h2>
          <span className="mt-[6px] block text-[13px] text-muted">{page.description}</span>
        </div>
        {isClinicStaff && myEntry && (
          <button type="button" className={PRIMARY_BTN} onClick={() => openEdit(myEntry)}>
            My Credentials
          </button>
        )}
      </section>

      <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {[
          { label: 'Doctors', count: counts.doctor, value: 'doctor', kind: 'role' },
          { label: 'Nurses', count: counts.nurse, value: 'nurse', kind: 'role' },
          { label: 'Front Desk', count: counts.front_desk, value: 'front_desk', kind: 'role' },
          { label: 'Pending Verification', count: counts.pending, value: 'Pending Verification', kind: 'credential' },
        ].map((chip) => {
          const active = chip.kind === 'role' ? roleFilter === chip.value : credentialFilter === chip.value
          return (
            <button
              type="button"
              key={chip.label}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-[13px] font-bold transition ${
                active ? 'border-primary bg-white text-primary shadow-sm' : 'border-line bg-surface text-ink hover:border-primary/30'
              }`}
              onClick={() => (chip.kind === 'role'
                ? setRoleFilter(active ? 'All' : chip.value)
                : setCredentialFilter(active ? 'All' : chip.value))}
            >
              <span>{chip.label}</span>
              <span className={`ml-2 inline-flex size-[22px] items-center justify-center rounded-full text-[11px] ${active ? 'bg-primary text-white' : 'bg-bg text-muted'}`}>
                {chip.count}
              </span>
            </button>
          )
        })}
      </div>

      <div className={`${PANEL} p-5`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search name, email, specialization or license no..."
            className={`${SEARCH_INPUT} sm:min-w-[260px]`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={SELECT_INPUT} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
            <option value="All">All Roles</option>
            {CLINIC_ROLES.map((r) => (<option key={r} value={r}>{roleLabel(r)}</option>))}
          </select>
          <select className={SELECT_INPUT} value={credentialFilter} onChange={(e) => setCredentialFilter(e.target.value)} aria-label="Filter by credential status">
            <option value="All">All Credential Statuses</option>
            {CREDENTIAL_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          {(search || roleFilter !== 'All' || credentialFilter !== 'All') && (
            <button type="button" className={PILL} onClick={() => { resetSearch(); setRoleFilter('All'); setCredentialFilter('All') }}>
              Clear filters
            </button>
          )}
          <RefreshingBadge refreshing={staff.isRefetching} />
          <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">{filtered.length} of {staff.data.length} staff</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line">
          {staff.error ? (
            <ErrorState message={staff.error} onRetry={staff.refetch} />
          ) : staff.isLoading ? (
            <TableSkeleton columns={6} />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role / Position</th>
                  <th>License / Credentials</th>
                  <th>Verification</th>
                  <th>Today&apos;s Patients</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong className="block font-bold text-ink">{m.name}</strong>
                      <span className="block text-[12px] text-muted">{m.email}</span>
                      {m.status !== 'active' && <StatusBadge status="Inactive" />}
                    </td>
                    <td>
                      <strong className="block text-ink">{roleLabel(m.role)}</strong>
                      <span className="block text-[12px] text-muted">{[m.position, m.specialization].filter(Boolean).join(' · ') || '—'}</span>
                    </td>
                    <td>{licenseCell(m)}</td>
                    <td>{m.role === 'front_desk' ? <span className="text-muted">—</span> : <StatusBadge status={m.credentials.status} />}</td>
                    <td className="font-bold text-ink">{m.role === 'front_desk' ? '—' : m.todayAppointmentsCount}</td>
                    <td>
                      <div className="flex flex-wrap gap-[6px]">
                        <button type="button" className={BTN_VIEW} onClick={() => setViewId(m.id)}>View</button>
                        {(canManage || m.id === user?.id) && (
                          <button type="button" className={BTN_INFO} onClick={() => openEdit(m)}>Edit</button>
                        )}
                        {canManage && m.role !== 'front_desk' && m.credentials.licenseNumber && m.credentials.status !== 'Verified' && (
                          <button type="button" className={BTN_SUCCESS} onClick={() => openVerify(m)}>Verify</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      <EmptyState message="No clinic staff matched your search or filters." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      {/* ================= VIEW STAFF MODAL ================= */}
      {viewId && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Staff details"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setViewId(null) }}>
          <div className={MODAL_CARD_WIDE}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{member ? member.name : 'Staff Details'}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => setViewId(null)}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              {detail.error ? (
                <ErrorState message={detail.error} onRetry={detail.refetch} />
              ) : detail.isLoading || !member ? (
                <DetailSkeleton />
              ) : (
                <div className="grid gap-[14px]">
                  <div className={PROFILE_GRID}>
                    <div><span className={PROFILE_LBL}>Role</span><p className={PROFILE_VAL}>{roleLabel(member.role)}</p></div>
                    <div><span className={PROFILE_LBL}>Position</span><p className={PROFILE_VAL}>{member.position || '—'}</p></div>
                    <div><span className={PROFILE_LBL}>Specialization</span><p className={PROFILE_VAL}>{member.specialization || '—'}</p></div>
                    <div><span className={PROFILE_LBL}>Email</span><p className={PROFILE_VAL}>{member.email}</p></div>
                    <div><span className={PROFILE_LBL}>Contact</span><p className={PROFILE_VAL}>{member.contactNumber || '—'}</p></div>
                    <div><span className={PROFILE_LBL}>Account</span><p className={PROFILE_VAL}><StatusBadge status={member.status} /></p></div>
                  </div>

                  {member.role !== 'front_desk' && (
                    <section className={CARD}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="m-0 text-[12px] uppercase tracking-[0.02em] text-ink">Professional Credentials</h4>
                        <StatusBadge status={member.credentials.status} />
                      </div>
                      <div className={PROFILE_GRID}>
                        <div><span className={PROFILE_LBL}>License Type</span><p className={PROFILE_VAL}>{member.credentials.licenseType || '—'}</p></div>
                        <div><span className={PROFILE_LBL}>License No.</span><p className={`${PROFILE_VAL} font-mono`}>{member.credentials.licenseNumber || '—'}</p></div>
                        <div><span className={PROFILE_LBL}>Issued</span><p className={PROFILE_VAL}>{formatDate(member.credentials.licenseIssuedAt)}</p></div>
                        <div>
                          <span className={PROFILE_LBL}>Valid Until</span>
                          <p className={`${PROFILE_VAL} ${member.credentials.isExpired ? 'text-danger' : ''}`}>
                            {formatDate(member.credentials.licenseExpiresAt)}{member.credentials.isExpired ? ' (expired)' : ''}
                          </p>
                        </div>
                      </div>
                      {member.credentials.otherCredentials && (
                        <p className="m-0 mt-2 text-[13px] text-ink"><strong>Other credentials:</strong> {member.credentials.otherCredentials}</p>
                      )}
                      {member.credentials.verifiedBy && (
                        <p className="m-0 mt-2 text-[12.5px] text-muted">
                          {member.credentials.status} by {member.credentials.verifiedBy}
                          {member.credentials.verifiedAt ? ` on ${formatDate(member.credentials.verifiedAt.slice(0, 10))}` : ''}
                          {member.credentials.verificationNotes ? ` — ${member.credentials.verificationNotes}` : ''}
                        </p>
                      )}
                    </section>
                  )}

                  {member.role !== 'front_desk' && (
                    <section className={CARD}>
                      <h4 className="m-0 mb-2 text-[12px] uppercase tracking-[0.02em] text-ink">Schedule (next 14 days)</h4>
                      {member.schedules?.length ? (
                        <div className="grid gap-1.5">
                          {member.schedules.map((s) => (
                            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#fafcfb] p-[6px_10px] text-[12.5px]">
                              <span className="font-bold text-ink">{formatDate(s.date)}</span>
                              <span className="text-muted">{s.startTime} – {s.endTime}</span>
                              <StatusBadge status={s.status} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="m-0 text-[12.5px] text-muted">No schedule entries.</p>
                      )}
                    </section>
                  )}

                  {member.role !== 'front_desk' && (
                    <section className={CARD}>
                      <h4 className="m-0 mb-2 text-[12px] uppercase tracking-[0.02em] text-ink">Assigned Patients (upcoming)</h4>
                      {member.upcomingAppointments?.length ? (
                        <div className="grid gap-1.5">
                          {member.upcomingAppointments.map((a) => (
                            <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-md bg-[#fafcfb] p-[6px_10px] text-[12.5px]">
                              <span className="font-bold text-ink">{formatDate(a.date)} · {a.time}</span>
                              <span className="text-ink">{a.patient}</span>
                              <VisitTypeBadge visitType={a.visitType} compact />
                              <StatusBadge status={a.status} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="m-0 text-[12.5px] text-muted">No upcoming assigned appointments.</p>
                      )}
                    </section>
                  )}
                </div>
              )}
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                {member && (canManage || member.id === user?.id) && (
                  <button type="button" className={BTN_INFO} onClick={() => { setViewId(null); openEdit(member) }}>Edit</button>
                )}
                {member && canManage && member.role !== 'front_desk' && member.credentials.licenseNumber && member.credentials.status !== 'Verified' && (
                  <button type="button" className={BTN_SUCCESS} onClick={() => { setViewId(null); openVerify(member) }}>Verify</button>
                )}
                <button type="button" className={PILL} onClick={() => setViewId(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT PROFILE / CREDENTIALS MODAL ================= */}
      {editTarget && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Edit credentials"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setEditTarget(null) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">
                {editTarget.id === user?.id ? 'My Profile & Credentials' : `Profile & Credentials — ${editTarget.name}`}
              </h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setEditTarget(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={(e) => profileForm.handleSubmit(handleSaveProfile, () => showToast('Please check the highlighted fields.', 'error'))(e)}>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Position
                    <input type="text" className={FORM_FIELD} placeholder="e.g. School Physician" {...profileForm.register('position')} disabled={busy} />
                  </label>
                  <label className={FORM_LABEL}>
                    Specialization
                    <input type="text" className={FORM_FIELD} placeholder="e.g. Family Medicine" {...profileForm.register('specialization')} disabled={busy} />
                  </label>
                </div>
                <label className={FORM_LABEL}>
                  Contact Number
                  <input type="text" className={FORM_FIELD} placeholder="e.g. 0917-123-4567" {...profileForm.register('contactNumber')} disabled={busy} />
                </label>

                {editTarget.role !== 'front_desk' && (
                  <div className="flex flex-col gap-3.5 rounded-xl border border-line bg-[#fbfdfc] p-4">
                    <div className="border-b border-line pb-2">
                      <span className="text-[12px] font-extrabold uppercase tracking-wider text-primary">Professional License</span>
                      <p className="mt-0.5 text-[11.5px] text-muted">
                        PRC license numbers are 7 digits. Changing the license sends it back for administrator verification.
                      </p>
                    </div>
                    <div className={FORM_ROW}>
                      <label className={FORM_LABEL}>
                        License Type
                        <select className={FORM_FIELD} {...profileForm.register('licenseType')} disabled={busy}>
                          <option value="">Select license type</option>
                          {licenseOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </label>
                      <label className={FORM_LABEL}>
                        License Number
                        <input
                          type="text"
                          inputMode={formLicenseType?.startsWith('PRC') ? 'numeric' : 'text'}
                          className={`${FORM_FIELD} font-mono`}
                          placeholder={formLicenseType?.startsWith('PRC') ? '7 digits, e.g. 0123456' : 'License / certificate no.'}
                          {...profileForm.register('licenseNumber', {
                            validate: (v) => !v || !formLicenseType?.startsWith('PRC') || /^\d{7}$/.test(v.replace(/\s+/g, '')) || 'PRC license numbers must be exactly 7 digits.',
                          })}
                          disabled={busy}
                        />
                      </label>
                    </div>
                    {profileForm.formState.errors.licenseNumber && (
                      <p className="m-0 text-[12px] font-bold text-danger">{profileForm.formState.errors.licenseNumber.message}</p>
                    )}
                    <div className={FORM_ROW}>
                      <label className={FORM_LABEL}>
                        Date Issued
                        <input type="date" max={todayISO()} className={FORM_FIELD} {...profileForm.register('licenseIssuedAt')} disabled={busy} />
                      </label>
                      <label className={FORM_LABEL}>
                        Valid Until
                        <input type="date" className={FORM_FIELD} {...profileForm.register('licenseExpiresAt')} disabled={busy} />
                      </label>
                    </div>
                    <label className={FORM_LABEL}>
                      Other Credentials (board certification, trainings)
                      <input type="text" className={FORM_FIELD} placeholder="e.g. Diplomate, PAFP; BLS certified" {...profileForm.register('otherCredentials')} disabled={busy} />
                    </label>
                  </div>
                )}
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={() => setEditTarget(null)} disabled={busy}>Cancel</button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy && <InlineSpinner />}
                    {busy ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= VERIFY CREDENTIALS MODAL ================= */}
      {verifyTarget && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Verify credentials"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setVerifyTarget(null) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Verify Credentials — {verifyTarget.name}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setVerifyTarget(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-4 rounded-lg border border-line bg-[#f4faf8] p-[12px_14px] text-[13px] text-ink">
                <p className="m-0"><strong>{verifyTarget.credentials.licenseType}</strong></p>
                <p className="m-0 font-mono text-[15px] font-extrabold">{verifyTarget.credentials.licenseNumber}</p>
                <p className="m-0 text-muted">
                  {verifyTarget.credentials.licenseExpiresAt
                    ? `${verifyTarget.credentials.isExpired ? 'Expired' : 'Valid until'} ${formatDate(verifyTarget.credentials.licenseExpiresAt)}`
                    : 'No expiry date provided'}
                </p>
              </div>
              <ol className="m-0 mb-4 list-decimal pl-5 text-[12.5px] text-muted">
                <li>Open the PRC online verification service and search the name and license number.</li>
                <li>Confirm the name, profession and license validity match this staff member.</li>
                <li>Record the result below.</li>
              </ol>
              <a
                href={verifyTarget.credentials.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${PILL} mb-4`}
              >
                Open PRC License Verification ↗
              </a>
              <label className={FORM_LABEL}>
                Result
                <select className={FORM_FIELD} value={verifyStatus} onChange={(e) => setVerifyStatus(e.target.value)} disabled={busy}>
                  <option value="Verified">Verified — license is valid</option>
                  <option value="Rejected">Rejected — could not be verified</option>
                </select>
              </label>
              <label className={`${FORM_LABEL} mt-3`}>
                Notes {verifyStatus === 'Rejected' ? '(required)' : '(optional)'}
                <textarea
                  className={`${FORM_FIELD} min-h-20 resize-y`}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder={verifyStatus === 'Rejected' ? 'e.g. License number not found in the PRC registry' : 'e.g. Checked against PRC records on this date'}
                  disabled={busy}
                />
              </label>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setVerifyTarget(null)} disabled={busy}>Cancel</button>
                <button
                  type="button"
                  className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`}
                  onClick={handleVerify}
                  disabled={busy || (verifyStatus === 'Rejected' && !verifyNotes.trim())}
                >
                  {busy && <InlineSpinner />}
                  {busy ? 'Saving...' : 'Save Verification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClinicStaff
