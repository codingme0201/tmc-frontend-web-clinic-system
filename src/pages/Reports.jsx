import { useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useReports } from '../hooks/useReports'
import { useForm } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE,
  FORM_LABEL, FORM_FIELD,
} from '../lib/ui'
import Icon from '../components/Icon'
import InlineSpinner from '../components/Spinner'
import Pagination from '../components/Pagination'
import { usePagination } from '../hooks/usePagination'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'

const REPORT_TYPES = [
  { id: 'appointments', label: 'Appointments', icon: 'calendarCheck', description: 'Appointment records within a selected date range.' },
  { id: 'consultations', label: 'Consultations', icon: 'stethoscope', description: 'Consultation records and activities.' },
  { id: 'patients', label: 'Patients', icon: 'users', description: 'Registered patient summaries by category.' },
  { id: 'medical-certificates', label: 'Medical Certificates', icon: 'certificate', description: 'Issued medical certificates.' },
  { id: 'prescriptions', label: 'Prescriptions', icon: 'pill', description: 'Prescription records within a selected period.' },
]

const APPOINTMENT_STATUSES = ['All', 'Pending', 'Under Review', 'Approved', 'Rescheduled', 'Rejected', 'Cancelled', 'Completed']
const CONSULTATION_STATUSES = ['All', 'Scheduled', 'In Progress', 'Completed']
const CERTIFICATE_STATUSES = ['All', 'Pending', 'Approved', 'Issued', 'Rejected', 'Void']
const PATIENT_TYPES = ['All', 'Student']
const PATIENT_STATUSES = ['All', 'Active', 'Inactive']
const EMPTY_FILTERS = { start_date: '', end_date: '', status: 'All', patient: '', staff: '', type: 'All' }

const STATUS_PILL = 'inline-block rounded-full px-2 py-0.5 text-[11px] font-bold'

