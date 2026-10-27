import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useStaffSchedules, useEligibleStaff } from '../hooks/useStaffSchedules'
import { Controller, useForm } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { formatDate, todayISO } from '../lib/format'
import { SHIFT_TIMES, normalizeTime, roleLabel } from '../lib/clinic'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
  SIDEBAR_FORM, FORM_LABEL, FORM_FIELD, FORM_ROW,
  BTN_DANGER,
} from '../lib/ui'
import AppointmentDatePicker from '../components/AppointmentDatePicker'
import CreateStaffScheduleModal from '../components/CreateStaffScheduleModal'
import StaffScheduleDetailsModal from '../components/StaffScheduleDetailsModal'
import InlineSpinner from '../components/Spinner'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'

const MODAL_CARD = 'flex max-h-[90vh] w-[min(520px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'

// Clinic working hours start at 8:00 AM — same time format as appointments.
const TIME_OPTIONS = SHIFT_TIMES

function StaffSchedule({ page }) {
  const { can, user, userRole } = useAuth()
  const isAdmin = userRole === 'admin'
  const isClinician = ['doctor', 'nurse'].includes(userRole)
  const canManage = isAdmin || isClinician
  const schedules = useStaffSchedules()
  const eligibleStaff = useEligibleStaff()
  const { showToast } = useToast()
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [statusFilter, setStatusFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')

  const filtered = useMemo(() => {
    let list = schedules.data
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter((s) => s.user?.name?.toLowerCase().includes(q))
    }
    if (statusFilter !== 'All') {
      list = list.filter((s) => s.status === statusFilter)
    }
    if (roleFilter !== 'All') {
      list = list.filter((s) => s.user?.role === roleFilter)
    }
    return list
  }, [schedules.data, debouncedSearch, statusFilter, roleFilter])

  const pagination = usePagination(filtered, { pageSize: 10 })
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  useEffect(() => { resetPage() }, [debouncedSearch, statusFilter, roleFilter, resetPage])

  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)

  const [editing, setEditing] = useState(null)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const scheduleForm = useForm({
    defaultValues: { user_id: '', date: '', start_time: '', end_time: '', status: 'Available', notes: '' },
  })

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [availabilityTarget, setAvailabilityTarget] = useState(null)
  const [availabilityStatus, setAvailabilityStatus] = useState('Available')

  const canCreate = canManage && can('schedules.create')
  const canUpdate = canManage && can('schedules.update')
  const canDelete = isAdmin && can('schedules.delete')

  const staffOptions = useMemo(() => {
    const staff = eligibleStaff.data || []
    return isClinician ? staff.filter((member) => Number(member.id) === Number(user?.id)) : staff
  }, [eligibleStaff.data, isClinician, user?.id])
  const canEditSchedule = (schedule) => canUpdate && (isAdmin || Number(schedule.userId) === Number(user?.id))

  const roleOptions = useMemo(() => {
    const roles = new Set()
    schedules.data.forEach((s) => { if (s.user?.role) roles.add(s.user.role) })
    return [...roles].sort()
  }, [schedules.data])

  const openCreate = () => {
    if (!canCreate) return
    setCreateModalOpen(true)
  }

  const openEdit = (schedule) => {
    if (!canEditSchedule(schedule)) return
    setEditing(schedule)
    scheduleForm.reset({
      user_id: schedule.userId || '',
      date: schedule.date || '',
      start_time: normalizeTime(schedule.startTime),
      end_time: normalizeTime(schedule.endTime),
      status: schedule.status || 'Available',
      notes: schedule.notes || '',
    })
    setScheduleModalOpen(true)
  }

  const submitScheduleForm = (event) => {
    scheduleForm.handleSubmit(handleSaveSchedule, () => showToast('Please fill in all required fields.', 'error'))(event)
  }

  const handleSaveSchedule = async (values) => {
    if (busyRef.current || !editing || !canEditSchedule(editing)) return
    busyRef.current = true
    setBusy(true)
    try {
      const payload = {
        user_id: isClinician ? Number(user.id) : Number(values.user_id),
        date: values.date,
        start_time: values.start_time,
        end_time: values.end_time,
        status: values.status,
        notes: values.notes || null,
      }
      await schedules.updateSchedule(editing.id, payload)
      showToast('Schedule updated successfully.')
      setScheduleModalOpen(false)
    } catch (err) {
      showToast(err?.message || 'Failed to save the schedule.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const openDeleteModal = (schedule) => setDeleteTarget(schedule)

  const handleDelete = async () => {
    if (!deleteTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await schedules.deleteSchedule(deleteTarget.id)
      showToast('Schedule deleted successfully.')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to delete schedule.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const openAvailabilityModal = (schedule) => {
    if (!canEditSchedule(schedule)) return
    setAvailabilityTarget(schedule)
    setAvailabilityStatus(schedule.status === 'Unavailable' ? 'Unavailable' : 'Available')
  }

  const handleAvailability = async () => {
    if (!availabilityTarget || !canEditSchedule(availabilityTarget) || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await schedules.updateAvailability(availabilityTarget.id, availabilityStatus)
      showToast(`Availability updated to ${availabilityStatus}.`)
      setAvailabilityTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to update availability.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const availableCount = schedules.data.filter((s) => s.status === 'Available').length
  const unavailableCount = schedules.data.filter((s) => s.status === 'Unavailable').length

  return (
    <div>
      <section className="mb-5 flex items-center justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <p className={KICKER}>{page.eyebrow}</p>
          <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">{page.title}</h2>
          <span className="mt-[6px] block text-[13px] text-muted">{userRole === 'front_desk' ? "View doctors' and nurses' schedules, availability, and assigned shifts." : page.description}</span>
        </div>
        {canCreate && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={PRIMARY_BTN} onClick={openCreate}>+ Create Schedule</button>
          </div>
        )}
      </section>

      <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {[
          { label: 'All Staff', count: schedules.data.length, value: 'All' },
          { label: 'Available', count: availableCount, value: 'Available' },
          { label: 'Unavailable', count: unavailableCount, value: 'Unavailable' },
        ].map((chip) => (
          <button type="button" key={chip.value}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-[13px] font-bold transition ${
              statusFilter === chip.value ? 'border-primary bg-white text-primary shadow-sm' : 'border-line bg-surface text-ink hover:border-primary/30'
            }`}
            onClick={() => setStatusFilter(chip.value)}>
            <span>{chip.label}</span>
            <span className={`ml-2 inline-flex size-[22px] items-center justify-center rounded-full text-[11px] ${
              statusFilter === chip.value ? 'bg-primary text-white' : 'bg-bg text-muted'
            }`}>{chip.count}</span>
          </button>
        ))}
      </div>

      <div className={`${PANEL} p-5`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <input type="text" placeholder="Search by staff name..." className={SEARCH_INPUT} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={SELECT_INPUT} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="All">All Roles</option>
            {roleOptions.map((r) => (<option key={r} value={r}>{roleLabel(r)}</option>))}
          </select>
          {(search || statusFilter !== 'All' || roleFilter !== 'All') && (
            <button type="button" className={PILL} onClick={() => { resetSearch(); setStatusFilter('All'); setRoleFilter('All') }}>Clear filters</button>
          )}
          <RefreshingBadge refreshing={schedules.isRefetching} />
          <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">{filtered.length} of {schedules.data.length} staff</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line">
          {schedules.error ? (
            <ErrorState message={schedules.error} onRetry={schedules.refetch} />
          ) : (
            <table className={`${TABLE} min-w-[620px] max-sm:[&_th]:p-2 max-sm:[&_td]:p-2`}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.isLoading ? (
                  <TableSkeleton columns={5} />
                ) : pageItems.length === 0 ? (
                  <tr><td colSpan={5}>
                    <EmptyState message={search || statusFilter !== 'All' || roleFilter !== 'All' ? 'No staff match the current filters.' : 'No staff schedules found. Create one to get started.'} />
                  </td></tr>
                ) : (
                  pageItems.map((s) => (
                    <tr key={s.userId}
                      className="cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
                      tabIndex={0}
                      aria-label={`View schedule for ${s.user?.name || 'staff'}`}
                      aria-haspopup="dialog"
                      onClick={() => setSelectedStaff(s)}
                      onKeyDown={(event) => {
                        if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {
                          event.preventDefault()
                          setSelectedStaff(s)
                        }
                      }}
                    >
                      <td>
                        <strong className="font-bold text-ink">
                          {s.user?.name || '—'}
                        </strong>
                      </td>
                      <td className="text-muted">{roleLabel(s.user?.role)}</td>
                      <td className="text-muted">{s.department || '—'}</td>
                      <td className="max-w-[220px] break-all text-muted">{s.email || '—'}</td>
                      <td>
                        <span className={`inline-flex rounded-[4px] px-2 py-[3px] text-[11px] font-bold ${
                          s.status === 'Available' ? 'bg-[#dff6dd] text-[#1e5a1b]' : 'bg-[#ffebe0] text-[#a33c12]'
                        }`}>{s.status}</span>
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

      {selectedStaff && <StaffScheduleDetailsModal
        staff={selectedStaff}
        canEditSchedule={canEditSchedule}
        canDelete={canDelete}
        onEdit={(schedule) => { setSelectedStaff(null); openEdit(schedule) }}
        onAvailability={(schedule) => { setSelectedStaff(null); openAvailabilityModal(schedule) }}
        onDelete={(schedule) => { setSelectedStaff(null); openDeleteModal(schedule) }}
        onClose={() => setSelectedStaff(null)}
      />}

      {createModalOpen && <CreateStaffScheduleModal
        staffOptions={staffOptions}
        initialUserId={isClinician ? String(user.id) : ''}
        onSave={schedules.saveWeeklySchedule}
        onClose={() => setCreateModalOpen(false)}
        showToast={showToast}
      />}

      {scheduleModalOpen && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Edit schedule"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setScheduleModalOpen(false) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Edit Schedule</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setScheduleModalOpen(false) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={submitScheduleForm}>
                <label className={FORM_LABEL}>
                  Staff Member
                  <select className={FORM_FIELD} {...scheduleForm.register('user_id', { required: 'Staff member is required.' })} disabled={busy || !!editing}>
                    <option value="">Select staff member</option>
                    {staffOptions.map((u) => (<option key={u.id} value={u.id}>{u.name} ({roleLabel(u.role?.name)})</option>))}
                  </select>
                </label>
                <label className={FORM_LABEL}>
                  Date
                  <Controller
                    name="date"
                    control={scheduleForm.control}
                    rules={{ required: 'Date is required.' }}
                    render={({ field }) => <AppointmentDatePicker value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} min={todayISO()} className={FORM_FIELD} required disabled={busy} />}
                  />
                </label>
                <p className="m-0 text-[12px] text-muted">Clinic working hours are 8:00 AM to 5:00 PM.</p>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Start Time
                    <select className={FORM_FIELD} {...scheduleForm.register('start_time', { required: 'Start time is required.' })} disabled={busy}>
                      <option value="">Select start time</option>
                      {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  </label>
                  <label className={FORM_LABEL}>
                    End Time
                    <select className={FORM_FIELD} {...scheduleForm.register('end_time', { required: 'End time is required.' })} disabled={busy}>
                      <option value="">Select end time</option>
                      {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  </label>
                </div>
                <label className={FORM_LABEL}>
                  Status
                  <select className={FORM_FIELD} {...scheduleForm.register('status')} disabled={busy}>
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </label>
                <label className={FORM_LABEL}>
                  Notes
                  <input type="text" placeholder="Optional notes..." className={FORM_FIELD} {...scheduleForm.register('notes')} disabled={busy} />
                </label>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={() => setScheduleModalOpen(false)} disabled={busy}>Cancel</button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy && <InlineSpinner />}
                    {busy ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Delete schedule"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setDeleteTarget(null) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Delete Staff Schedule</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setDeleteTarget(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0">Are you sure you want to remove this schedule for <strong>{deleteTarget.user?.name}</strong> on <strong>{formatDate(deleteTarget.date)}</strong>? This action cannot be undone.</p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setDeleteTarget(null)} disabled={busy}>Cancel</button>
                <button type="button" className={`${BTN_DANGER} min-h-10 px-[14px] text-[13px]`} onClick={handleDelete} disabled={busy}>
                  {busy && <InlineSpinner />}
                  {busy ? 'Deleting...' : 'Delete Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {availabilityTarget && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label="Update availability"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setAvailabilityTarget(null) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Manage Staff Availability</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setAvailabilityTarget(null) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0 mb-3">Update availability for <strong>{availabilityTarget.user?.name}</strong> on <strong>{formatDate(availabilityTarget.date)}</strong> ({availabilityTarget.startTime} - {availabilityTarget.endTime}).</p>
              <label className={FORM_LABEL}>
                Availability Status
                <select className={FORM_FIELD} value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)} disabled={busy}>
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </label>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setAvailabilityTarget(null)} disabled={busy}>Cancel</button>
                <button type="button" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} onClick={handleAvailability} disabled={busy}>
                  {busy && <InlineSpinner />}
                  {busy ? 'Saving...' : 'Save Availability'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffSchedule
