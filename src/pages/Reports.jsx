import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useReports } from '../hooks/useReports'
import { useForm } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import { format } from 'date-fns'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT,
  FORM_LABEL, FORM_FIELD, FORM_ROW,
  BTN_INFO, BTN_SUCCESS, BTN_PRIMARY,
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
const PATIENT_TYPES = ['All', 'Student', 'Faculty', 'Staff']
const PATIENT_STATUSES = ['All', 'Active', 'Inactive']

function Reports({ page }) {
  const { can } = useAuth()
  const reports = useReports()
  const { showToast } = useToast()

  const form = useForm({
    defaultValues: {
      start_date: '',
      end_date: '',
      status: 'All',
      patient: '',
      staff: '',
      type: 'All',
    },
  })

  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)

  const [showStats, setShowStats] = useState(false)

  const pagination = usePagination(reports.reportData, { pageSize: 15 })
  const { pageItems, currentPage, totalPages, goToPage } = pagination

  const activeReport = REPORT_TYPES.find((r) => r.id === reports.activeReport) ?? REPORT_TYPES[0]

  const needsDateRange = ['appointments', 'consultations', 'medical-certificates', 'prescriptions'].includes(reports.activeReport)
  const needsStatusFilter = ['appointments', 'consultations', 'medical-certificates'].includes(reports.activeReport)
  const needsPatientFilter = ['appointments', 'consultations', 'patients', 'medical-certificates', 'prescriptions'].includes(reports.activeReport)
  const needsStaffFilter = ['appointments', 'consultations', 'medical-certificates', 'prescriptions'].includes(reports.activeReport)
  const needsTypeFilter = reports.activeReport === 'appointments' || reports.activeReport === 'patients'

  const statusOptions = (() => {
    switch (reports.activeReport) {
      case 'appointments': return APPOINTMENT_STATUSES
      case 'consultations': return CONSULTATION_STATUSES
      case 'medical-certificates': return CERTIFICATE_STATUSES
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

  const patientStatusOptions = reports.activeReport === 'patients' ? PATIENT_STATUSES : ['All']

  const handleGenerate = useCallback(
    (values) => {
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
      } finally {
        busyRef.current = false
        setBusy(false)
      }
    },
    [reports],
  )

  const handleGenerateStats = useCallback(() => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const values = form.getValues()
      const filterState = {}
      if (values.start_date) filterState.start_date = values.start_date
      if (values.end_date) filterState.end_date = values.end_date
      reports.generateStats(filterState)
      setShowStats(true)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [reports, form])

  const handleExport = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const values = form.getValues()
      const filterState = {}
      if (values.start_date) filterState.start_date = values.start_date
      if (values.end_date) filterState.end_date = values.end_date
      if (values.status && values.status !== 'All') filterState.status = values.status
      if (values.patient) filterState.patient = values.patient
      if (values.staff) filterState.staff = values.staff
      if (values.type && values.type !== 'All') filterState.type = values.type

      await reports.downloadExport(reports.activeReport, filterState)
      showToast('Report exported successfully.')
    } catch (err) {
      showToast(err?.message || 'Failed to export report.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [reports, form, showToast])

  const submitForm = (event) => {
    form.handleSubmit(handleGenerate, () => showToast('Please check the filter values.', 'error'))(event)
  }

  const resetFilters = () => {
    form.reset({ start_date: '', end_date: '', status: 'All', patient: '', staff: '', type: 'All' })
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
        {can('reports.export') && (
          <button
            type="button"
            className={PRIMARY_BTN}
            onClick={handleExport}
            disabled={busy || !reports.reportData.length}
          >
            {busy ? <InlineSpinner /> : <Icon name="download" size={16} />}
            Export CSV
          </button>
        )}
      </section>

      {/* Report type selector */}
      <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {REPORT_TYPES.map((rt) => (
          <button
            type="button"
            key={rt.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
              reports.activeReport === rt.id
                ? 'border-primary bg-white shadow-sm'
                : 'border-line bg-surface hover:border-primary/30'
            }`}
            onClick={() => {
              reports.setActiveReport(rt.id)
              resetFilters()
              setShowStats(false)
            }}
          >
            <Icon name={rt.icon} size={20} />
            <div>
              <span className={`block text-[13px] font-bold ${reports.activeReport === rt.id ? 'text-primary' : 'text-ink'}`}>
                {rt.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted">{rt.description}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Filter panel */}
      <div className={`${PANEL} p-5`}>
        <form onSubmit={submitForm}>
          <div className="mb-4 flex flex-wrap items-end gap-4">
            {needsDateRange && (
              <>
                <label className={FORM_LABEL}>
                  Start Date
                  <input type="date" className={FORM_FIELD} {...form.register('start_date')} />
                </label>
                <label className={FORM_LABEL}>
                  End Date
                  <input type="date" className={FORM_FIELD} {...form.register('end_date')} />
                </label>
              </>
            )}

            {needsStatusFilter && (
              <label className={FORM_LABEL}>
                Status
                <select className={FORM_FIELD} {...form.register('status')}>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
                  ))}
                </select>
              </label>
            )}

            {needsPatientFilter && reports.activeReport !== 'patients' && (
              <label className={FORM_LABEL}>
                Patient
                <input type="text" placeholder="Search patient..." className={FORM_FIELD} {...form.register('patient')} />
              </label>
            )}

            {needsStaffFilter && (
              <label className={FORM_LABEL}>
                Staff
                <input type="text" placeholder="Search staff..." className={FORM_FIELD} {...form.register('staff')} />
              </label>
            )}

            {needsTypeFilter && (
              <label className={FORM_LABEL}>
                {reports.activeReport === 'patients' ? 'Category' : 'Type'}
                <select className={FORM_FIELD} {...form.register('type')}>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>{t === 'All' ? `All ${reports.activeReport === 'patients' ? 'Categories' : 'Types'}` : t}</option>
                  ))}
                </select>
              </label>
            )}

            {reports.activeReport === 'patients' && (
              <label className={FORM_LABEL}>
                Patient Status
                <select className={FORM_FIELD} {...form.register('status')}>
                  {patientStatusOptions.map((s) => (
                    <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
              {busy && <InlineSpinner />}
              Generate Report
            </button>
            <button type="button" className={PILL} onClick={resetFilters} disabled={busy}>
              Reset
            </button>
            {reports.activeReport === 'appointments' && (
              <button type="button" className={BTN_PRIMARY} onClick={handleGenerateStats} disabled={busy}>
                Clinic Statistics
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Statistics panel */}
      {showStats && reports.statsData && (
        <div className={`${PANEL} mt-5 p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="m-0 text-[16px] font-bold text-ink">Clinic Statistics</h3>
            <button type="button" className={PILL} onClick={() => setShowStats(false)}>
              Hide Statistics
            </button>
          </div>

          <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {[
              { label: 'Total Appointments', value: reports.statsData?.appointments?.total ?? 0 },
              { label: 'Total Consultations', value: reports.statsData?.consultations?.total ?? 0 },
              { label: 'Completed Consultations', value: reports.statsData?.consultations?.completed ?? 0 },
              { label: 'Total Patients', value: reports.statsData?.patients?.total ?? 0 },
              { label: 'Active Patients', value: reports.statsData?.patients?.active ?? 0 },
              { label: 'Medical Certificates', value: reports.statsData?.medicalCertificates?.total ?? 0 },
              { label: 'Issued Certificates', value: reports.statsData?.medicalCertificates?.issued ?? 0 },
              { label: 'Total Prescriptions', value: reports.statsData?.prescriptions?.total ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-line bg-bg p-4 text-center">
                <p className="m-0 text-[24px] font-extrabold text-primary">{stat.value}</p>
                <p className="m-0 mt-1 text-[11px] font-bold uppercase text-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Appointment status breakdown */}
          {reports.statsData?.appointments?.byStatus && Object.keys(reports.statsData.appointments.byStatus).length > 0 && (
            <div className="mb-4">
              <h4 className="m-0 mb-2 text-[13px] font-bold text-ink">Appointment Status Breakdown</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(reports.statsData.appointments.byStatus).map(([status, count]) => (
                  <span key={status} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-[12px] font-bold text-ink">
                    {status}: <span className="text-primary">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Appointment type breakdown */}
          {reports.statsData?.appointments?.byType && Object.keys(reports.statsData.appointments.byType).length > 0 && (
            <div>
              <h4 className="m-0 mb-2 text-[13px] font-bold text-ink">Appointment Type Breakdown</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(reports.statsData.appointments.byType).map(([type, count]) => (
                  <span key={type} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-[12px] font-bold text-ink">
                    {type}: <span className="text-primary">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report table */}
      <div className={`${PANEL} mt-5 p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[16px] font-bold text-ink">{activeReport.label} Report</h3>
          <span className="text-[12.5px] font-bold text-muted">
            {reports.reportData.length} record{reports.reportData.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line">
          {reports.reportError ? (
            <ErrorState message={reports.reportError} onRetry={reports.refetchReport} />
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
                {reports.reportLoading ? (
                  <TableSkeleton columns={reports.activeReport === 'patients' ? 7 : reports.activeReport === 'prescriptions' ? 5 : 7} />
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={reports.activeReport === 'patients' ? 7 : reports.activeReport === 'prescriptions' ? 5 : 7}>
                      <EmptyState message="No report data. Select filters and click Generate Report." />
                    </td>
                  </tr>
                ) : (
                  pageItems.map((row) => (
                    <tr key={row.id}>
                      {reports.activeReport === 'appointments' && (
                        <>
                          <td className="font-bold text-ink">{row.reference}</td>
                          <td>{row.patient}</td>
                          <td>{row.staff}</td>
                          <td>{row.type}</td>
                          <td>{row.date}</td>
                          <td>{row.time}</td>
                          <td>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
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
                          <td>{row.date}</td>
                          <td>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
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
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              row.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="text-[12px] font-bold text-muted">
                              {row.appointmentsCount + row.consultationsCount}
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
                          <td>{row.issueDate || '—'}</td>
                          <td>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
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
                          <td>{row.prescriptionDate || '—'}</td>
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
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>
    </div>
  )
}

export default Reports