function Reports({ page }) {
  const { can } = useAuth()
  const reports = useReports()
  const { showToast } = useToast()

  const form = useForm({ defaultValues: EMPTY_FILTERS })

  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)

  const pagination = usePagination(reports.reportData, { pageSize: 15 })
  const { pageItems, currentPage, totalPages, goToPage } = pagination

  const activeReport = REPORT_TYPES.find((r) => r.id === reports.activeReport) ?? REPORT_TYPES[0]

  const needsDateRange = ['appointments', 'consultations', 'medical-certificates', 'prescriptions'].includes(reports.activeReport)
  const needsStatusFilter = ['appointments', 'consultations', 'medical-certificates'].includes(reports.activeReport)
  const needsPatientFilter = ['appointments', 'consultations', 'medical-certificates', 'prescriptions'].includes(reports.activeReport)
  const needsStaffFilter = ['appointments', 'consultations', 'medical-certificates', 'prescriptions'].includes(reports.activeReport)
  const needsTypeFilter = reports.activeReport === 'appointments' || reports.activeReport === 'patients'

  const statusOptions = (() => {
    switch (reports.activeReport) {
      case 'appointments': return APPOINTMENT_STATUSES
      case 'consultations': return CONSULTATION_STATUSES
      case 'medical-certificates': return CERTIFICATE_STATUSES
      case 'patients': return PATIENT_STATUSES
      default: return ['All']
    }
  })()

  const typeOptions = (() => {
    switch (reports.activeReport) {
      case 'appointments': return ['All', 'Check-up', 'Dental concern', 'Follow-up', 'Fever', 'Vaccination', 'Emergency']
      case 'patients': return PATIENT_TYPES
      default: return ['All']
    }
  })()

  const handleGenerate = async (values) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const filterState = {}
      if (values.start_date) filterState.start_date = values.start_date
      if (values.end_date) filterState.end_date = values.end_date
      if (values.status && values.status !== 'All') filterState.status = values.status
      if (values.patient) filterState.patient = values.patient
      if (values.staff) filterState.staff = values.staff
      if (values.type && values.type !== 'All') filterState.type = values.type

      reports.generateReport(reports.activeReport, filterState)
      const statsFilters = {}
      if (filterState.start_date) statsFilters.start_date = filterState.start_date
      if (filterState.end_date) statsFilters.end_date = filterState.end_date
      reports.generateStats(statsFilters)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleExport = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await reports.downloadExport(reports.activeReport, reports.filters)
      showToast('Report exported successfully.')
    } catch (err) {
      showToast(err?.message || 'Failed to export report.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const submitForm = (event) => {
    form.handleSubmit(handleGenerate, () => showToast('Please check the filter values.', 'error'))(event)
  }

  const resetFilters = () => {
    form.reset(EMPTY_FILTERS)
    reports.generateReport(reports.activeReport, {})
    reports.generateStats({})
  }

  const selectReport = (id) => {
    if (id === reports.activeReport) return
    form.reset(EMPTY_FILTERS)
    reports.generateReport(id, {})
    reports.generateStats({})
  }

  const colCount = reports.activeReport === 'prescriptions' ? 5 : 7

  const stats = reports.statsData
  const cardStats = {
    appointments: { value: stats?.appointments?.total, sub: `${stats?.appointments?.byStatus?.Completed ?? 0} completed` },
    consultations: { value: stats?.consultations?.total, sub: `${stats?.consultations?.completed ?? 0} completed` },
    patients: { value: stats?.patients?.total, sub: `${stats?.patients?.active ?? 0} active` },
    'medical-certificates': { value: stats?.medicalCertificates?.total, sub: `${stats?.medicalCertificates?.issued ?? 0} issued` },
    prescriptions: { value: stats?.prescriptions?.total, sub: 'All prescriptions' },
  }

  const breakdowns = (() => {
    switch (reports.activeReport) {
      case 'appointments':
        return [
          { title: 'By Status', data: stats?.appointments?.byStatus },
          { title: 'By Type', data: stats?.appointments?.byType },
        ]
      case 'consultations':
        return [{ title: 'By Status', data: stats?.consultations?.byStatus }]
      default:
        return []
    }
  })().filter((b) => b.data && Object.keys(b.data).length > 0)

  const rangeLabel = reports.filters.start_date || reports.filters.end_date
    ? `${reports.filters.start_date || '…'} – ${reports.filters.end_date || '…'}`
    : 'All dates'

  return (
    <div>
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={KICKER}>{page.eyebrow}</p>
          <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">{page.title}</h2>
          <span className="mt-[6px] block text-[13px] text-muted">{page.description}</span>
        </div>
        {can('reports.export') && (
          <button
            type="button"
            className={PRIMARY_BTN}
            onClick={handleExport}
            disabled={busy || !reports.reportData.length}
          >
            {busy ? <InlineSpinner /> : <Icon name="download" size={16} />}
            Export {activeReport.label} CSV
          </button>
        )}
      </section>

      <div className="mb-5 grid grid-cols-5 gap-3 max-[1180px]:grid-cols-3 max-[700px]:grid-cols-2 max-[440px]:grid-cols-1" role="tablist" aria-label="Report type">
        {REPORT_TYPES.map((rt) => {
          const active = reports.activeReport === rt.id
          const card = cardStats[rt.id]
          return (
            <button
              type="button"
              role="tab"
              aria-selected={active}
              key={rt.id}
              title={rt.description}
              onClick={() => selectReport(rt.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-[14px_16px] text-left transition-all duration-200 ${
                active
                  ? 'border-primary bg-[#f0faf8] shadow-[inset_0_0_0_1px_var(--color-primary)]'
                  : 'border-line-strong hover:border-primary'
              }`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${active ? 'bg-primary text-white' : 'bg-[#e8f3f0] text-primary'}`}>
                <Icon name={rt.icon} size={19} />
              </span>
              <span className="min-w-0">
                <small className="block truncate text-[11px] font-extrabold uppercase tracking-[0.02em] text-muted">{rt.label}</small>
                <strong className="block text-[24px] leading-tight text-ink">
                  {reports.statsLoading ? '…' : (card.value ?? 0)}
                </strong>
                <span className="block truncate text-[11.5px] font-bold text-muted-soft">{card.sub}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className={`${PANEL} p-[16px_20px]`}>
        <form onSubmit={submitForm} className="flex flex-wrap items-end gap-3">
          {needsDateRange && (
            <>
              <label className={`${FORM_LABEL} w-[160px] max-[620px]:w-full`}>
                Start Date
                <input type="date" className={FORM_FIELD} {...form.register('start_date')} />
              </label>
              <label className={`${FORM_LABEL} w-[160px] max-[620px]:w-full`}>
                End Date
                <input type="date" className={FORM_FIELD} {...form.register('end_date')} />
              </label>
            </>
          )}

          {(needsStatusFilter || reports.activeReport === 'patients') && (
            <label className={`${FORM_LABEL} w-[170px] max-[620px]:w-full`}>
              {reports.activeReport === 'patients' ? 'Patient Status' : 'Status'}
              <select className={FORM_FIELD} {...form.register('status')}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
                ))}
              </select>
            </label>
          )}

          {needsTypeFilter && (
            <label className={`${FORM_LABEL} w-[170px] max-[620px]:w-full`}>
              {reports.activeReport === 'patients' ? 'Category' : 'Type'}
              <select className={FORM_FIELD} {...form.register('type')}>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t === 'All' ? `All ${reports.activeReport === 'patients' ? 'Categories' : 'Types'}` : t}</option>
                ))}
              </select>
            </label>
          )}

          {needsPatientFilter && (
            <label className={`${FORM_LABEL} min-w-[180px] flex-1 max-[620px]:w-full`}>
              Patient
              <input type="text" placeholder="Name or ID..." className={FORM_FIELD} {...form.register('patient')} />
            </label>
          )}

          {needsStaffFilter && (
            <label className={`${FORM_LABEL} min-w-[160px] flex-1 max-[620px]:w-full`}>
              Staff
              <input type="text" placeholder="Doctor / nurse..." className={FORM_FIELD} {...form.register('staff')} />
            </label>
          )}

          <div className="ml-auto flex items-center gap-2 max-[620px]:ml-0 max-[620px]:w-full">
            <button type="button" className={`${PILL} min-h-[42px]`} onClick={resetFilters} disabled={busy}>
              Reset
            </button>
            <button type="submit" className={`${PRIMARY_BTN} min-h-[42px] px-[16px] text-[13px] max-[620px]:flex-1`} disabled={busy}>
              {busy && <InlineSpinner />}
              Generate Report
            </button>
          </div>
        </form>
      </div>

      <div className={`mt-5 grid gap-5 ${breakdowns.length > 0 ? 'grid-cols-[minmax(0,1fr)_280px] max-[1180px]:grid-cols-1' : 'grid-cols-1'}`}>
        <div className={`${PANEL} min-w-0 p-5`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="m-0 text-[16px] font-bold text-ink">{activeReport.label} Report</h3>
              <p className="m-0 text-[12px] text-muted">{activeReport.description} · {rangeLabel}</p>
            </div>
            <span className="rounded-full border border-line bg-[#f4faf8] px-3 py-1 text-[12px] font-bold text-muted">
              {reports.reportData.length} record{reports.reportData.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line">
            {reports.reportError ? (
              <ErrorState message={reports.reportError} onRetry={reports.refetchReport} />
            ) : reports.reportLoading ? (
              <TableSkeleton columns={colCount} />
            ) : pageItems.length === 0 ? (
              <EmptyState message="No report records found. Try adjusting the filters above." />
            ) : (
              <table className={TABLE}>
                <thead>
                  <tr>
                    {reports.activeReport === 'appointments' && (
                      <>
                        <th>Reference</th>
                        <th>Patient</th>
                        <th>Staff</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                      </>
                    )}
                    {reports.activeReport === 'consultations' && (
                      <>
                        <th>Reference</th>
                        <th>Patient</th>
                        <th>Staff</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Chief Complaint</th>
                        <th>Diagnosis</th>
                      </>
                    )}
                    {reports.activeReport === 'patients' && (
                      <>
                        <th>Patient ID</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Course/Dept</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Visits</th>
                      </>
                    )}
                    {reports.activeReport === 'medical-certificates' && (
                      <>
                        <th>Reference</th>
                        <th>Patient</th>
                        <th>Purpose</th>
                        <th>Diagnosis</th>
                        <th>Issued By</th>
                        <th>Issue Date</th>
                        <th>Status</th>
                      </>
                    )}
                    {reports.activeReport === 'prescriptions' && (
                      <>
                        <th>Reference</th>
                        <th>Patient</th>
                        <th>Prescribed By</th>
                        <th>Date</th>
                        <th>Medications</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((row) => (
                    <tr key={row.id}>
                      {reports.activeReport === 'appointments' && (
                        <>
                          <td className="font-bold text-ink">{row.reference}</td>
                          <td>{row.patient}</td>
                          <td>{row.staff}</td>
                          <td>{row.type}</td>
                          <td className="whitespace-nowrap">{row.date}</td>
                          <td className="whitespace-nowrap">{row.time}</td>
                          <td>
                            <span className={`${STATUS_PILL} ${
                              row.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                              row.status === 'Cancelled' || row.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              row.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </>
                      )}
                      {reports.activeReport === 'consultations' && (
                        <>
                          <td className="font-bold text-ink">{row.reference}</td>
                          <td>{row.patient}</td>
                          <td>{row.staff}</td>
                          <td className="whitespace-nowrap">{row.date}</td>
                          <td>
                            <span className={`${STATUS_PILL} ${
                              row.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                              row.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="max-w-[200px] truncate">{row.chiefComplaint || '—'}</td>
                          <td className="max-w-[200px] truncate">{row.diagnosis || '—'}</td>
                        </>
                      )}
                      {reports.activeReport === 'patients' && (
                        <>
                          <td className="font-bold text-ink">{row.patientId}</td>
                          <td>{row.name}</td>
                          <td>{row.type}</td>
                          <td>{row.courseDept || '—'}</td>
                          <td>{row.contact || '—'}</td>
                          <td>
                            <span className={`${STATUS_PILL} ${
                              row.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="text-[12px] font-bold text-muted">
                              {(row.appointmentsCount ?? 0) + (row.consultationsCount ?? 0)}
                            </span>
                          </td>
                        </>
                      )}
                      {reports.activeReport === 'medical-certificates' && (
                        <>
                          <td className="font-bold text-ink">{row.reference}</td>
                          <td>{row.patient}</td>
                          <td className="max-w-[150px] truncate">{row.purpose || '—'}</td>
                          <td className="max-w-[150px] truncate">{row.diagnosis || '—'}</td>
                          <td>{row.issuedBy || '—'}</td>
                          <td className="whitespace-nowrap">{row.issueDate || '—'}</td>
                          <td>
                            <span className={`${STATUS_PILL} ${
                              row.status === 'Issued' ? 'bg-emerald-100 text-emerald-700' :
                              row.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                              row.status === 'Rejected' || row.status === 'Void' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </>
                      )}
                      {reports.activeReport === 'prescriptions' && (
                        <>
                          <td className="font-bold text-ink">{row.reference}</td>
                          <td>{row.patient}</td>
                          <td>{row.prescribedBy || '—'}</td>
                          <td className="whitespace-nowrap">{row.prescriptionDate || '—'}</td>
                          <td>
                            <div className="flex flex-col gap-0.5">
                              {(row.medications || []).map((m, i) => (
                                <span key={i} className="text-[12px] text-ink">
                                  {m.medicineName} ({m.dosage})
                                </span>
                              ))}
                              {(!row.medications || row.medications.length === 0) && (
                                <span className="text-[12px] text-muted">—</span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
        </div>

        {breakdowns.length > 0 && (
          <aside className={`${PANEL} h-fit p-5`}>
            <h3 className="m-0 text-[15px] font-bold text-ink">{activeReport.label} Breakdown</h3>
            <p className="m-0 mb-4 text-[12px] text-muted">{rangeLabel}</p>
            <div className="grid gap-5 max-[1180px]:grid-cols-2 max-[620px]:grid-cols-1">
              {breakdowns.map((b) => {
                const entries = Object.entries(b.data).sort((x, y) => y[1] - x[1])
                const max = Math.max(...entries.map(([, n]) => n), 1)
                return (
                  <div key={b.title}>
                    <h4 className="m-0 mb-2 text-[11px] font-extrabold uppercase tracking-[0.02em] text-muted">{b.title}</h4>
                    <ul className="m-0 grid list-none gap-2 p-0">
                      {entries.map(([label, count]) => (
                        <li key={label}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px] font-bold text-ink">
                            <span className="truncate">{label || '—'}</span>
                            <span className="text-primary">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#e8f3f0]">
                            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default Reports
