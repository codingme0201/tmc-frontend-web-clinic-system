import { useEffect, useMemo, useState } from 'react'
import { useAuditLogs } from '../hooks/useAuditLogs'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import {
  PILL, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
} from '../lib/ui'
import Pagination from '../components/Pagination'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'
import StatusBadge from '../components/StatusBadge'

const MODAL_CARD = 'flex max-h-[90vh] w-[min(560px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'

const MODULE_OPTIONS = [
  'Appointments',
  'Consultations',
  'Medical Records',
  'Medical Certificates',
  'Prescriptions',
  'Patients',
  'Users',
  'Roles & Permissions',
  'System Settings',
  'Notifications',
  'Schedules',
  'Clinic Calendar',
  'System',
]

function AuditLogs({ page }) {
  const auditLogs = useAuditLogs()
  const { data: filtered, updateFilter, resetFilters } = auditLogs
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: 300 })

  const [moduleFilter, setModuleFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [clinicalOnly, setClinicalOnly] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  // Sync debounced search to the store filters
  useEffect(() => {
    updateFilter('search', debouncedSearch)
  }, [debouncedSearch, updateFilter])

  // Sync module filter
  useEffect(() => {
    updateFilter('module', moduleFilter === 'All' ? '' : moduleFilter)
  }, [moduleFilter, updateFilter])

  // Sync date range
  useEffect(() => {
    updateFilter('from', dateFrom)
  }, [dateFrom, updateFilter])

  useEffect(() => {
    updateFilter('to', dateTo)
  }, [dateTo, updateFilter])

  // Sync clinical filter
  useEffect(() => {
    updateFilter('clinical', clinicalOnly)
  }, [clinicalOnly, updateFilter])

  const pagination = usePagination(filtered, { pageSize: 10 })
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  useEffect(() => {
    resetPage()
  }, [debouncedSearch, moduleFilter, dateFrom, dateTo, clinicalOnly, resetPage])

  const handleClearFilters = () => {
    resetSearch()
    setModuleFilter('All')
    setDateFrom('')
    setDateTo('')
    setClinicalOnly(false)
    resetFilters()
  }

  const hasActiveFilters = search || moduleFilter !== 'All' || dateFrom || dateTo || clinicalOnly

  // Module counts for summary chips
  const moduleCounts = useMemo(() => {
    const counts = {}
    for (const log of filtered) {
      const mod = log.module || 'Other'
      counts[mod] = (counts[mod] || 0) + 1
    }
    return counts
  }, [filtered])

  const formatDateTime = (isoString) => {
    if (!isoString) return '—'
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } catch {
      return isoString
    }
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
        <RefreshingBadge refreshing={auditLogs.isRefetching} />
      </section>

      {/* Summary chips */}
      <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {[
          { label: 'All Logs', count: filtered.length, value: 'All' },
          ...MODULE_OPTIONS
            .filter((m) => moduleCounts[m])
            .slice(0, 5)
            .map((m) => ({ label: m, count: moduleCounts[m], value: m })),
        ].map((chip) => (
          <button
            type="button"
            key={chip.value}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-[13px] font-bold transition ${
              (chip.value === 'All' && moduleFilter === 'All') || moduleFilter === chip.value
                ? 'border-primary bg-white text-primary shadow-sm'
                : 'border-line bg-surface text-ink hover:border-primary/30'
            }`}
            onClick={() => setModuleFilter(chip.value)}
          >
            <span>{chip.label}</span>
            <span
              className={`ml-2 inline-flex size-[22px] items-center justify-center rounded-full text-[11px] ${
                (chip.value === 'All' && moduleFilter === 'All') || moduleFilter === chip.value
                  ? 'bg-primary text-white'
                  : 'bg-bg text-muted'
              }`}
            >
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {/* Audit logs panel */}
      <div className={`${PANEL} p-5`}>
        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search by action or user..."
            className={SEARCH_INPUT}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={SELECT_INPUT}
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="All">All Modules</option>
            {MODULE_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={SEARCH_INPUT}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
            />
            <span className="text-[12px] text-muted">to</span>
            <input
              type="date"
              className={SEARCH_INPUT}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
            />
          </div>
          <button
            type="button"
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-extrabold transition-all duration-150 ${
              clinicalOnly
                ? 'border border-danger bg-danger/10 text-danger ring-2 ring-danger/20'
                : 'border border-line bg-white text-muted hover:border-line-strong'
            }`}
            onClick={() => setClinicalOnly((prev) => !prev)}
          >
            <span className="size-2 rounded-full bg-danger" />
            Sensitive Records Only
          </button>
          {hasActiveFilters && (
            <button type="button" className={PILL} onClick={handleClearFilters}>
              Clear filters
            </button>
          )}
          <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">
            {filtered.length} log{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-line">
          {auditLogs.error ? (
            <ErrorState message={auditLogs.error} onRetry={auditLogs.refetch} />
          ) : (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.isLoading ? (
                  <TableSkeleton columns={6} />
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <EmptyState
                        message={
                          hasActiveFilters
                            ? 'No logs match the current filters.'
                            : 'No audit logs found.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  pageItems.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap text-[12.5px] text-muted">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td>
                        <strong className="font-bold text-ink">{log.user || '—'}</strong>
                      </td>
                      <td>
                        <span className="text-[12.5px] capitalize text-muted">
                          {log.role || '—'}
                        </span>
                      </td>
                      <td>
                        {log.module ? (
                          <StatusBadge status={log.module} />
                        ) : (
                          <span className="text-[12.5px] text-muted">—</span>
                        )}
                      </td>
                      <td className="max-w-[320px] truncate text-[12.5px] text-muted">
                        {log.action}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="cursor-pointer rounded-md border-0 bg-bg px-2 py-1 text-[12px] font-extrabold text-primary transition-all duration-200 hover:bg-[#dbeae5]"
                          onClick={() => setSelectedLog(log)}
                        >
                          View
                        </button>
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

      {/* ================= DETAIL MODAL ================= */}
      {selectedLog && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label="Audit log detail"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null)
          }}
        >
          <div className={MODAL_CARD}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Audit Log Detail</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="space-y-4">
                <div>
                  <span className="block text-[11px] font-extrabold uppercase text-muted-soft">Timestamp</span>
                  <span className="text-[13px] text-ink">{formatDateTime(selectedLog.createdAt)}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-extrabold uppercase text-muted-soft">User</span>
                  <span className="text-[13px] text-ink">{selectedLog.user || '—'}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-extrabold uppercase text-muted-soft">Role</span>
                  <span className="text-[13px] capitalize text-ink">{selectedLog.role || '—'}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-extrabold uppercase text-muted-soft">Module</span>
                  {selectedLog.module ? (
                    <StatusBadge status={selectedLog.module} />
                  ) : (
                    <span className="text-[13px] text-muted">—</span>
                  )}
                </div>
                <div>
                  <span className="block text-[11px] font-extrabold uppercase text-muted-soft">Action Performed</span>
                  <p className="mt-1 whitespace-pre-wrap rounded-md border border-line bg-bg p-3 text-[13px] text-ink">
                    {selectedLog.action}
                  </p>
                </div>
                <div>
                  <span className="block text-[11px] font-extrabold uppercase text-muted-soft">Log Entry ID</span>
                  <span className="text-[13px] text-muted">#{selectedLog.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLogs
