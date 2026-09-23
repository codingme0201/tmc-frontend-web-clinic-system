import { useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { PANEL, KICKER, FORM_LABEL, FORM_FIELD, FORM_ROW, PRIMARY_BTN } from '../lib/ui'
import RefreshingBadge from '../components/RefreshingBadge'
import { ErrorState } from '../components/AsyncState'

function SettingsAudit({ page }) {
  const { can } = useAuth()
  const { showToast } = useToast()
  const settings = useSettings()

  const [formOverride, setFormOverride] = useState(null)
  const form = formOverride ?? settings.data ?? {}
  const [saving, setSaving] = useState(false)
  const busyRef = useRef(false)

  const isDirty = formOverride !== null

  const handleChange = (field, value) =>
    setFormOverride((prev) => ({ ...(prev ?? settings.data ?? {}), [field]: value }))

  const handleReset = () => {
    setFormOverride(null)
  }

  const handleSave = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setSaving(true)
    try {
      await settings.updateSettings(form)
      showToast('System settings updated successfully')
      setFormOverride(null)
    } catch (err) {
      showToast(err?.message || 'Failed to update settings', 'error')
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div>
          <p className={KICKER}>{page.eyebrow}</p>
          <h1 className="m-0 text-[clamp(22px,4vw,28px)] leading-tight text-ink font-extrabold">{page.title}</h1>
          <p className="mt-1 text-muted text-sm">{page.description}</p>
        </div>
        <RefreshingBadge isRefetching={settings.isRefetching} />
      </header>

      {settings.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={`${PANEL} space-y-4`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/20" />
            ))}
          </div>
          <div className={`${PANEL} h-64 animate-pulse rounded-xl bg-muted/20`} />
        </div>
      ) : settings.error ? (
        <ErrorState message={settings.error} onRetry={settings.refetch} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Main Settings Form Panels */}
          <div className="space-y-6">
            {/* Panel 1: Clinic Profile & Identity */}
            <div className={PANEL}>
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-ink">Clinic Profile & Identity</h2>
                    <p className="text-xs text-muted">Primary name, location, and overview displayed on student portals.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={FORM_ROW}>
                  <div className={FORM_FIELD}>
                    <label className={FORM_LABEL}>Clinic Official Name</label>
                    <input
                      className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      value={form.clinicName || ''}
                      onChange={(e) => handleChange('clinicName', e.target.value)}
                      placeholder="e.g. TMC CareLink Student Health Clinic"
                    />
                  </div>
                </div>

                <div className={FORM_ROW}>
                  <div className={FORM_FIELD}>
                    <label className={FORM_LABEL}>Clinic Physical Location / Address</label>
                    <input
                      className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      value={form.clinicAddress || ''}
                      onChange={(e) => handleChange('clinicAddress', e.target.value)}
                      placeholder="e.g. Tagum Norte, Trinidad, Bohol, Philippines"
                    />
                  </div>
                </div>

                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Description / Purpose Statement</label>
                  <textarea
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    rows={3}
                    value={form.clinicDescription || ''}
                    onChange={(e) => handleChange('clinicDescription', e.target.value)}
                    placeholder="Brief description of clinical services provided to university constituents..."
                  />
                </div>
              </div>
            </div>

            {/* Panel 2: Contact & Emergency Communications */}
            <div className={PANEL}>
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-ink">Contact & Emergency Channels</h2>
                    <p className="text-xs text-muted">Direct communication lines for routine inquiries and emergency assistance.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Landline / Mobile Phone</label>
                  <input
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    value={form.clinicPhone || ''}
                    onChange={(e) => handleChange('clinicPhone', e.target.value)}
                    placeholder="e.g. (02) 8632-1234 / 0917-000-0000"
                  />
                </div>
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Official Clinic Email</label>
                  <input
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    value={form.clinicEmail || ''}
                    onChange={(e) => handleChange('clinicEmail', e.target.value)}
                    placeholder="clinic@tmc.edu.ph"
                  />
                </div>
              </div>

              <div className={`${FORM_FIELD} mt-4`}>
                <label className={FORM_LABEL}>24/7 Campus Emergency Hotline</label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 py-2.5 pl-10 text-sm font-semibold text-ink transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    value={form.emergencyHotline || ''}
                    onChange={(e) => handleChange('emergencyHotline', e.target.value)}
                    placeholder="e.g. 911 / Campus Security: (02) 8000-9999"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-xs">
                    SOS
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-muted">This hotline is prominently featured in student medical emergency banners.</p>
              </div>
            </div>

            {/* Panel 3: Operating Schedule & Availability */}
            <div className={PANEL}>
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-teal-500/10 text-teal-600">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-ink">Operating Schedule</h2>
                    <p className="text-xs text-muted">Weekly regular clinic operational schedule for consultations and check-ups.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Operating Days</label>
                  <input
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    value={form.clinicDays || ''}
                    onChange={(e) => handleChange('clinicDays', e.target.value)}
                    placeholder="e.g. Monday - Friday"
                  />
                </div>
                <div className={FORM_FIELD}>
                  <label className={FORM_LABEL}>Operating Hours</label>
                  <input
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    value={form.clinicHours || ''}
                    onChange={(e) => handleChange('clinicHours', e.target.value)}
                    placeholder="e.g. 8:00 AM - 5:00 PM"
                  />
                </div>
              </div>
            </div>

            {/* Save & Reset Actions Bar */}
            {can('settings.update') && (
              <div className="flex items-center justify-end gap-3 pt-2">
                {isDirty && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink transition-colors"
                  >
                    Reset Changes
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className={`${PRIMARY_BTN} ${saving || !isDirty ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving Changes...
                    </span>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Live Clinic Identity Card Preview */}
          <div className="space-y-6">
            <div className={`${PANEL} sticky top-24`}>
              <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Live Preview</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Configuration
                </span>
              </div>

              {/* Styled Preview Card */}
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#f2faf8] to-[#e4f4f1] p-5 shadow-xs">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0c4a45] to-[#07302c] text-white shadow-md border border-[#14b8a6]/30">
                    <svg className="size-6 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M2 12h20" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#062c30] leading-tight">
                      {form.clinicName || 'TMC CareLink Clinic'}
                    </h3>
                    <p className="text-xs font-semibold text-[#0d5c58] mt-0.5">
                      {form.clinicAddress || 'Tagum Norte, Trinidad, Bohol, Philippines'}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#0a4642]/80 leading-relaxed mb-4">
                  {form.clinicDescription || 'Providing comprehensive health, diagnostic, and wellness support for university students and academic personnel.'}
                </p>

                <div className="space-y-2 border-t border-[#0d5c58]/15 pt-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#0a4642]/75">Operating Schedule:</span>
                    <span className="font-bold text-[#062c30]">
                      {form.clinicDays || 'Mon - Fri'} ({form.clinicHours || '8:00 AM - 5:00 PM'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#0a4642]/75">Contact Line:</span>
                    <span className="font-bold text-[#062c30]">{form.clinicPhone || 'Not configured'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#0a4642]/75">Clinic Email:</span>
                    <span className="font-bold text-[#062c30]">{form.clinicEmail || 'Not configured'}</span>
                  </div>
                  {form.emergencyHotline && (
                    <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-amber-900 border border-amber-500/20">
                      <span className="font-bold text-[11.5px]">Emergency SOS:</span>
                      <span className="font-extrabold text-[12px]">{form.emergencyHotline}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-line bg-muted-soft/10 p-3.5 text-xs text-muted leading-relaxed">
                <p className="font-semibold text-ink mb-1">Configuration Scope:</p>
                Changes saved here dynamically propagate to appointment confirmation receipts, official medical certificate headers, and student mobile app clinic information sheets.
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default SettingsAudit
