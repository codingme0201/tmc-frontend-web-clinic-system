import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { roleLabel } from '../lib/clinic'
import { useForm, useWatch } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { formatDistanceToNow } from 'date-fns'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
  SIDEBAR_FORM, FORM_LABEL, FORM_FIELD,
  BTN_INFO, BTN_DANGER, BTN_SUCCESS,
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

const TYPE_OPTIONS = ['All', 'system', 'appointment', 'patient', 'clinic']

const TYPE_LABELS = {
  system: 'System',
  appointment: 'Appointment',
  patient: 'Patient',
  clinic: 'Clinic',
}

const TYPE_DOT_COLORS = {
  system: 'bg-blue-500',
  appointment: 'bg-amber-500',
  patient: 'bg-emerald-500',
  clinic: 'bg-purple-500',
}

function Notifications({ page }) {
  const { can } = useAuth()
  const canSend = can('notifications.send')
  const canManage = can('notifications.manage')
  const notifications = useNotifications('page', { canSend })
  const { showToast } = useToast()
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })
  const [typeFilter, setTypeFilter] = useState('All')
  // 'inbox' = notifications I received; 'sent' = notifications I sent.
  const [view, setView] = useState('inbox')
  const isSentView = view === 'sent'
  const source = isSentView ? notifications.sent : notifications.data

  const filtered = useMemo(() => {
    let list = source
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (n) => n.title?.toLowerCase().includes(q)
          || n.message?.toLowerCase().includes(q)
          || n.recipient?.name?.toLowerCase().includes(q),
      )
    }
    if (typeFilter === '_unread') {
      list = list.filter((n) => !n.isRead)
    } else if (typeFilter !== 'All') {
      list = list.filter((n) => n.type === typeFilter)
    }
    return list
  }, [source, debouncedSearch, typeFilter])

  const pagination = usePagination(filtered, { pageSize: 10 })
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  useEffect(() => {
    resetPage()
  }, [debouncedSearch, typeFilter, view, resetPage])

  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)

  // Send Notification modal
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const sendForm = useForm({
    defaultValues: { userId: '', title: '', message: '', type: 'system', category: '', source: '' },
  })

  // Detail modal
  const [detailNotification, setDetailNotification] = useState(null)

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Recipient picker: searchable list of active users grouped by role.
  const [recipientSearch, setRecipientSearch] = useState('')
  const selectedRecipientId = useWatch({ control: sendForm.control, name: 'userId' })
  const recipientGroups = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase()
    const matches = notifications.recipients.filter((u) => !q
      || u.name.toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
      || (u.patientId || '').toLowerCase().includes(q)
      || String(u.id) === String(selectedRecipientId))
    const order = ['student', 'doctor', 'nurse', 'front_desk', 'admin']
    const roles = [...new Set(matches.map((u) => u.role || 'other'))]
      .sort((a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)))
    return roles.map((role) => ({ role, members: matches.filter((u) => (u.role || 'other') === role) }))
  }, [notifications.recipients, recipientSearch, selectedRecipientId])
  const selectedRecipient = notifications.recipients.find((u) => String(u.id) === String(selectedRecipientId)) || null

  // Stats
  const allCount = source.length
  const unreadCount = source.filter((n) => !n.isRead).length
  const systemCount = source.filter((n) => n.type === 'system').length
  const appointmentCount = source.filter((n) => n.type === 'appointment').length
  const patientCount = source.filter((n) => n.type === 'patient').length

  // ---------- Send Notification -------------------------------------------------

  const openSendModal = () => {
    sendForm.reset({ userId: '', title: '', message: '', type: 'system', category: '', source: '' })
    setRecipientSearch('')
    setSendModalOpen(true)
  }

  const submitSendForm = (event) => {
    sendForm.handleSubmit(handleSendNotification, () => showToast('Please fill in all required fields.', 'error'))(event)
  }

  const handleSendNotification = async (values) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const sent = await notifications.sendNotification({
        userId: Number(values.userId),
        title: values.title.trim(),
        message: values.message.trim(),
        type: values.type,
        category: values.category,
        source: values.source,
      })
      showToast(`Notification sent to ${sent?.recipient?.name || selectedRecipient?.name || 'the selected user'}.`)
      setView('sent')
      setSendModalOpen(false)
    } catch (err) {
      showToast(err?.message || 'Failed to send notification.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Mark as Read ------------------------------------------------------

  const handleMarkAsRead = async (notification) => {
    if (busyRef.current || notification.isRead) return
    busyRef.current = true
    setBusy(true)
    try {
      await notifications.markAsRead(notification.id)
      showToast('Notification marked as read.')
    } catch (err) {
      showToast(err?.message || 'Failed to mark as read.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Mark All as Read --------------------------------------------------

  const handleMarkAllAsRead = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await notifications.markAllAsRead()
      showToast('All notifications marked as read.')
    } catch (err) {
      showToast(err?.message || 'Failed to mark all as read.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Delete ------------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await notifications.deleteNotification(deleteTarget.id)
      showToast('Notification deleted.')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to delete notification.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Render ------------------------------------------------------------

  return (
    <div>
      {/* Page header */}
      <section className="mb-5 flex items-center justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <p className={KICKER}>{page.eyebrow}</p>
          <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">{page.title}</h2>
          <span className="mt-[6px] block text-[13px] text-muted">{page.description}</span>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && !isSentView && (
            <button type="button" className={PILL} onClick={handleMarkAllAsRead} disabled={busy}>
              Mark All Read
            </button>
          )}
          {canSend && (
            <button type="button" className={PRIMARY_BTN} onClick={openSendModal}>
              + Send Notification
            </button>
          )}
        </div>
      </section>

      {canSend && (
        <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="Notification folders">
          {[
            { id: 'inbox', label: 'Received' },
            { id: 'sent', label: 'Sent' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={view === tab.id}
              className={`cursor-pointer rounded-lg border-0 px-4 py-2 text-[13px] font-extrabold transition ${
                view === tab.id ? 'bg-primary text-white shadow-xs' : 'bg-transparent text-muted hover:text-primary'
              }`}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Status summary chips */}
      <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {[
          { label: 'All', count: allCount, value: 'All' },
          { label: 'Unread', count: unreadCount, value: '_unread' },
          { label: 'System', count: systemCount, value: 'system' },
          { label: 'Appointment', count: appointmentCount, value: 'appointment' },
          { label: 'Patient', count: patientCount, value: 'patient' },
        ].map((chip) => (
          <button
            type="button"
            key={chip.value}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-[13px] font-bold transition ${
              typeFilter === chip.value || (chip.value === '_unread' && typeFilter === '_unread')
                ? 'border-primary bg-white text-primary shadow-sm'
                : 'border-line bg-surface text-ink hover:border-primary/30'
            }`}
            onClick={() => setTypeFilter(chip.value === '_unread' ? '_unread' : chip.value)}
          >
            <span>{chip.label}</span>
            <span
              className={`ml-2 inline-flex size-[22px] items-center justify-center rounded-full text-[11px] ${
                typeFilter === chip.value || (chip.value === '_unread' && typeFilter === '_unread')
                  ? 'bg-primary text-white'
                  : 'bg-bg text-muted'
              }`}
            >
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications panel */}
      <div className={`${PANEL} p-5`}>
        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search notifications..."
            className={SEARCH_INPUT}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={SELECT_INPUT}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t === 'All' ? 'All Types' : TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
          {(search || typeFilter !== 'All') && (
            <button
              type="button"
              className={PILL}
              onClick={() => {
                resetSearch()
                setTypeFilter('All')
              }}
            >
              Clear filters
            </button>
          )}
          <RefreshingBadge refreshing={notifications.isRefetching} />
          <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-line">
          {(isSentView ? notifications.sentError : notifications.error) ? (
            <ErrorState
              message={isSentView ? notifications.sentError : notifications.error}
              onRetry={isSentView ? notifications.refetchSent : notifications.refetch}
            />
          ) : (isSentView ? notifications.sentLoading : notifications.isLoading) ? (
            <TableSkeleton columns={6} />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}></th>
                  <th>Title</th>
                  {isSentView && <th>Recipient</th>}
                  <th>Message</th>
                  <th>Type</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={isSentView ? 7 : 6}>
                      <EmptyState
                        message={
                          search || typeFilter !== 'All'
                            ? 'No notifications match the current filters.'
                            : isSentView ? 'You have not sent any notifications yet.' : 'No notifications yet.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  pageItems.map((notification) => (
                    <tr
                      key={notification.id}
                      className={!notification.isRead && !isSentView ? 'bg-blue-50/40' : ''}
                    >
                      <td>
                        <span className={`inline-block size-2.5 rounded-full ${TYPE_DOT_COLORS[notification.type] || 'bg-gray-400'}`} />
                      </td>
                      <td>
                        <strong className={`font-bold ${!notification.isRead ? 'text-ink' : 'text-muted'}`}>
                          {notification.title}
                        </strong>
                      </td>
                      {isSentView && (
                        <td className="whitespace-nowrap text-[13px]">
                          <strong className="block text-ink">{notification.recipient?.name || '—'}</strong>
                          <span className="text-[11.5px] text-muted">
                            {notification.recipient?.role ? roleLabel(notification.recipient.role) : ''}
                            {' · '}{notification.isRead ? 'Read' : 'Unread'}
                          </span>
                        </td>
                      )}
                      <td className="max-w-[300px] truncate text-[13px] text-muted">
                        {notification.message}
                      </td>
                      <td>
                        <span className="inline-block rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-bold text-muted">
                          {TYPE_LABELS[notification.type] || notification.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-[12.5px] text-muted">
                        {notification.createdAt
                          ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                          : '—'}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-[6px]">
                          <button
                            type="button"
                            className={BTN_INFO}
                            onClick={() => setDetailNotification(notification)}
                          >
                            View
                          </button>
                          {!notification.isRead && !isSentView && (
                            <button
                              type="button"
                              className={BTN_SUCCESS}
                              onClick={() => handleMarkAsRead(notification)}
                              disabled={busy}
                            >
                              Read
                            </button>
                          )}
                          {(isSentView ? canSend : canManage) && (
                            <button
                              type="button"
                              className={BTN_DANGER}
                              onClick={() => setDeleteTarget(notification)}
                            >
                              Delete
                            </button>
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

      {/* ================= SEND NOTIFICATION MODAL ================= */}
      {sendModalOpen && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Send notification"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setSendModalOpen(false)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Send Notification</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => { if (!busy) setSendModalOpen(false) }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={submitSendForm}>
                <div className={FORM_LABEL}>
                  Recipient
                  <input
                    type="search"
                    className={FORM_FIELD}
                    placeholder="Search by name, email or student ID..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    disabled={busy || notifications.recipientsLoading}
                    aria-label="Search recipients"
                  />
                  <select
                    className={FORM_FIELD}
                    size={6}
                    {...sendForm.register('userId', { required: 'Select the user who should receive this notification.' })}
                    disabled={busy || notifications.recipientsLoading}
                    aria-label="Recipient"
                  >
                    {recipientGroups.map((group) => (
                      <optgroup key={group.role} label={roleLabel(group.role)}>
                        {group.members.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}{u.patientId ? ` · ${u.patientId}` : ''}{u.email ? ` · ${u.email}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <span className="text-[12px] font-bold text-muted">
                    {notifications.recipientsError
                      ? notifications.recipientsError
                      : notifications.recipientsLoading
                        ? 'Loading users…'
                        : selectedRecipient
                          ? `Sending to ${selectedRecipient.name} (${roleLabel(selectedRecipient.role)})`
                          : recipientGroups.length === 0
                            ? 'No users match your search.'
                            : 'Select one user from the list.'}
                  </span>
                  {sendForm.formState.errors.userId && (
                    <span className="text-[12px] font-bold text-danger">{sendForm.formState.errors.userId.message}</span>
                  )}
                </div>
                <label className={FORM_LABEL}>
                  Title
                  <input
                    type="text"
                    placeholder="Notification title"
                    className={FORM_FIELD}
                    {...sendForm.register('title', { required: 'Title is required.' })}
                    disabled={busy}
                  />
                </label>
                <label className={FORM_LABEL}>
                  Message
                  <textarea
                    placeholder="Notification message..."
                    className={FORM_FIELD}
                    rows={4}
                    {...sendForm.register('message', { required: 'Message is required.' })}
                    disabled={busy}
                  />
                </label>
                <label className={FORM_LABEL}>
                  Type
                  <select
                    className={FORM_FIELD}
                    {...sendForm.register('type')}
                    disabled={busy}
                  >
                    {TYPE_OPTIONS.filter((t) => t !== 'All').map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button type="button" className={PILL} onClick={() => setSendModalOpen(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy && <InlineSpinner />}
                    {busy ? 'Sending...' : 'Send Notification'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= NOTIFICATION DETAIL MODAL ================= */}
      {detailNotification && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Notification detail"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailNotification(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{detailNotification.title}</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => setDetailNotification(null)}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="mb-4 flex items-center gap-3">
                <span className={`inline-block size-3 rounded-full ${TYPE_DOT_COLORS[detailNotification.type] || 'bg-gray-400'}`} />
                <span className="rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-bold text-muted">
                  {TYPE_LABELS[detailNotification.type] || detailNotification.type}
                </span>
                {detailNotification.source && (
                  <span className="text-[12px] text-muted">from {detailNotification.source}</span>
                )}
                <span className={`ml-auto text-[12px] font-bold ${detailNotification.isRead ? 'text-muted' : 'text-primary'}`}>
                  {detailNotification.isRead ? 'Read' : 'Unread'}
                </span>
              </div>
              <p className="mt-0 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                {detailNotification.message}
              </p>
              <p className="mb-0 mt-4 text-[12px] text-muted">
                {detailNotification.createdAt
                  ? `Received ${formatDistanceToNow(new Date(detailNotification.createdAt), { addSuffix: true })}`
                  : ''}
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                {!detailNotification.isRead && (
                  <button
                    type="button"
                    className={`${BTN_SUCCESS} min-h-10 px-[14px] text-[13px]`}
                    onClick={() => {
                      handleMarkAsRead(detailNotification)
                      setDetailNotification({ ...detailNotification, isRead: true })
                    }}
                    disabled={busy}
                  >
                    {busy && <InlineSpinner />}
                    Mark as Read
                  </button>
                )}
                <button type="button" className={PILL} onClick={() => setDetailNotification(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteTarget && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Delete notification"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDeleteTarget(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Delete Notification</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => { if (!busy) setDeleteTarget(null) }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0">
                Are you sure you want to delete <strong>{deleteTarget.title}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button type="button" className={PILL} onClick={() => setDeleteTarget(null)} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${BTN_DANGER} min-h-10 px-[14px] text-[13px]`}
                  onClick={handleDelete}
                  disabled={busy}
                >
                  {busy && <InlineSpinner />}
                  {busy ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications
