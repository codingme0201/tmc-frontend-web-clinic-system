import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useUsersStore } from '../hooks/useUsers'
import { useRoles } from '../hooks/useRoles'
import { usePatients } from '../hooks/usePatients'
import { useForm, useWatch } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { formatDate } from '../lib/format'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
  SIDEBAR_FORM, FORM_LABEL, FORM_FIELD, FORM_ROW,
  BTN_INFO, BTN_SUCCESS, BTN_DANGER, BTN_PRIMARY,
} from '../lib/ui'
import InlineSpinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import StudentSelect from '../components/StudentSelect'
import { EmptyState, ErrorState } from '../components/AsyncState'

const MODAL_CARD = 'flex max-h-[90vh] w-[min(520px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'

function UserManagement({ page }) {
  const { can } = useAuth()
  const users = useUsersStore()
  const roles = useRoles()
  const patients = usePatients()
  const { showToast } = useToast()
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [statusFilter, setStatusFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')

  // Client-side filtering by search and filters
  const filtered = useMemo(() => {
    let list = users.data
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
      )
    }
    if (statusFilter !== 'All') {
      list = list.filter((u) => u.status === statusFilter)
    }
    if (roleFilter !== 'All') {
      list = list.filter((u) => u.role?.name === roleFilter)
    }
    return list
  }, [users.data, debouncedSearch, statusFilter, roleFilter])

  const pagination = usePagination(filtered, { pageSize: 8 })
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  useEffect(() => {
    resetPage()
  }, [debouncedSearch, statusFilter, roleFilter, resetPage])

  // Busy guard
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)

  const DEFAULT_USER_FORM = {
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: '',
    patient_id: '',
    student_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    course: '',
    block: 'Block 1',
    address: 'Tagum Norte, Trinidad, Bohol, Philippines',
    nationality: 'Filipino',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  }

  // Create / Edit modal
  const [editing, setEditing] = useState(null)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const userForm = useForm({
    defaultValues: DEFAULT_USER_FORM,
  })
  const linkedPatientId = useWatch({ control: userForm.control, name: 'patient_id' })

  // Role assignment modal
  const [roleTarget, setRoleTarget] = useState(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')

  // Password reset modal
  const [passwordTarget, setPasswordTarget] = useState(null)
  const passwordForm = useForm({ defaultValues: { password: '', password_confirmation: '' } })

  // Deactivate confirmation modal
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  // Activate confirmation modal
  const [activateTarget, setActivateTarget] = useState(null)

  const canCreate = can('users.create')
  const canUpdate = can('users.update')

  const roleOptions = useMemo(() => {
    return roles.data || []
  }, [roles.data])

  const watchedRoleId = useWatch({ control: userForm.control, name: 'role_id' })
  const selectedRole = useMemo(() => {
    return roleOptions.find((r) => String(r.id) === String(watchedRoleId))
  }, [roleOptions, watchedRoleId])
  const isPatientRole = selectedRole?.name === 'patient' || selectedRole?.name === 'student'

  // ---------- Create / Edit -------------------------------------------------

  const openCreate = () => {
    setEditing(null)
    userForm.reset(DEFAULT_USER_FORM)
    setUserModalOpen(true)
  }

  const openEdit = (user) => {
    setEditing(user)
    const p = user.patient || {}
    userForm.reset({
      name: user.name || '',
      email: user.email || '',
      password: '',
      password_confirmation: '',
      role_id: user.role_id || user.role?.id || '',
      patient_id: user.patient_id || user.patientId || p.patientId || '',
      student_id: p.studentId || p.patientId || user.patient_id || '',
      first_name: p.firstName || p.first_name || '',
      middle_name: p.middleName || p.middle_name || '',
      last_name: p.lastName || p.last_name || '',
      age: p.age !== undefined && p.age !== null ? String(p.age) : '',
      course: p.course || p.courseDept || p.course_dept || '',
      block: p.block || 'Block 1',
      address: p.address || 'Tagum Norte, Trinidad, Bohol, Philippines',
      nationality: p.nationality || 'Filipino',
      phone: p.phone || p.contact || '',
      emergency_contact_name: p.emergencyContactName || p.emergency_contact_name || '',
      emergency_contact_phone: p.emergencyContactPhone || p.emergency_contact_phone || '',
    })
    setUserModalOpen(true)
  }

  const submitUserForm = (event) => {
    userForm.handleSubmit(handleSaveUser, () => showToast('Please fill in all required fields.', 'error'))(event)
  }

  const handleSaveUser = async (values) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const studentId = isPatientRole ? (values.student_id || values.patient_id || null) : null
      let fullName = values.name
      if (isPatientRole && (values.first_name || values.last_name)) {
        fullName = [values.first_name, values.middle_name, values.last_name].filter(Boolean).join(' ').trim()
      }

      const payload = {
        name: fullName || values.name,
        email: values.email,
        role_id: values.role_id ? Number(values.role_id) : undefined,
        patient_id: studentId,
        student_id: studentId,
        first_name: isPatientRole ? values.first_name : undefined,
        firstName: isPatientRole ? values.first_name : undefined,
        middle_name: isPatientRole ? values.middle_name : undefined,
        middleName: isPatientRole ? values.middle_name : undefined,
        last_name: isPatientRole ? values.last_name : undefined,
        lastName: isPatientRole ? values.last_name : undefined,
        age: isPatientRole && values.age ? Number(values.age) : null,
        course: isPatientRole ? values.course : undefined,
        courseDept: isPatientRole ? values.course : undefined,
        block: isPatientRole ? values.block : undefined,
        address: isPatientRole ? values.address : undefined,
        nationality: isPatientRole ? values.nationality : undefined,
        phone: isPatientRole ? values.phone : undefined,
        contact: isPatientRole ? values.phone : undefined,
        emergency_contact_name: isPatientRole ? values.emergency_contact_name : undefined,
        emergencyContactName: isPatientRole ? values.emergency_contact_name : undefined,
        emergency_contact_phone: isPatientRole ? values.emergency_contact_phone : undefined,
        emergencyContactPhone: isPatientRole ? values.emergency_contact_phone : undefined,
      }

      if (editing) {
        await users.updateUser(editing.id, payload)
        showToast(`User "${fullName || values.name}" updated.`)
      } else {
        await users.createUser({
          ...payload,
          password: values.password,
          password_confirmation: values.password_confirmation,
        })
        showToast(`User "${fullName || values.name}" created.`)
      }
      setUserModalOpen(false)
    } catch (err) {
      showToast(err?.message || 'Failed to save the user.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Assign Role ---------------------------------------------------

  const openRoleModal = (user) => {
    setRoleTarget(user)
    setSelectedRoleId(user.role_id || '')
  }

  const handleSaveRole = async () => {
    if (!roleTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await users.updateUserRole(roleTarget.id, Number(selectedRoleId))
      showToast(`Role updated for "${roleTarget.name}".`)
      setRoleTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to update role.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Password Reset -----------------------------------------------

  const openPasswordModal = (user) => {
    setPasswordTarget(user)
    passwordForm.reset({ password: '', password_confirmation: '' })
  }

  const submitPasswordForm = (event) => {
    passwordForm.handleSubmit(handleResetPassword, () => showToast('Please enter a new password.', 'error'))(event)
  }

  const handleResetPassword = async (values) => {
    if (!passwordTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await users.resetUserPassword(passwordTarget.id, values.password)
      showToast(`Password reset for "${passwordTarget.name}".`)
      setPasswordTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to reset password.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Activate / Deactivate ----------------------------------------

  const handleDeactivate = async () => {
    if (!deactivateTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await users.updateUserStatus(deactivateTarget.id, 'inactive')
      showToast(`"${deactivateTarget.name}" has been deactivated.`)
      setDeactivateTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to deactivate user.', 'error')
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
      await users.updateUserStatus(activateTarget.id, 'active')
      showToast(`"${activateTarget.name}" has been activated.`)
      setActivateTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to activate user.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Render --------------------------------------------------------

  const activeCount = users.data.filter((u) => u.status === 'active').length
  const inactiveCount = users.data.filter((u) => u.status === 'inactive').length

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
          <button type="button" className={PRIMARY_BTN} onClick={openCreate}>
            + Create User
          </button>
        )}
      </section>

      {/* Status summary chips */}
      <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {[
          { label: 'All Users', count: users.data.length, value: 'All' },
          { label: 'Active', count: activeCount, value: 'active' },
          { label: 'Inactive', count: inactiveCount, value: 'inactive' },
        ].map((chip) => (
          <button
            type="button"
            key={chip.value}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-[13px] font-bold transition ${
              statusFilter === chip.value
                ? 'border-primary bg-white text-primary shadow-sm'
                : 'border-line bg-surface text-ink hover:border-primary/30'
            }`}
            onClick={() => setStatusFilter(chip.value)}
          >
            <span>{chip.label}</span>
            <span
              className={`ml-2 inline-flex size-[22px] items-center justify-center rounded-full text-[11px] ${
                statusFilter === chip.value ? 'bg-primary text-white' : 'bg-bg text-muted'
              }`}
            >
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {/* Users panel */}
      <div className={`${PANEL} p-5`}>
        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            className={SEARCH_INPUT}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={SELECT_INPUT}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            {roleOptions.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
          {(search || statusFilter !== 'All' || roleFilter !== 'All') && (
            <button
              type="button"
              className={PILL}
              onClick={() => {
                resetSearch()
                setStatusFilter('All')
                setRoleFilter('All')
              }}
            >
              Clear filters
            </button>
          )}
          <RefreshingBadge refreshing={users.isRefetching} />
          <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">
            {filtered.length} of {users.data.length} users
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-line">
          {users.error ? (
            <ErrorState message={users.error} onRetry={users.refetch} />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.isLoading ? (
                  <TableSkeleton columns={6} />
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <EmptyState
                        message={
                          search || statusFilter !== 'All' || roleFilter !== 'All'
                            ? 'No users match the current filters.'
                            : 'No users found. Create one to get started.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  pageItems.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong className="font-bold text-ink">{user.name}</strong>
                        {(user.patient_id || user.patientId) && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                              ID: {user.patient_id || user.patientId}
                            </span>
                            {user.patient?.course && (
                              <span className="text-[11px] text-muted">
                                {user.patient.course} {user.patient.block ? `(${user.patient.block})` : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-muted">{user.email}</td>
                      <td>
                        <span className="font-bold text-ink">
                          {user.role?.name ? user.role.name.charAt(0).toUpperCase() + user.role.name.slice(1) : '—'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={user.status || 'active'} />
                      </td>
                      <td className="text-[12.5px] text-muted">
                        {user.created_at ? formatDate(user.created_at) : '—'}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-[6px]">
                          {canUpdate && (
                            <>
                              <button type="button" className={BTN_INFO} onClick={() => openEdit(user)}>
                                Edit
                              </button>
                              <button type="button" className={BTN_PRIMARY} onClick={() => openRoleModal(user)}>
                                Role
                              </button>
                              <button type="button" className={BTN_SUCCESS} onClick={() => openPasswordModal(user)}>
                                Password
                              </button>
                              {user.status === 'active' ? (
                                <button type="button" className={BTN_DANGER} onClick={() => setDeactivateTarget(user)}>
                                  Deactivate
                                </button>
                              ) : (
                                <button type="button" className={BTN_SUCCESS} onClick={() => setActivateTarget(user)}>
                                  Activate
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>

      {/* ================= CREATE / EDIT USER MODAL ================= */}
      {userModalOpen && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Edit user' : 'Create user'}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setUserModalOpen(false)
          }}
        >
          <div className={`${MODAL_CARD} ${isPatientRole ? '!w-[min(680px,100%)]' : ''}`}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">
                {editing ? `Edit User — ${editing.name}` : 'Create User'}
              </h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => { if (!busy) setUserModalOpen(false) }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={submitUserForm}>
                <label className={FORM_LABEL}>
                  Role
                  <select
                    className={FORM_FIELD}
                    {...userForm.register('role_id', { required: 'Role is required.' })}
                    disabled={busy}
                  >
                    <option value="">Select a role</option>
                    {roleOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                {!isPatientRole && (
                  <label className={FORM_LABEL}>
                    Full Name
                    <input
                      type="text"
                      placeholder="e.g. Juan Dela Cruz"
                      className={FORM_FIELD}
                      {...userForm.register('name', { required: !isPatientRole ? 'Name is required.' : false })}
                      disabled={busy}
                    />
                  </label>
                )}

                <label className={FORM_LABEL}>
                  Email Address
                  <input
                    type="email"
                    placeholder="e.g. jdelacruz@tmc.edu.ph"
                    className={FORM_FIELD}
                    {...userForm.register('email', { required: 'Email is required.' })}
                    disabled={busy}
                  />
                </label>

                {!editing && (
                  <div className={FORM_ROW}>
                    <label className={FORM_LABEL}>
                      Password
                      <input
                        type="password"
                        placeholder="Min 8 characters"
                        className={FORM_FIELD}
                        {...userForm.register('password', {
                          required: 'Password is required.',
                          minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                        })}
                        disabled={busy}
                      />
                    </label>
                    <label className={FORM_LABEL}>
                      Confirm Password
                      <input
                        type="password"
                        placeholder="Re-enter password"
                        className={FORM_FIELD}
                        {...userForm.register('password_confirmation', {
                          required: 'Please confirm the password.',
                        })}
                        disabled={busy}
                      />
                    </label>
                  </div>
                )}

                {isPatientRole && (
                  <div className="mt-2 flex flex-col gap-3.5 rounded-xl border border-line bg-[#fbfdfc] p-4">
                    <div className="border-b border-line pb-2">
                      <span className="text-[12px] font-extrabold uppercase tracking-wider text-primary">
                        Student Medical & Academic Information
                      </span>
                      <p className="mt-0.5 text-[11.5px] text-muted">
                        Configures student credentials, academic identity, and emergency contact details.
                      </p>
                    </div>

                    <label className={FORM_LABEL}>
                      <span>Link or Auto-fill from Existing Patient (Optional)</span>
                      <StudentSelect
                        value={linkedPatientId || ''}
                        valueKey="patientId"
                        patients={patients.data || []}
                        disabled={busy}
                        placeholder="Search existing student name or ID..."
                        onChange={(val, matchedPatient) => {
                          userForm.setValue('patient_id', val)
                          userForm.setValue('student_id', val)
                          if (matchedPatient) {
                            userForm.setValue('name', matchedPatient.name || '')
                            userForm.setValue('first_name', matchedPatient.firstName || matchedPatient.first_name || '')
                            userForm.setValue('middle_name', matchedPatient.middleName || matchedPatient.middle_name || '')
                            userForm.setValue('last_name', matchedPatient.lastName || matchedPatient.last_name || '')
                            if (matchedPatient.age) userForm.setValue('age', String(matchedPatient.age))
                            if (matchedPatient.course || matchedPatient.courseDept) {
                              userForm.setValue('course', matchedPatient.course || matchedPatient.courseDept)
                            }
                            if (matchedPatient.block) userForm.setValue('block', matchedPatient.block)
                            if (matchedPatient.address) userForm.setValue('address', matchedPatient.address)
                            if (matchedPatient.nationality) userForm.setValue('nationality', matchedPatient.nationality)
                            if (matchedPatient.phone || matchedPatient.contact) {
                              userForm.setValue('phone', matchedPatient.phone || matchedPatient.contact)
                            }
                            if (matchedPatient.emergencyContactName) {
                              userForm.setValue('emergency_contact_name', matchedPatient.emergencyContactName)
                            }
                            if (matchedPatient.emergencyContactPhone) {
                              userForm.setValue('emergency_contact_phone', matchedPatient.emergencyContactPhone)
                            }
                          }
                        }}
                      />
                    </label>

                    {/* Section 1: Personal Details */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className={FORM_LABEL}>
                        First Name *
                        <input
                          type="text"
                          placeholder="e.g. Juan"
                          className={FORM_FIELD}
                          {...userForm.register('first_name', { required: isPatientRole ? 'First name is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                      <label className={FORM_LABEL}>
                        Middle Name
                        <input
                          type="text"
                          placeholder="e.g. Santos (Optional)"
                          className={FORM_FIELD}
                          {...userForm.register('middle_name')}
                          disabled={busy}
                        />
                      </label>
                      <label className={FORM_LABEL}>
                        Last Name *
                        <input
                          type="text"
                          placeholder="e.g. Dela Cruz"
                          className={FORM_FIELD}
                          {...userForm.register('last_name', { required: isPatientRole ? 'Last name is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                    </div>

                    <div className={FORM_ROW}>
                      <label className={FORM_LABEL}>
                        Age *
                        <input
                          type="number"
                          placeholder="e.g. 20"
                          className={FORM_FIELD}
                          {...userForm.register('age', { required: isPatientRole ? 'Age is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                      <label className={FORM_LABEL}>
                        Nationality *
                        <input
                          type="text"
                          placeholder="e.g. Filipino"
                          className={FORM_FIELD}
                          {...userForm.register('nationality', { required: isPatientRole ? 'Nationality is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                    </div>

                    {/* Section 2: Academic Information */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className={FORM_LABEL}>
                        Student ID *
                        <input
                          type="text"
                          placeholder="e.g. 24-021128"
                          className={FORM_FIELD}
                          {...userForm.register('student_id', { required: isPatientRole ? 'Student ID is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                      <label className={FORM_LABEL}>
                        Course / Program *
                        <input
                          type="text"
                          placeholder="e.g. BS Information Technology"
                          className={FORM_FIELD}
                          {...userForm.register('course', { required: isPatientRole ? 'Course is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                      <label className={FORM_LABEL}>
                        Block No. *
                        <input
                          type="text"
                          placeholder="e.g. Block 1"
                          className={FORM_FIELD}
                          {...userForm.register('block', { required: isPatientRole ? 'Block is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                    </div>

                    {/* Section 3: Contact & Address */}
                    <div className={FORM_ROW}>
                      <label className={FORM_LABEL}>
                        Phone Number *
                        <input
                          type="text"
                          placeholder="e.g. 09123456789"
                          className={FORM_FIELD}
                          {...userForm.register('phone', { required: isPatientRole ? 'Phone number is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                      <label className={FORM_LABEL}>
                        Home Address *
                        <input
                          type="text"
                          placeholder="Tagum Norte, Trinidad, Bohol, Philippines"
                          className={FORM_FIELD}
                          {...userForm.register('address', { required: isPatientRole ? 'Address is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                    </div>

                    {/* Section 4: Emergency Contact */}
                    <div className={FORM_ROW}>
                      <label className={FORM_LABEL}>
                        Emergency Contact — Guardian *
                        <input
                          type="text"
                          placeholder="e.g. Maria Dela Cruz (Mother)"
                          className={FORM_FIELD}
                          {...userForm.register('emergency_contact_name', { required: isPatientRole ? 'Guardian name is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                      <label className={FORM_LABEL}>
                        Emergency Contact Phone *
                        <input
                          type="text"
                          placeholder="e.g. 09987654321"
                          className={FORM_FIELD}
                          {...userForm.register('emergency_contact_phone', { required: isPatientRole ? 'Guardian contact no. is required.' : false })}
                          disabled={busy}
                        />
                      </label>
                    </div>
                  </div>
                )}
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={() => setUserModalOpen(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy && <InlineSpinner />}
                    {busy ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= ASSIGN ROLE MODAL ================= */}
      {roleTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Assign role to ${roleTarget.name}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setRoleTarget(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Assign Role — {roleTarget.name}</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => { if (!busy) setRoleTarget(null) }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <label className={FORM_LABEL}>
                Role
                <select
                  className={FORM_FIELD}
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">Select a role</option>
                  {roleOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                      {r.description ? ` — ${r.description}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setRoleTarget(null)} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`}
                  onClick={handleSaveRole}
                  disabled={busy || !selectedRoleId}
                >
                  {busy && <InlineSpinner />}
                  {busy ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESET PASSWORD MODAL ================= */}
      {passwordTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Reset password for ${passwordTarget.name}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setPasswordTarget(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Reset Password — {passwordTarget.name}</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => { if (!busy) setPasswordTarget(null) }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={submitPasswordForm}>
                <label className={FORM_LABEL}>
                  New Password
                  <input
                    type="password"
                    placeholder="Min 8 characters"
                    className={FORM_FIELD}
                    {...passwordForm.register('password', {
                      required: 'Password is required.',
                      minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                    })}
                    disabled={busy}
                  />
                </label>
                <label className={FORM_LABEL}>
                  Confirm Password
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    className={FORM_FIELD}
                    {...passwordForm.register('password_confirmation', {
                      required: 'Please confirm the password.',
                    })}
                    disabled={busy}
                  />
                </label>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={() => setPasswordTarget(null)} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy && <InlineSpinner />}
                    {busy ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= DEACTIVATE CONFIRMATION MODAL ================= */}
      {deactivateTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Deactivate ${deactivateTarget.name}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDeactivateTarget(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Deactivate User</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => { if (!busy) setDeactivateTarget(null) }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0">
                Are you sure you want to deactivate <strong>{deactivateTarget.name}</strong>?
                They will not be able to log in until their account is reactivated.
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setDeactivateTarget(null)} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${BTN_DANGER} min-h-10 px-[14px] text-[13px]`}
                  onClick={handleDeactivate}
                  disabled={busy}
                >
                  {busy && <InlineSpinner />}
                  {busy ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ACTIVATE CONFIRMATION MODAL ================= */}
      {activateTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Activate ${activateTarget.name}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setActivateTarget(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Activate User</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => { if (!busy) setActivateTarget(null) }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0">
                Are you sure you want to activate <strong>{activateTarget.name}</strong>?
                They will be able to log in again.
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setActivateTarget(null)} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${BTN_SUCCESS} min-h-10 px-[14px] text-[13px]`}
                  onClick={handleActivate}
                  disabled={busy}
                >
                  {busy && <InlineSpinner />}
                  {busy ? 'Activating...' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
