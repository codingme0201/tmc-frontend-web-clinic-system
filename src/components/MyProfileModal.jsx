import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useAppContext } from '../context/AppContext'
import { clinicStaffService } from '../services/clinicStaffService'
import { formatPhone, isValidPhone, PHONE_ERROR, todayISO } from '../lib/format'
import { LICENSE_TYPES, LICENSE_TYPES_BY_ROLE } from '../lib/clinic'
import { SIDEBAR_FORM, FORM_LABEL, FORM_FIELD, FORM_ROW, PILL, PRIMARY_BTN } from '../lib/ui'
import ProfilePictureEditor from './ProfilePictureEditor'
import InlineSpinner from './Spinner'
import DetailSkeleton from './skeletons/DetailSkeleton'
import { ErrorState } from './AsyncState'

const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'
const EMPTY_PROFILE = {
  position: '', specialization: '', background: '', contactNumber: '', licenseType: '', licenseNumber: '',
  licenseIssuedAt: '', licenseExpiresAt: '', otherCredentials: '',
}

function profileToForm(member) {
  return {
    position: member.position || '',
    specialization: member.specialization || '',
    background: member.background || '',
    contactNumber: member.contactNumber || '',
    licenseType: member.credentials.licenseType || '',
    licenseNumber: member.credentials.licenseNumber || '',
    licenseIssuedAt: member.credentials.licenseIssuedAt || '',
    licenseExpiresAt: member.credentials.licenseExpiresAt || '',
    otherCredentials: member.credentials.otherCredentials || '',
  }
}


export default function MyProfileModal({ onClose }) {
  const { user, userRole } = useAuth()
  const { showToast } = useToast()
  const { log } = useAppContext()
  const queryClient = useQueryClient()
  const dialogRef = useRef(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const profileForm = useForm({ defaultValues: EMPTY_PROFILE })
  const { isDirty } = profileForm.formState
  const formLicenseType = useWatch({ control: profileForm.control, name: 'licenseType' })
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['my-staff-profile', user?.id],
    queryFn: clinicStaffService.fetchMyStaffProfile,
    enabled: ['doctor', 'nurse', 'front_desk'].includes(userRole),
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => { dialog.close(); previousFocus?.focus() }
  }, [])
  useEffect(() => { if (profile && !isDirty) profileForm.reset(profileToForm(profile)) }, [profile, profileForm, isDirty])
  const licenseOptions = LICENSE_TYPES_BY_ROLE[profile?.role] || LICENSE_TYPES
  const handleSaveProfile = async (values) => {
    if (!profile || profile.id !== user?.id || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const saved = await clinicStaffService.updateMyStaffProfile({
        ...values,
        licenseType: values.licenseType || null,
        licenseNumber: values.licenseNumber.trim() || null,
        licenseIssuedAt: values.licenseIssuedAt || null,
        licenseExpiresAt: values.licenseExpiresAt || null,
      })
      queryClient.setQueryData(['my-staff-profile', user.id], saved)
      for (const key of ['clinic-staff', 'clinic-staff-member', 'eligible-staff']) queryClient.invalidateQueries({ queryKey: [key] })
      log('Updated own professional profile', 'Medical Staff')
      showToast('Profile saved.')
      onClose()
    } catch (error) {
      showToast(error.message || 'Could not save your profile.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  return (
    <dialog ref={dialogRef} aria-labelledby="my-profile-title"
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100vw_-_2rem)] max-w-[560px] overflow-hidden rounded-xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
      onCancel={(event) => { event.preventDefault(); if (!busyRef.current) onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busyRef.current) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}>
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div><h3 id="my-profile-title" className="m-0 text-[18px] text-ink">My Profile</h3><p className="mb-0 mt-1 text-[12px] text-muted">{user?.name} <span className="block">{user?.email}</span></p></div>
          <button type="button" className={PILL} onClick={onClose} disabled={busy}>Close</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error ? <ErrorState message={error.message} onRetry={refetch} /> : isLoading || !profile ? <DetailSkeleton /> : (
            <form className={SIDEBAR_FORM} onSubmit={(e) => profileForm.handleSubmit(handleSaveProfile, (errors) => showToast(Object.values(errors)[0]?.message || 'Please check the highlighted fields.', 'error'))(e)}>
                <ProfilePictureEditor disabled={busy} />
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
                  Background (education, training, experience)
                  <textarea
                    className={`${FORM_FIELD} min-h-24 resize-y`}
                    placeholder="e.g. Doctor of Medicine, UST (2012). 10 years in family and school medicine."
                    maxLength={3000}
                    {...profileForm.register('background')}
                    disabled={busy}
                  />
                </label>
                <label className={FORM_LABEL}>
                  Contact Number
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={13}
                    className={FORM_FIELD}
                    placeholder="e.g. 0917-123-4567"
                    {...profileForm.register('contactNumber', {
                      validate: (v) => isValidPhone(v) || PHONE_ERROR,
                      onChange: (e) => profileForm.setValue('contactNumber', formatPhone(e.target.value)),
                    })}
                    disabled={busy}
                  />
                </label>

                {profile.role !== 'front_desk' && (
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
                  <button type="button" className={PILL} onClick={() => onClose()} disabled={busy}>Cancel</button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy && <InlineSpinner />}
                    {busy ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
          )}
        </div>
      </div>
    </dialog>
  )
}
