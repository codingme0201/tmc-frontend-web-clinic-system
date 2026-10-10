import { useEffect, useMemo, useState } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import { usePatients } from '../hooks/usePatients'
import { useConsultations } from '../hooks/useConsultations'
import { useStaff } from '../hooks/useStaff'
import { useActivityLogs } from '../hooks/useActivityLogs'
import { useClinicInsights } from '../hooks/useClinicInsights'
import { useQueue } from '../hooks/useQueue'
import { useAuth } from '../hooks/useAuth'
import { useAppContext } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { todayISO, formatPhone } from '../lib/format'
import { APPOINTMENT_TYPES, TIME_SLOTS, VISIT_TYPES, VISIT_NEW, currentSlot } from '../lib/clinic'
import { PILL, PRIMARY_BTN, PANEL, PANEL_HEADER, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT, SIDEBAR_FORM, FORM_LABEL, FORM_FIELD, FORM_ROW } from '../lib/ui'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import { EmptyState, ErrorState } from '../components/AsyncState'
import InlineSpinner from '../components/Spinner'
import RefreshingBadge from '../components/RefreshingBadge'
import DashboardCardSkeleton from '../components/skeletons/DashboardCardSkeleton'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import ListSkeleton from '../components/skeletons/ListSkeleton'
import CardSkeleton from '../components/skeletons/CardSkeleton'
import FormSkeleton from '../components/skeletons/FormSkeleton'
import StudentSelect from '../components/StudentSelect'
import QueueBoard from '../components/QueueBoard'
import ClinicianSelect from '../components/ClinicianSelect'
import CourseSelect from '../components/CourseSelect'
import VisitTypeBadge from '../components/VisitTypeBadge'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'appointments', 'consultations', 'patients', 'schedule', 'activity'
  const { can, userRole } = useAuth()
  const { navigate } = useAppContext()
  const canViewConsultations = can('consultations.view')
  // Audit logs are admin-only.
  const canViewActivity = userRole === 'admin'

  // All data flows through shared custom hooks — the page never imports or
  // mutates shared store data directly.
  const {
    data: appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments,
    createAppointment,
    updateStatus: updateAppointmentStatus,
  } = useAppointments('dashboard')

  const {
    data: staff,
    isLoading: staffLoading,
    error: staffError,
    refetch: refetchStaff,
    isRefetching: staffRefetching,
    updateStaffStatus,
  } = useStaff('dashboard')

  const {
    data: patients,
    isLoading: patientsLoading,
    error: patientsError,
    refetch: refetchPatients,
    addPatient,
  } = usePatients()

  const {
    data: consultations,
    isLoading: consultationsLoading,
    error: consultationsError,
    refetch: refetchConsultations,
    addConsultation,
  } = useConsultations('dashboard', { enabled: canViewConsultations })
  const queue = useQueue('dashboard')

  const { data: activityLogs, isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useActivityLogs()
  const {
    data: clinicInsights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
    isRefetching: insightsRefetching,
  } = useClinicInsights()
  const { showToast } = useToast()

  // Modals & Panels Active States
  const [selectedPatient, setSelectedPatient] = useState(null)

  // Book Appointment Form State
  const [appPatient, setAppPatient] = useState('')
  const [appPatientId, setAppPatientId] = useState('')
  const [appType, setAppType] = useState('Check-up')
  const [appVisitType, setAppVisitType] = useState(VISIT_NEW)
  const [appTime, setAppTime] = useState(() => currentSlot())
  const [appStaffId, setAppStaffId] = useState(null)
  const [queueBusyId, setQueueBusyId] = useState(null)
  const [booking, setBooking] = useState(false)
  const [logging, setLogging] = useState(false)
  const [addingPatient, setAddingPatient] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(null) // staff name currently being toggled

  // Log Consultation Form State
  const [consPatient, setConsPatient] = useState('')
  const [consSymptoms, setConsSymptoms] = useState('')
  const [consBp, setConsBp] = useState('120/80')
  const [consTemp, setConsTemp] = useState('36.7°C')
  const [consPulse, setConsPulse] = useState('75 bpm')
  const [consDiagnosis, setConsDiagnosis] = useState('')
  const [consTreatment, setConsTreatment] = useState('')
  const [consDisposition, setConsDisposition] = useState('Sent to Class')
  const [consStaffId, setConsStaffId] = useState(null)

  // Add Patient Form State
  const [patId, setPatId] = useState('')
  const [patName, setPatName] = useState('')
  const [patType, setPatType] = useState('Student')
  const [patDept, setPatDept] = useState('')
  const [patContact, setPatContact] = useState('')
  const [patEmergency, setPatEmergency] = useState('')
  const [patAllergies, setPatAllergies] = useState('')
  const [patHistory, setPatHistory] = useState('')

  // Search/Filters State
  const { search: consSearch, setSearch: setConsSearch, debouncedSearch: debouncedConsSearch } = useSearch()
  const { search: patSearch, setSearch: setPatSearch, debouncedSearch: debouncedPatSearch } = useSearch()
  const [patFilter, setPatFilter] = useState('All')

  // Derived defaults for the consultation form (patients/staff load async).
  const effectiveConsPatient = consPatient || patients[0]?.name || ''

  // Appointment Actions
  const handleAddAppointment = async (e) => {
    e.preventDefault()
    if (booking || !appPatient.trim()) return
    setBooking(true)
    try {
      await createAppointment({
        patient: appPatient.trim(),
        patientId: appPatientId,
        type: appType,
        visitType: appVisitType,
        date: todayISO(),
        time: appTime,
        reason: appType,
        staffId: appStaffId,
      })
      showToast('Walk-in appointment booked. Approve and check the patient in to add them to the queue.')
      setAppPatient('')
      setAppPatientId('')
      setAppStaffId(null)
    } catch (err) {
      showToast(err?.message || 'Failed to book the appointment.', 'error')
    } finally {
      setBooking(false)
    }
  }

  // Queue actions (FIFO) — one entry at a time per button.
  const runQueueAction = async (entry, action, success) => {
    if (queueBusyId) return
    setQueueBusyId(entry.appointmentId)
    try {
      const result = await action()
      showToast(typeof success === 'function' ? success(result) : success)
    } catch (err) {
      showToast(err?.message || 'The queue action failed.', 'error')
    } finally {
      setQueueBusyId(null)
    }
  }
  const handleCheckIn = (entry) =>
    runQueueAction(entry, () => queue.checkIn(entry.appointmentId), (res) => `${res.patient} checked in — queue #${res.queueNumber}.`)
  const handleUndoCheckIn = (entry) =>
    runQueueAction(entry, () => queue.undoCheckIn(entry.appointmentId), `Check-in of ${entry.patient} undone.`)
  const handleServe = (entry) =>
    runQueueAction(
      entry,
      () => queue.serve(entry.appointmentId),
      (consultation) => `${entry.patient} called in — consultation ${consultation.reference} started. Continue it in Consultations.`,
    )
  const handleApproveEntry = (entry) =>
    runQueueAction(entry, () => updateAppointmentStatus(entry.appointmentId, 'Approved'), `${entry.reference} approved.`)
  const handleNoShow = (entry) =>
    runQueueAction(entry, () => updateAppointmentStatus(entry.appointmentId, 'No-Show'), `${entry.patient} marked as No-Show.`)

  // Consultation Actions
  const handleLogConsultation = async (e) => {
    e.preventDefault()
    if (logging || !effectiveConsPatient.trim() || !consDiagnosis.trim()) return
    setLogging(true)
    try {
      await addConsultation({
        patient: effectiveConsPatient,
        staff_id: consStaffId,
        symptoms: consSymptoms,
        vitals: { bp: consBp, temp: consTemp, pulse: consPulse },
        diagnosis: consDiagnosis,
        treatment: consTreatment,
        disposition: consDisposition,
      })
      showToast('Consultation logged.')
      // Reset form
      setConsSymptoms('')
      setConsDiagnosis('')
      setConsTreatment('')
    } catch (err) {
      showToast(err?.message || 'Failed to log the consultation.', 'error')
    } finally {
      setLogging(false)
    }
  }

  // Patient Actions
  const handleAddPatient = async (e) => {
    e.preventDefault()
    if (addingPatient || !patId.trim() || !patName.trim()) return
    setAddingPatient(true)
    try {
      await addPatient({
        id: patId,
        name: patName,
        type: patType,
        courseDept: patDept,
        contact: patContact,
        emergencyContact: patEmergency,
        allergies: patAllergies || 'None',
        history: patHistory || 'None',
      })
      showToast(`Patient profile created for ${patName}.`)
      // Reset form
      setPatId('')
      setPatName('')
      setPatDept('')
      setPatContact('')
      setPatEmergency('')
      setPatAllergies('')
      setPatHistory('')
    } catch (err) {
      showToast(err?.message || 'Failed to create the patient profile.', 'error')
    } finally {
      setAddingPatient(false)
    }
  }

  // Staff coverage action
  const handleUpdateStaffStatus = async (name, newStatus) => {
    if (statusUpdating) return
    setStatusUpdating(name)
    try {
      await updateStaffStatus(name, newStatus)
      showToast(`Status of ${name} updated to ${newStatus}.`)
    } catch (err) {
      showToast(err?.message || 'Failed to update staff status.', 'error')
    } finally {
      setStatusUpdating(null)
    }
  }

  // Stats derivation
  const activeStats = useMemo(() => {
    const todayAppts = appointments.filter((a) => a.date === todayISO() && a.status !== 'Cancelled' && a.status !== 'Rejected').length
    const activeCons = staff.filter((s) => s.status === 'On duty').length
    const totalPats = patients.length
    const totalConsults = consultations.length
    return [
      { label: 'Today Appointments', value: todayAppts, trend: `${appointments.filter((a) => a.status === 'Pending').length} pending review` },
      { label: 'On-Duty Staff', value: activeCons, trend: `${staff.filter((s) => s.status === 'Break').length} on break` },
      { label: 'Registered Patients', value: totalPats, trend: 'Unified clinic health list' },
      canViewConsultations
        ? { label: 'Total Consultations', value: totalConsults, trend: 'Clinic visit records logged' }
        : { label: 'Waiting in Queue', value: queue.meta?.waiting ?? 0, trend: `${queue.meta?.expected ?? 0} expected today` },
    ]
  }, [appointments, staff, patients, consultations, canViewConsultations, queue.meta])

  // Filtered Consultations
  const filteredConsultations = useMemo(() => {
    return consultations.filter((cons) => {
      const matchSearch =
        cons.patient.toLowerCase().includes(debouncedConsSearch.toLowerCase()) ||
        cons.diagnosis.toLowerCase().includes(debouncedConsSearch.toLowerCase())
      return matchSearch
    })
  }, [consultations, debouncedConsSearch])

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    return patients.filter((pat) => {
      const matchSearch =
        pat.name.toLowerCase().includes(debouncedPatSearch.toLowerCase()) ||
        pat.id.includes(debouncedPatSearch)
      const matchFilter = patFilter === 'All' || pat.type === patFilter
      return matchSearch && matchFilter
    })
  }, [patients, debouncedPatSearch, patFilter])

  // Client-side pagination per list — swap for API-driven pages later without
  // touching the tables or the Pagination UI.
  const consPagination = usePagination(filteredConsultations)
  const patPagination = usePagination(filteredPatients)
  const logsPagination = usePagination(activityLogs)
  const staffPagination = usePagination(staff)

  const { resetPage: resetConsPage } = consPagination
  const { resetPage: resetPatPage } = patPagination

  // Search/filter changes always reset to page 1.
  useEffect(() => {
    resetConsPage()
  }, [debouncedConsSearch, resetConsPage])
  useEffect(() => {
    resetPatPage()
  }, [debouncedPatSearch, patFilter, resetPatPage])

  // Patient history for detail lookup
  const patientHistoryLogs = useMemo(() => {
    if (!selectedPatient) return []
    return consultations.filter((c) => c.patient === selectedPatient.name)
  }, [selectedPatient, consultations])

  // FIFO queue snapshot for the overview widget: who is being seen, then the waiting line.
  const queuePreview = useMemo(
    () => queue.entries.filter((e) => e.queueStatus === 'In Consultation' || e.queueStatus === 'Waiting').slice(0, 4),
    [queue.entries],
  )

  // Overview load state — each widget loads independently, so a slow API
  // never blocks the whole dashboard. These booleans drive the stat cards
  // (derived from four stores) while every other widget manages its own
  // loading/error state below.
  const statsLoading = appointmentsLoading || staffLoading || patientsLoading || (canViewConsultations && consultationsLoading)
  const statsError = appointmentsError || staffError || patientsError || (canViewConsultations && consultationsError)
  const retryStats = () => {
    refetchAppointments()
    refetchStaff()
    refetchPatients()
    if (canViewConsultations) refetchConsultations()
    refetchInsights()
  }

  const activity = clinicInsights?.clinicActivity || []
  const peakHours = clinicInsights?.peakHours || []

  return (
    <div>
      {/* Dashboard Top Header & Tabs */}
      <section className="mb-6">
        <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3 sm:gap-4 max-[620px]:flex-col max-[620px]:items-start">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase text-primary mb-1">
              TMC Expansion Clinic Administration
            </span>
            <h2 className="m-0 text-[22px] sm:text-[30px] md:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
              Clinic Command Center
            </h2>
          </div>
          <div>
            {activeTab !== 'overview' && (
              <button type="button" className={PILL} onClick={() => setActiveTab('overview')}>
                ← Back to Overview
              </button>
            )}
          </div>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-[#dce8e5] pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap rounded-xl border-0 px-3.5 py-2 text-[12.5px] sm:text-[13px] font-extrabold transition-all duration-150 ${activeTab === 'overview' ? 'bg-primary text-white shadow-xs' : 'text-muted-soft hover:bg-white/60 hover:text-primary'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap rounded-xl border-0 px-3.5 py-2 text-[12.5px] sm:text-[13px] font-extrabold transition-all duration-150 ${activeTab === 'appointments' ? 'bg-primary text-white shadow-xs' : 'text-muted-soft hover:bg-white/60 hover:text-primary'}`}
            onClick={() => setActiveTab('appointments')}
          >
            Queue ({queue.meta?.waiting ?? 0} waiting)
          </button>
          {canViewConsultations && (
            <button
              type="button"
              className={`cursor-pointer whitespace-nowrap rounded-xl border-0 px-3.5 py-2 text-[12.5px] sm:text-[13px] font-extrabold transition-all duration-150 ${activeTab === 'consultations' ? 'bg-primary text-white shadow-xs' : 'text-muted-soft hover:bg-white/60 hover:text-primary'}`}
              onClick={() => setActiveTab('consultations')}
            >
              Consultations
            </button>
          )}
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap rounded-xl border-0 px-3.5 py-2 text-[12.5px] sm:text-[13px] font-extrabold transition-all duration-150 ${activeTab === 'patients' ? 'bg-primary text-white shadow-xs' : 'text-muted-soft hover:bg-white/60 hover:text-primary'}`}
            onClick={() => setActiveTab('patients')}
          >
            Patient Registry
          </button>
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap rounded-xl border-0 px-3.5 py-2 text-[12.5px] sm:text-[13px] font-extrabold transition-all duration-150 ${activeTab === 'schedule' ? 'bg-primary text-white shadow-xs' : 'text-muted-soft hover:bg-white/60 hover:text-primary'}`}
            onClick={() => setActiveTab('schedule')}
          >
            Staff Shifts
          </button>
          {canViewActivity && (
            <button
              type="button"
              className={`cursor-pointer whitespace-nowrap rounded-xl border-0 px-3.5 py-2 text-[12.5px] sm:text-[13px] font-extrabold transition-all duration-150 ${activeTab === 'activity' ? 'bg-primary text-white shadow-xs' : 'text-muted-soft hover:bg-white/60 hover:text-primary'}`}
              onClick={() => setActiveTab('activity')}
            >
              Clinic Activity
            </button>
          )}
        </nav>
      </section>

      {/* Dynamic Tabs Content */}
      <div>
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <div>
            {/* Stat cards — one skeleton per card until the four core stores settle */}
            {statsError ? (
              <ErrorState message={statsError} onRetry={retryStats} />
            ) : statsLoading ? (
              <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <DashboardCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {activeStats.map((item) => (
                  <article key={item.label} className="group relative overflow-hidden rounded-2xl border border-line-strong/80 bg-white p-3.5 sm:p-5 shadow-[0_4px_24px_rgba(18,57,59,0.06)] transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(18,57,59,0.1)]">
                    <div className="flex items-center justify-between gap-1">
                      <p className="m-0 text-[11px] sm:text-[12px] font-extrabold uppercase tracking-wider text-muted-soft truncate">
                        {item.label}
                      </p>
                      <span className="size-2 shrink-0 rounded-full bg-primary/30 transition-colors group-hover:bg-primary" />
                    </div>
                    <strong className="mb-1 mt-2 sm:mt-3 block text-[24px] sm:text-[32px] font-extrabold leading-none tracking-tight text-[#10393b]">
                      {item.value}
                    </strong>
                    <span className="text-[11px] sm:text-[12px] font-medium text-muted truncate block">
                      {item.trend}
                    </span>
                  </article>
                ))}
              </div>
            )}

                {/* Overview Multi Grid */}
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)] gap-[18px] max-[980px]:grid-cols-1">
                  {/* Appointments Quick View */}
                  <article className={`${PANEL} row-span-2 max-[980px]:row-auto`}>
                    <div className={PANEL_HEADER}>
                      <div>
                        <p className={KICKER}>Queue Management · First In, First Out</p>
                        <h3 className="m-0 text-[17px] sm:text-[18px] font-bold text-[#143d40]">Today&apos;s Patient Queue</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshingBadge refreshing={queue.isRefetching && !queue.isLoading} />
                        <button type="button" className={PILL} onClick={() => setActiveTab('appointments')}>Manage Queue</button>
                      </div>
                    </div>
                    {queue.error ? (
                      <ErrorState message={queue.error} onRetry={queue.refetch} />
                    ) : queue.isLoading ? (
                      <ListSkeleton rows={3} />
                    ) : (
                    <div className="grid gap-2.5">
                      {queuePreview.map((entry) => (
                        <div className="flex flex-col sm:grid sm:grid-cols-[92px_minmax(0,1fr)_auto] items-start sm:items-center gap-2.5 sm:gap-3 rounded-xl border border-line-strong/80 bg-white/70 p-3 sm:p-3.5 shadow-2xs transition-all duration-150 hover:border-primary/40 hover:bg-white" key={entry.appointmentId}>
                          <div className="flex w-full items-center justify-between sm:w-auto sm:flex-col sm:items-start">
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 text-[12px] font-extrabold text-primary">
                              {entry.queueStatus === 'Waiting' ? `#${entry.position}` : 'Now'} · {entry.time}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <strong className="block truncate font-bold text-ink text-[13.5px]">{entry.patient}</strong>
                              <VisitTypeBadge visitType={entry.visitType} compact />
                            </div>
                            <span className="block text-[12px] text-muted">{entry.type} · {entry.staff}</span>
                          </div>
                          <StatusBadge status={entry.queueStatus} />
                        </div>
                      ))}
                      {queuePreview.length === 0 && (
                        <EmptyState message={`No patients waiting. ${queue.meta?.expected ?? 0} expected and ${queue.meta?.awaitingApproval ?? 0} awaiting approval today.`} />
                      )}
                    </div>
                    )}
                  </article>

                  {/* Staff Shift Status Quick View */}
                  <article className={PANEL}>
                    <div className={PANEL_HEADER}>
                      <div>
                        <p className={KICKER}>Coverage Summary</p>
                        <h3 className="m-0 text-[18px] text-[#143d40]">Staff Status</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshingBadge refreshing={staffRefetching && !staffLoading} />
                        <button type="button" className="cursor-pointer rounded-[7px] bg-bg px-3 py-2 font-extrabold text-primary" onClick={() => setActiveTab('schedule')}>Adjust Shifts</button>
                      </div>
                    </div>
                    {staffError ? (
                      <ErrorState message={staffError} onRetry={refetchStaff} />
                    ) : staffLoading ? (
                      <ListSkeleton rows={4} avatar />
                    ) : (
                    <div className="grid gap-[10px]">
                      {staff.map((member) => (
                        <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line p-3" key={member.name}>
                          <div className="grid size-[42px] place-items-center rounded-full bg-accent text-[13px] font-extrabold text-[#fffaf3]">{member.name.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <strong className="block text-ink">{member.name}</strong>
                            <span className="block text-[12px] text-muted">{member.role}</span>
                          </div>
                          <div className="col-start-2">
                            <StatusBadge status={member.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </article>

                  {/* Clinic Activity Summary */}
                  <article className={PANEL}>
                    <div className={PANEL_HEADER}>
                      <div>
                        <p className={KICKER}>Records</p>
                        <h3 className="m-0 text-[18px] text-[#143d40]">Clinic Activity</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshingBadge refreshing={insightsRefetching && !insightsLoading} />
                        <button type="button" className="cursor-pointer rounded-[7px] bg-bg px-3 py-2 font-extrabold text-primary" onClick={() => setActiveTab('activity')}>View All</button>
                      </div>
                    </div>
                    {insightsError ? (
                      <ErrorState message={insightsError} onRetry={refetchInsights} />
                    ) : insightsLoading ? (
                      <CardSkeleton rows={4} />
                    ) : (
                    <div className="grid gap-4">
                      {activity.map((item) => (
                        <div className="grid gap-[7px]" style={{ '--bar-size': `${item.percent}%` }} key={item.label}>
                          <span className="text-[13px] font-extrabold text-ink">{item.label}</span>
                          <b className="block h-[10px] w-full rounded-full bg-[linear-gradient(90deg,var(--color-primary)_var(--bar-size),#e5efec_var(--bar-size))]" />
                        </div>
                      ))}
                    </div>
                    )}
                  </article>
                </div>
          </div>
        )}

        {/* ================= APPOINTMENTS TAB ================= */}
        {activeTab === 'appointments' && (
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-5 max-[980px]:grid-cols-1">
            {/* Left Column: FIFO queue */}
            <div className={`${PANEL} p-5`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[18px] text-[#143d40]">Today&apos;s Patient Queue</h3>
                  <p className={KICKER}>First in, first out — earliest scheduled slot first, then arrival order</p>
                </div>
              </div>
              <QueueBoard
                queue={queue}
                canCheckIn={can('appointments.update')}
                canServe={can('consultations.create')}
                canApprove={can('appointments.approve')}
                busyId={queueBusyId}
                onCheckIn={handleCheckIn}
                onUndoCheckIn={handleUndoCheckIn}
                onServe={handleServe}
                onApprove={handleApproveEntry}
                onNoShow={handleNoShow}
                onOpenConsultations={canViewConsultations ? () => navigate('consultations') : undefined}
              />
            </div>

            {/* Right Column: Book Appointment Form */}
            <div className={`${PANEL} self-start p-5`}>
              <h3 className="m-0 text-[18px] text-[#143d40]">Book Walk-in Appointment</h3>
              <p className="mt-0.5 text-[12px] text-muted">Register a walk-in or phone schedule for today</p>

              {can('appointments.create') ? (
              <form onSubmit={handleAddAppointment} className={SIDEBAR_FORM}>
                <label className={FORM_LABEL}>
                  Student / Patient
                  <StudentSelect
                    value={appPatientId || appPatient}
                    valueKey="patientId"
                    allowCustomInput
                    placeholder="Type student name or ID..."
                    onChange={(val, student) => {
                      setAppPatient(student ? student.name : val || '')
                      setAppPatientId(student ? student.patientId : '')
                    }}
                  />
                </label>

                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Visit Type
                    <select value={appVisitType} onChange={(e) => setAppVisitType(e.target.value)} className={FORM_FIELD}>
                      {VISIT_TYPES.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label className={FORM_LABEL}>
                    Appointment Type
                    <select value={appType} onChange={(e) => setAppType(e.target.value)} className={FORM_FIELD}>
                      {APPOINTMENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className={FORM_LABEL}>
                  Assigned Doctor
                  <ClinicianSelect value={appStaffId} onChange={(id) => setAppStaffId(id)} unassignedLabel="Assign later" />
                </label>

                <label className={FORM_LABEL}>
                  Time Slot (today)
                  <select value={appTime} onChange={(e) => setAppTime(e.target.value)} className={FORM_FIELD}>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>

                <button type="submit" className={`${PRIMARY_BTN} w-full`} disabled={booking || !appPatient.trim()}>
                  {booking ? (
                    <>
                      <InlineSpinner />Booking...
                    </>
                  ) : (
                    'Book Appointment'
                  )}
                </button>
              </form>
              ) : (
                <p className="mt-3 text-[12.5px] text-muted">Your role cannot book appointments.</p>
              )}
            </div>
          </div>
        )}

        {/* ================= CONSULTATIONS TAB ================= */}
        {activeTab === 'consultations' && canViewConsultations && (
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-5 max-[980px]:grid-cols-1">
            {/* Left Column: List of consults */}
            <div className={`${PANEL} p-5`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[18px] text-[#143d40]">Clinical Consultation Logs</h3>
                  <p className={KICKER}>Detailed historical consultation diagnosis and treatment records</p>
                </div>
                <input
                  type="text"
                  placeholder="Search patient or diagnosis..."
                  value={consSearch}
                  onChange={(e) => setConsSearch(e.target.value)}
                  className={SEARCH_INPUT}
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-line">
                {consultationsError ? (
                  <ErrorState message={consultationsError} onRetry={refetchConsultations} />
                ) : consultationsLoading ? (
                  <TableSkeleton columns={6} />
                ) : (
                  <table className={TABLE}>
                    <thead>
                      <tr>
                        <th>Date/Time</th>
                        <th>Patient</th>
                        <th>Attending Doctor / Nurse</th>
                        <th>Symptoms & Vitals</th>
                        <th>Diagnosis & Treatment</th>
                        <th>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consPagination.pageItems.map((cons) => (
                        <tr key={cons.id}>
                          <td>
                            <span className="font-bold text-ink">{cons.date}</span>
                            <span className="block text-[12px] text-muted">{cons.time}</span>
                          </td>
                          <td className="font-bold text-ink">{cons.patient}</td>
                          <td className="font-bold text-primary">{cons.staff}</td>
                          <td>
                            <strong className="block text-[12px]">Complaint: {cons.chiefComplaint || '—'}</strong>
                            <span className="block text-[12px] text-muted">
                              BP: {cons.vitals.bloodPressure || '—'} | Temp: {cons.vitals.temperature || '—'} | Pulse: {cons.vitals.pulseRate || '—'}
                            </span>
                          </td>
                          <td>
                            <strong className="block text-[12px]">{cons.diagnosis}</strong>
                            <span className="block text-[12px] text-muted">{cons.treatment}</span>
                          </td>
                          <td>
                            {cons.disposition ? (
                              <span className={`inline-flex rounded-[4px] px-2 py-[3px] text-[11px] font-bold ${cons.disposition.toLowerCase().includes('class') ? 'bg-[#e8f5e9] text-[#2e7d32]' : cons.disposition.toLowerCase().includes('home') ? 'bg-[#fff3e0] text-[#ef6c00]' : cons.disposition.toLowerCase().includes('clinic') ? 'bg-[#e3f2fd] text-[#1565c0]' : 'bg-[#ffebee] text-[#c62828]'}`}>
                                {cons.disposition}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredConsultations.length === 0 && (
                        <tr>
                          <td colSpan="6">
                            <EmptyState message="No consultation records match search." />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <Pagination
                currentPage={consPagination.currentPage}
                totalPages={consPagination.totalPages}
                onPageChange={consPagination.goToPage}
              />
            </div>

            {/* Right Column: Add Consult form */}
            <div className={`${PANEL} self-start p-5`}>
              <h3 className="m-0 text-[18px] text-[#143d40]">Log New Consultation</h3>
              <p className="mt-0.5 text-[12px] text-muted">Log student symptoms and medication outcome</p>

              {patientsLoading || staffLoading ? (
                <FormSkeleton fields={6} />
              ) : (
              <form onSubmit={handleLogConsultation} className={SIDEBAR_FORM}>
                <label className={FORM_LABEL}>
                  <span>Student / Patient *</span>
                  <StudentSelect
                    value={effectiveConsPatient}
                    valueKey="name"
                    onChange={(name) => setConsPatient(name)}
                    patients={patients}
                    disabled={patientsLoading}
                    placeholder="Type student name or ID (e.g. 24-012345)..."
                  />
                </label>

                <label className={FORM_LABEL}>
                  Attending Doctor / Nurse
                  <ClinicianSelect value={consStaffId} onChange={(id) => setConsStaffId(id)} unassignedLabel="Select doctor / nurse" />
                </label>

                <label className={FORM_LABEL}>
                  Symptoms Reported
                  <input
                    type="text"
                    placeholder="e.g. Headache, Fever, Sprained ankle"
                    value={consSymptoms}
                    onChange={(e) => setConsSymptoms(e.target.value)}
                    required
                    className={FORM_FIELD}
                  />
                </label>

                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Blood Pressure
                    <input
                      type="text"
                      placeholder="120/80"
                      value={consBp}
                      onChange={(e) => setConsBp(e.target.value)}
                      className={FORM_FIELD}
                    />
                  </label>
                  <label className={FORM_LABEL}>
                    Temperature
                    <input
                      type="text"
                      placeholder="36.5°C"
                      value={consTemp}
                      onChange={(e) => setConsTemp(e.target.value)}
                      className={FORM_FIELD}
                    />
                  </label>
                  <label className={FORM_LABEL}>
                    Pulse
                    <input
                      type="text"
                      placeholder="75 bpm"
                      value={consPulse}
                      onChange={(e) => setConsPulse(e.target.value)}
                      className={FORM_FIELD}
                    />
                  </label>
                </div>

                <label className={FORM_LABEL}>
                  Diagnosis
                  <input
                    type="text"
                    placeholder="Clinical evaluation"
                    value={consDiagnosis}
                    onChange={(e) => setConsDiagnosis(e.target.value)}
                    required
                    className={FORM_FIELD}
                  />
                </label>

                <label className={FORM_LABEL}>
                  Treatment & Prescribed Meds
                  <textarea
                    placeholder="e.g. Paracetamol 500mg (1 tab), rest for 30 mins"
                    value={consTreatment}
                    onChange={(e) => setConsTreatment(e.target.value)}
                    required
                    className={`${FORM_FIELD} min-h-20 resize-y`}
                  />
                </label>

                <label className={FORM_LABEL}>
                  Disposition
                  <select value={consDisposition} onChange={(e) => setConsDisposition(e.target.value)} className={FORM_FIELD}>
                    <option value="Sent to Class">Sent to Class</option>
                    <option value="Sent Home">Sent Home</option>
                    <option value="Rest in Clinic">Rest in Clinic</option>
                    <option value="Referred to Hospital">Referred to Hospital</option>
                  </select>
                </label>

                <button type="submit" className={`${PRIMARY_BTN} w-full`} disabled={logging}>
                  {logging ? (
                    <>
                      <InlineSpinner />Logging...
                    </>
                  ) : (
                    'Log Consultation'
                  )}
                </button>
              </form>
              )}
            </div>
          </div>
        )}

        {/* ================= PATIENT OVERVIEW ================= */}
        {activeTab === 'patients' && (
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-5 max-[980px]:grid-cols-1">
            {/* Main Patients Database */}
            <div className={`${PANEL} p-5`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[18px] text-[#143d40]">Patient Registry</h3>
                  <p className={KICKER}>Comprehensive record of student patients</p>
                </div>
                <div className="flex gap-[10px]">
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={patSearch}
                    onChange={(e) => setPatSearch(e.target.value)}
                    className={SEARCH_INPUT}
                  />
                  <select
                    value={patFilter}
                    onChange={(e) => setPatFilter(e.target.value)}
                    className={SELECT_INPUT}
                  >
                    <option value="All">All Types</option>
                    <option value="Student">Student</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-line">
                {patientsError ? (
                  <ErrorState message={patientsError} onRetry={refetchPatients} />
                ) : patientsLoading ? (
                  <TableSkeleton columns={6} />
                ) : (
                  <table className={`${TABLE} [&_tbody_tr]:cursor-pointer [&_tbody_tr:hover]:bg-[#f7fbfb]`}>
                    <thead>
                      <tr>
                        <th>Patient ID</th>
                        <th>Full Name</th>
                        <th>Type</th>
                        <th>Course/Department</th>
                        <th>Allergies</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patPagination.pageItems.map((pat) => (
                        <tr
                          key={pat.id}
                          onClick={() => setSelectedPatient(pat)}
                          className="hover:[&_td]:text-primary"
                          title="Click to view full health record profile"
                        >
                          <td className="font-bold text-primary">{pat.id}</td>
                          <td className="font-bold text-ink">{pat.name}</td>
                          <td>{pat.type}</td>
                          <td>{pat.courseDept}</td>
                          <td className={pat.allergies !== 'None' ? 'font-bold text-danger' : ''}>
                            {pat.allergies}
                          </td>
                          <td>
                            <span className="inline-flex rounded-full bg-[#dff6dd] px-[10px] py-1 text-[11px] font-extrabold uppercase text-[#1e5a1b]">Active</span>
                          </td>
                        </tr>
                      ))}
                      {filteredPatients.length === 0 && (
                        <tr>
                          <td colSpan="6">
                            <EmptyState message="No patient profiles found." />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <Pagination
                currentPage={patPagination.currentPage}
                totalPages={patPagination.totalPages}
                onPageChange={patPagination.goToPage}
              />
            </div>

            {/* Right Column: Register New Patient Form */}
            <div className={`${PANEL} self-start p-5`}>
              <h3 className="m-0 text-[18px] text-[#143d40]">Create Patient Profile</h3>
              <p className="mt-0.5 text-[12px] text-muted">Register new student or campus staff</p>

              <form onSubmit={handleAddPatient} className={SIDEBAR_FORM}>
                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Patient ID
                    <input
                      type="text"
                      placeholder="e.g. 24-012345"
                      value={patId}
                      onChange={(e) => setPatId(e.target.value)}
                      required
                      className={FORM_FIELD}
                    />
                  </label>
                  <label className={FORM_LABEL}>
                    Full Name
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={patName}
                      onChange={(e) => setPatName(e.target.value)}
                      required
                      className={FORM_FIELD}
                    />
                  </label>
                </div>

                <div className={FORM_ROW}>
                  <label className={FORM_LABEL}>
                    Category
                    <select value={patType} onChange={(e) => setPatType(e.target.value)} className={FORM_FIELD}>
                      <option value="Student">Student</option>
                    </select>
                  </label>
                  <label className={FORM_LABEL}>
                    Course/Dept
                    <CourseSelect value={patDept} onChange={setPatDept} required />
                  </label>
                </div>

                <label className={FORM_LABEL}>
                  Contact Number
                  <input
                    type="tel"
                    placeholder="0917-123-4567"
                    value={patContact}
                    onChange={(e) => setPatContact(formatPhone(e.target.value))}
                    maxLength={13}
                    className={FORM_FIELD}
                  />
                </label>

                <label className={FORM_LABEL}>
                  Emergency Contact (Name & Phone)
                  <input
                    type="text"
                    placeholder="Guardian Name - 09xx..."
                    value={patEmergency}
                    onChange={(e) => setPatEmergency(e.target.value)}
                    required
                    className={FORM_FIELD}
                  />
                </label>

                <label className={FORM_LABEL}>
                  Known Allergies
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Nuts, None"
                    value={patAllergies}
                    onChange={(e) => setPatAllergies(e.target.value)}
                    className={FORM_FIELD}
                  />
                </label>

                <label className={FORM_LABEL}>
                  Medical History
                  <textarea
                    placeholder="e.g. Hypertension, Asthma, None"
                    value={patHistory}
                    onChange={(e) => setPatHistory(e.target.value)}
                    className={`${FORM_FIELD} min-h-20 resize-y`}
                  />
                </label>

                <button type="submit" className={`${PRIMARY_BTN} w-full`} disabled={addingPatient}>
                  {addingPatient ? (
                    <>
                      <InlineSpinner />Adding...
                    </>
                  ) : (
                    'Add Patient Profile'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= STAFF SHIFTS ================= */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 gap-5">
            {/* Left: Medical Staff Schedule Table */}
            <div className={`${PANEL} p-5`}>
              <div className={PANEL_HEADER}>
                <h3 className="m-0 text-[18px] text-[#143d40]">Medical Staff Shift Coverage</h3>
                <p className={KICKER}>Track doctor/nurse shifts and set active duty status</p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-line">
                {staffError ? (
                  <ErrorState message={staffError} onRetry={refetchStaff} />
                ) : staffLoading ? (
                  <TableSkeleton columns={5} />
                ) : (
                  <table className={TABLE}>
                    <thead>
                      <tr>
                        <th>Staff Member</th>
                        <th>Specialty Role</th>
                        <th>Shift Timings</th>
                        <th>Duty Status</th>
                        <th>Action Dropdown</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPagination.pageItems.map((member) => (
                        <tr key={member.name}>
                          <td className="font-bold text-ink">{member.name}</td>
                          <td>{member.role}</td>
                          <td className="font-mono text-primary">{member.shift}</td>
                          <td>
                            <StatusBadge status={member.status} />
                          </td>
                          <td>
                            <select
                              value={member.status}
                              onChange={(e) => handleUpdateStaffStatus(member.name, e.target.value)}
                              className={SELECT_INPUT}
                              disabled={statusUpdating === member.name}
                            >
                              <option value="On duty">On duty</option>
                              <option value="Break">Break</option>
                              <option value="Off duty">Off duty</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <Pagination
                currentPage={staffPagination.currentPage}
                totalPages={staffPagination.totalPages}
                onPageChange={staffPagination.goToPage}
              />
            </div>
          </div>
        )}

        {/* ================= CLINIC ACTIVITY ================= */}
        {activeTab === 'activity' && canViewActivity && (
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-5 max-[980px]:grid-cols-1">
            {/* Left: Peak Hours and Activity */}
            <div className={`${PANEL} p-5`}>
              {/* Peak Hours Chart */}
              <div>
                <div className={PANEL_HEADER}>
                  <h3 className="m-0 text-[18px] text-[#143d40]">Clinic Peak Activity Hours</h3>
                  <p className={KICKER}>Distribution load of patients visit by hour slot</p>
                </div>
                {insightsError ? (
                  <ErrorState message={insightsError} onRetry={refetchInsights} />
                ) : insightsLoading ? (
                  <CardSkeleton rows={4} />
                ) : (
                  <div className="mt-[14px] grid gap-3">
                    {peakHours.map((hour) => (
                      <div className="grid grid-cols-[150px_1fr_80px] items-center gap-3 max-[580px]:grid-cols-1" key={hour.label}>
                        <span className="text-[12.5px] font-bold text-ink">{hour.label}</span>
                        <div className="h-[10px] w-full rounded-full bg-[#e5efec]">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-300"
                            style={{ width: `${hour.percent}%` }}
                          />
                        </div>
                        <span className="text-right text-[12.5px] font-bold text-ink">{hour.count} visits</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live System Audit Log */}
            <div className={`${PANEL} self-start p-5`}>
              <h3 className="m-0 text-[18px] text-[#143d40]">Live Activity Audit Log</h3>
              <p className="mt-0.5 text-[12px] text-muted">Audit trail of administrator actions in real-time</p>

              <div className="mt-[14px] flex max-h-[480px] flex-col gap-[10px] overflow-y-auto pr-1">
                {logsError ? (
                  <ErrorState message={logsError} onRetry={refetchLogs} />
                ) : logsLoading ? (
                  <ListSkeleton rows={4} />
                ) : (
                  logsPagination.pageItems.map((log, idx) => (
                    <div className="flex gap-[10px] rounded-lg border border-line bg-[#fafcfb] p-[10px]" key={idx}>
                      <div className="font-mono text-[11px] font-extrabold text-primary">{log.time}</div>
                      <div>
                        <strong className="block text-[12.5px] text-ink">{log.user}</strong>
                        <p className="mt-0.5 text-[12px] leading-[1.3] text-muted">{log.action}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Pagination
                currentPage={logsPagination.currentPage}
                totalPages={logsPagination.totalPages}
                onPageChange={logsPagination.goToPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* ================= PATIENT PROFILE VIEW MODAL ================= */}
      {selectedPatient && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]">
          <div className="flex max-h-[90vh] w-[min(650px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]">
            <div className="flex items-center justify-between border-b border-line p-[16px_20px]">
              <h3 className="m-0 text-[18px] text-ink">Patient Health Profile Card</h3>
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft"
                onClick={() => setSelectedPatient(null)}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                <div>
                  <label className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Patient ID</label>
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.id}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Full Name</label>
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.name}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Category</label>
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.type}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Course/Department</label>
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.courseDept}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Phone Contact</label>
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.contact}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Emergency Contact</label>
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.emergencyContact}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-[#f2cfc2] bg-[#fdf1ec] p-[12px_14px]">
                <h4 className="mb-1 m-0 text-[13px] font-bold text-danger">⚠ Allergies</h4>
                <p className="m-0 text-[13px] font-bold text-ink">{selectedPatient.allergies}</p>
              </div>

              <div className="mt-3 rounded-lg border border-[#f2cfc2] bg-[#fdf1ec] p-[12px_14px]">
                <h4 className="mb-1 m-0 text-[13px] text-primary">✚ Medical History Background</h4>
                <p className="m-0 text-[13px]">{selectedPatient.history}</p>
              </div>

              {/* Consultation logs for this patient */}
              <div className="mt-5">
                <h4 className="mb-2 text-ink">Past Consultations</h4>
                {patientHistoryLogs.length > 0 ? (
                  <div className="flex flex-col gap-[10px]">
                    {patientHistoryLogs.map((log) => (
                      <div className="rounded-lg border border-line bg-[#fafcfb] p-[10px_12px]" key={log.id}>
                        <div className="mb-[5px] flex items-center justify-between">
                          <strong className="text-[12px] text-primary">{log.date} @ {log.time}</strong>
                          {log.disposition ? (
                            <span className={`inline-flex rounded-[4px] px-2 py-[3px] text-[11px] font-bold ${log.disposition.toLowerCase().includes('class') ? 'bg-[#e8f5e9] text-[#2e7d32]' : log.disposition.toLowerCase().includes('home') ? 'bg-[#fff3e0] text-[#ef6c00]' : log.disposition.toLowerCase().includes('clinic') ? 'bg-[#e3f2fd] text-[#1565c0]' : 'bg-[#ffebee] text-[#c62828]'}`}>
                              {log.disposition}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </div>
                        <p className="m-0 text-[12px] leading-[1.4] text-muted">
                          <strong>Diag:</strong> {log.diagnosis} <br />
                          <strong>Treatment:</strong> {log.treatment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#c2dcd6] p-4 text-center text-[12.5px] text-muted">
                    No clinical consultations recorded for this patient.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]">
              <button
                type="button"
                className={PILL}
                onClick={() => setSelectedPatient(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard
