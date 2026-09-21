import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useStaffSchedules, useEligibleStaff } from '../hooks/useStaffSchedules'
import { useForm } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { formatDate } from '../lib/format'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
  SIDEBAR_FORM, FORM_LABEL, FORM_FIELD, FORM_ROW,
  BTN_INFO, BTN_DANGER, BTN_PRIMARY,
} from '../lib/ui'
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

const TIME_OPTIONS = [
  '7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM',
  '7:00 PM','7:30 PM','8:00 PM',
]

function StaffSchedule({ page }) {
  const { can } = useAuth()
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
  const scheduleForm = useForm({
    defaultValues: { user_id: '', date: '', start_time: '', end_time: '', status: 'Available', notes: '' },
  })

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [availabilityTarget, setAvailabilityTarget] = useState(null)
  const [availabilityStatus, setAvailabilityStatus] = useState('Available')

  const canCreate = can('schedules.create')
  const canUpdate = can('schedules.update')
  const canDelete = can('schedules.delete')

  const staffOptions = useMemo(() => eligibleStaff.data || [], [eligibleStaff.data])

  const roleOptions = useMemo(() => {
    const roles = new Set()
    schedules.data.forEach((s) => { if (s.user?.role) roles.add(s.user.role) })
    return [...roles].sort()
  }, [schedules.data])

  const openCreate = () => {
    setEditing(null)
    scheduleForm.reset({ user_id: '', date: '', start_time: '', end_time: '', status: 'Available', notes: '' })
    setScheduleModalOpen(true)
  }

  const openEdit = (schedule) => {
    setEditing(schedule)
    scheduleForm.reset({
      user_id: schedule.userId || '',
      date: schedule.date || '',
      start_time: schedule.startTime || '',
      end_time: schedule.endTime || '',
      status: schedule.status || 'Available',
      notes: schedule.notes || '',
    })
    setScheduleModalOpen(true)
  }

  const submitScheduleForm = (event) => {
    scheduleForm.handleSubmit(handleSaveSchedule, () => showToast('Please fill in all required fields.', 'error'))(event)
  }

  const handleSaveSchedule = async (values) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const payload = {
        user_id: Number(values.user_id),
        date: values.date,
        start_time: values.start_time,
        end_time: values.end_time,
        status: values.status,
        notes: values.notes || null,
      }
      if (editing) {
        await schedules.updateSchedule(editing.id, payload)
        showToast('Schedule updated successfully.')
      } else {
        await schedules.createSchedule(payload)
        showToast('Schedule created successfully.')
      }
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
    setAvailabilityTarget(schedule)
    setAvailabilityStatus(schedule.status === 'Unavailable' ? 'Unavailable' : 'Available')
  }

  const handleAvailability = async () => {
    if (!availabilityTarget || busyRef.current) return
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
          <span className="mt-[6px] block text-[13px] text-muted">{page.description}</span>
        </div>
        {canCreate && (
          <button type="button" className={PRIMARY_BTN} onClick={openCreate}>+ Create Schedule</button>
        )}
      </section>

      <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {[
          { label: 'All Schedules', count: schedules.data.length, value: 'All' },
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
            {roleOptions.map((r) => (<option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>))}
          </select>
          {(search || statusFilter !== 'All' || roleFilter !== 'All') && (
            <button type="button" className={PILL} onClick={() => { resetSearch(); setStatusFilter('All'); setRoleFilter('All') }}>Clear filters</button>
          )}
          <RefreshingBadge refreshing={schedules.isRefetching} />
          <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">{filtered.length} of {schedules.data.length} schedules</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line">
          {schedules.error ? (
            <ErrorState message={schedules.error} onRetry={schedules.refetch} />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Date</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.isLoading ? (
                  <TableSkeleton columns={7} />
                ) : pageItems.length === 0 ? (
                  <tr><td colSpan="7">
                    <EmptyState message={search || statusFilter !== 'All' || roleFilter !== 'All' ? 'No schedules match the current filters.' : 'No schedules found. Create one to get started.'} />
                  </td></tr>
                ) : (
                  pageItems.map((s) => (
                    <tr key={s.id}>
                      <td><strong className="font-bold text-ink">{s.user?.name || '—'}</strong></td>
                      <td className="text-muted">{s.user?.role ? s.user.role.charAt(0).toUpperCase() + s.user.role.slice(1) : '—'}</td>
                      <td className="text-[12.5px] text-muted">{formatDate(s.date)}</td>
                      <td className="text-[12.5px] text-muted">{s.startTime}</td>
                      <td className="text-[12.5px] text-muted">{s.endTime}</td>
                      <td>
                        <span className={`inline-flex rounded-[4px] px-2 py-[3px] text-[11px] font-bold ${
                          s.status === 'Available' ? 'bg-[#dff6dd] text-[#1e5a1b]' : 'bg-[#ffebe0] text-[#a33c12]'
                        }`}>{s.status}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-[6px]">
                          {canUpdate && (
                            <>
                              <button type="button" className={BTN_INFO} onClick={() => openEdit(s)}>Edit</button>
                              <button type="button" className={BTN_PRIMARY} onClick={() => openAvailabilityModal(s)}>
                                {s.status === 'Available' ? 'Mark Unavailable' : 'Mark Available'}
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button type="button" className={BTN_DANGER} onClick={() => openDeleteModal(s)}>Delete</button>
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

      {scheduleModalOpen && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-label={editing ? 'Edit schedule' : 'Create schedule'}
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setScheduleModalOpen(false) }}>
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{editing ? 'Edit Schedule' : 'Create Schedule'}</h3>
              <button type="button" className={MODAL_CLOSE} onClick={() => { if (!busy) setScheduleModalOpen(false) }}>✕</button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={submitScheduleForm}>
                <label className={FORM_LABEL}>
                  Staff Member
                  <select className={FORM_FIELD} {...scheduleForm.register('user_id', { required: 'Staff member is required.' })} disabled={busy || !!editing}>
                    <option value="">Select staff member</option>
                    {staffOptions.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.role?.name ? u.role.name.charAt(0).toUpperCase() + u.role.name.slice(1) : ''})</option>))}
                  </select>
                </label>
                <label className={FORM_LABEL}>
                  Date
                  <input type="date" className={FORM_FIELD} {...scheduleForm.register('date', { required: 'Date is required.' })} disabled={busy} />
                </label>
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
                    {busy ? 'Saving...' : editing ? 'Save Changes' : 'Create Schedule'}
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
