import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { useActivityLogs } from '../hooks/useActivityLogs'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { PANEL, KICKER, FORM_LABEL, FORM_FIELD, FORM_ROW, PRIMARY_BTN, TABLE } from '../lib/ui'
import RefreshingBadge from '../components/RefreshingBadge'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'
import Pagination from '../components/Pagination'

function SettingsAudit({ page }) {
  const { can } = useAuth()
  const { showToast } = useToast()
  const settings = useSettings()
  const activityLogs = useActivityLogs()
  const { search, setSearch, debouncedSearch } = useSearch({ debounceMs: 300 })

  const [formOverride, setFormOverride] = useState(null)
  const form = formOverride ?? settings.data ?? {}
  const [saving, setSaving] = useState(false)
  const busyRef = useRef(false)

  const handleChange = (field, value) =>
    setFormOverride((prev) => ({ ...(prev ?? settings.data ?? {}), [field]: value }))

  const handleSave = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setSaving(true)
    try {
      await settings.updateSettings(form)
      showToast('Settings updated successfully')
      setFormOverride(null)
    } catch (err) {
      showToast(err?.message || 'Failed to update settings', 'error')
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  const filteredLogs = activityLogs.data.filter((log) => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return log.action?.toLowerCase().includes(q) || log.user?.toLowerCase().includes(q)
  })

  const pagination = usePagination(filteredLogs, { pageSize: 10 })
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  useEffect(() => { resetPage() }, [debouncedSearch, resetPage])

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div>
          <p className={KICKER}>{page.eyebrow}</p>
          <h1 className="m-0 text-[clamp(22px,4vw,28px)] leading-tight text-ink">{page.title}</h1>
          <p className="mt-1 text-muted">{page.description}</p>
        </div>
        <RefreshingBadge isRefetching={settings.isRefetching || activityLogs.isRefetching} />
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* System Settings Form */}
        <div className={PANEL}>
          <h2 className="mb-4 text-lg font-semibold text-ink">System Settings</h2>
          {settings.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted/30" />
              ))}
            </div>
          ) : settings.error ? (
            <ErrorState message={settings.error} onRetry={settings.refetch} />
          ) : (
            <div className="space-y-4">
              <div className={FORM_ROW}>
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Clinic Name</label>
                  <input
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    value={form.clinicName || ''}
                    onChange={(e) => handleChange('clinicName', e.target.value)}
                  />
                </div>
              </div>
              <div className={FORM_ROW}>
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Clinic Address</label>
                  <input
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    value={form.clinicAddress || ''}
                    onChange={(e) => handleChange('clinicAddress', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Phone</label>
                  <input
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    value={form.clinicPhone || ''}
                    onChange={(e) => handleChange('clinicPhone', e.target.value)}
                  />
                </div>
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Email</label>
                  <input
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    value={form.clinicEmail || ''}
                    onChange={(e) => handleChange('clinicEmail', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Operating Hours</label>
                  <input
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    value={form.clinicHours || ''}
                    onChange={(e) => handleChange('clinicHours', e.target.value)}
                  />
                </div>
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Operating Days</label>
                  <input
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                    value={form.clinicDays || ''}
                    onChange={(e) => handleChange('clinicDays', e.target.value)}
                  />
                </div>
              </div>
              <div className={FORM_FIELD}>
                <label className={FORM_LABEL}>Emergency Hotline</label>
                <input
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                  value={form.emergencyHotline || ''}
                  onChange={(e) => handleChange('emergencyHotline', e.target.value)}
                />
              </div>
              <div className={FORM_FIELD}>
                <label className={FORM_LABEL}>Description</label>
                <textarea
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                  rows={3}
                  value={form.clinicDescription || ''}
                  onChange={(e) => handleChange('clinicDescription', e.target.value)}
                />
              </div>
              {can('settings.update') && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`${PRIMARY_BTN} ${saving ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity Logs */}
        <div className={PANEL}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Activity Logs</h2>
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-[200px] rounded-lg border border-line bg-white px-3 py-1.5 text-sm"
            />
          </div>
          {activityLogs.isLoading ? (
            <TableSkeleton columns={3} />
          ) : activityLogs.error ? (
            <ErrorState message={activityLogs.error} onRetry={activityLogs.refetch} />
          ) : filteredLogs.length === 0 ? (
            <EmptyState message="No activity logs found." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className={TABLE}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((log) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap text-muted">{log.time}</td>
                        <td className="whitespace-nowrap font-medium">{log.user}</td>
                        <td className="text-sm text-muted">{log.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                goToPage={goToPage}
              />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default SettingsAudit
