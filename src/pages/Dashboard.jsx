import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppointments } from '../hooks/useAppointments'
import { usePatients } from '../hooks/usePatients'
import { useAcademicPrograms } from '../hooks/useAcademicPrograms'
import { useConsultations } from '../hooks/useConsultations'
import { useStaff } from '../hooks/useStaff'
import { useAdminActivityLogs } from '../hooks/useActivityLogs'
import { useClinicInsights } from '../hooks/useClinicInsights'
import { useQueue } from '../hooks/useQueue'
import { useAuth } from '../hooks/useAuth'
import { useAppContext } from '../context/AppContext'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { formatDate, todayISO } from '../lib/format'
import { dashboardConsultations, dashboardPatientGroups, onDutyStaff } from '../lib/dashboardPreview'
import { APPOINTMENT_TYPES, VISIT_NEW, currentSlot, departmentForType } from '../lib/clinic'
import { PILL, PRIMARY_BTN, PANEL, PANEL_HEADER, KICKER, TABLE, SEARCH_INPUT, SELECT_INPUT, SIDEBAR_FORM, FORM_LABEL, FORM_FIELD } from '../lib/ui'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import { EmptyState, ErrorState } from '../components/AsyncState'
import InlineSpinner from '../components/Spinner'
import RefreshingBadge from '../components/RefreshingBadge'
import DashboardCardSkeleton from '../components/skeletons/DashboardCardSkeleton'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import ListSkeleton from '../components/skeletons/ListSkeleton'
import CardSkeleton from '../components/skeletons/CardSkeleton'
import StudentSelect from '../components/StudentSelect'
import QueueBoard from '../components/QueueBoard'
import ClinicianSelect from '../components/ClinicianSelect'
import AppointmentTimePicker from '../components/AppointmentTimePicker'
import UserAvatar from '../components/UserAvatar'
import AdjustStaffStatusModal from '../components/AdjustStaffStatusModal'
import OnDutyStaffModal from '../components/OnDutyStaffModal'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview') // Overview, Queue, Consultations and Patient Registry
  const { can, userRole, user } = useAuth()
  // Web accounts store their full name in the authenticated account payload.
  // Skip professional titles so clinicians are greeted by their given name.
  const firstName = !['student', 'patient'].includes(userRole)
    ? (user?.name || '').trim().replace(/^(?:(?:dr|doctor|nurse|mr|mrs|ms|miss|prof)\.?\s+)+/i, '').split(/\s+/)[0]
    : ''
  const { navigate } = useAppContext()
  const canViewConsultations = can('consultations.view')
  const canCreateAppointments = userRole !== 'doctor' && can('appointments.create')
  // Audit logs are admin-only; the clinic activity summary is visible to staff.
  const canViewAuditLog = userRole === 'admin'
  const canEditStaffStatus = userRole === 'admin'

  // All data flows through shared custom hooks — the page never imports or
  // mutates shared store data directly.
  const {
    data: appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments,
    isRefetching: appointmentsRefetching,
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
  } = usePatients()

  const {
    data: consultations,
    isLoading: consultationsLoading,
    error: consultationsError,
    refetch: refetchConsultations,
  } = useConsultations('dashboard', { enabled: canViewConsultations })
  const queue = useQueue('dashboard')

  const { data: activityLogs, isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useAdminActivityLogs()
  const {
    data: clinicInsights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
    isRefetching: insightsRefetching,
  } = useClinicInsights()
  const { showToast } = useToast()

  // Modals & Panels Active States
  const [selectedPatientEntry, setSelectedPatient] = useState(null)
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientEntry?.id) || null

  // Book Appointment Form State
  const [appPatient, setAppPatient] = useState('')
  const [appPatientId, setAppPatientId] = useState('')
  const [appType, setAppType] = useState('General Check-up')
  const [appTime, setAppTime] = useState(() => currentSlot())
  const [appStaffId, setAppStaffId] = useState(null)
  const [queueBusyId, setQueueBusyId] = useState(null)
  const [booking, setBooking] = useState(false)
  const [adjustShiftOpen, setAdjustShiftOpen] = useState(false)
  const [onDutyOpen, setOnDutyOpen] = useState(false)
  const newAppointmentsRef = useRef(null)
  const [statusUpdating, setStatusUpdating] = useState(null) // staff name currently being toggled

  // Search/Filters State
  const { search: consSearch, setSearch: setConsSearch, debouncedSearch: debouncedConsSearch } = useSearch()
  const { search: patSearch, setSearch: setPatSearch, debouncedSearch: debouncedPatSearch } = useSearch()
  const [patDepartment, setPatDepartment] = useState('')
  const [patCategory, setPatCategory] = useState('all')
  const { groups: academicDepartments } = useAcademicPrograms()

  // Appointment Actions
  const handleAddAppointment = async (e) => {
    e.preventDefault()
    if (!canCreateAppointments || booking || !appPatient.trim()) return
    setBooking(true)
    try {
      await createAppointment({
        patient: appPatient.trim(),
        patientId: appPatientId,
        type: appType,
        visitType: VISIT_NEW,
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

  // Staff coverage action
  const handleUpdateStaffStatus = async (member, newStatus) => {
    if (!canEditStaffStatus || statusUpdating) return
    setStatusUpdating(member.userId)
    try {
      await updateStaffStatus(member.name, newStatus, member.userId)
      showToast(`Status of ${member.name} updated to ${newStatus} for today.`)
    } catch (err) {
      showToast(err?.message || 'Failed to update staff status.', 'error')
    } finally {
      setStatusUpdating(null)
    }
  }

  const onDutyMembers = useMemo(() => onDutyStaff(staff), [staff])
  const handleSummaryCard = (target) => {
    if (target === 'newAppointments') {
      const section = newAppointmentsRef.current
      section?.focus({ preventScroll: true })
      section?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    } else if (target === 'onDuty') {
      setOnDutyOpen(true)
      refetchStaff()
    } else {
      if (target === 'patients') {
        setPatCategory('all')
        setPatSearch('')
        setPatDepartment('')
        patPagination.resetPage()
      }
      if (target === 'consultations') {
        setConsSearch('')
        consPagination.resetPage()
      }
      setActiveTab(target)
    }
  }

  // Stats derivation
  const activeStats = useMemo(() => {
    const todayAppts = appointments.filter((a) => a.date === todayISO() && !['Cancelled', 'Rejected', 'Expired', 'No-Show'].includes(a.status)).length
    const activeCons = staff.filter((s) => s.status === 'On duty').length
    const scheduledToday = staff.filter((s) => s.scheduledToday).length
    const totalPats = patients.length
    const totalConsults = consultations.length
    return [
      { target: 'newAppointments', label: "Today's Appointments", value: todayAppts, trend: `${appointments.filter((a) => a.status === 'Pending').length} pending review` },
      { target: 'onDuty', label: 'On-Duty Staff', value: activeCons, trend: `${scheduledToday} scheduled today · ${staff.filter((s) => s.status === 'Break').length} on break` },
      { target: 'patients', label: 'Registered Patients', value: totalPats, trend: 'Unified clinic health list' },
      canViewConsultations
        ? { target: 'consultations', label: 'Total Consultations', value: totalConsults, trend: 'Clinic visit records logged' }
        : { target: 'appointments', label: 'Waiting in Queue', value: queue.meta?.waiting ?? 0, trend: `${queue.meta?.expected ?? 0} expected today` },
    ]
  }, [appointments, staff, patients, consultations, canViewConsultations, queue.meta])

  // Filtered Consultations
  const filteredConsultations = useMemo(() => {
    return dashboardConsultations(consultations, todayISO()).filter((cons) => {
      const matchSearch =
        cons.patient.toLowerCase().includes(debouncedConsSearch.toLowerCase()) ||
        cons.diagnosis.toLowerCase().includes(debouncedConsSearch.toLowerCase())
      return matchSearch
    })
  }, [consultations, debouncedConsSearch])

  // Filtered Patients
  const departmentByCourse = useMemo(() => new Map(
    academicDepartments.flatMap((group) => group.courses.map((course) => [course, group.department])),
  ), [academicDepartments])
  const patientDepartments = useMemo(() => [...new Set([
    ...academicDepartments.map((group) => group.department),
    ...patients.map((patient) => {
      const course = (patient.courseDept || '').trim()
      return departmentByCourse.get(course) || course
    }).filter(Boolean),
  ])].sort((a, b) => a.localeCompare(b)), [academicDepartments, patients, departmentByCourse])

  const registryToday = todayISO()
  const registrationGroups = useMemo(
    () => dashboardPatientGroups(patients, registryToday),
    [patients, registryToday],
  )
  const patientSummaryCards = [
    { key: 'all', label: 'Recent Patients', trend: 'New registrations or active visits in the last 7 days' },
    { key: 'today', label: 'New Patients Today', trend: 'Registered today' },
    { key: 'active', label: 'Active Patients', trend: 'Active patients in this 7-day preview' },
  ]

  const filteredPatients = useMemo(() => {
    const q = debouncedPatSearch.trim().toLowerCase()
    return registrationGroups[patCategory]
      .filter((pat) => {
        const matchSearch = pat.name.toLowerCase().includes(q) || (pat.patientId || '').toLowerCase().includes(q)
        const course = (pat.courseDept || '').trim()
        const matchFilter = !patDepartment || (departmentByCourse.get(course) || course) === patDepartment
        return matchSearch && matchFilter
      })
      .sort((a, b) => (a.patientId || '').localeCompare(b.patientId || '', undefined, { numeric: true }))
  }, [registrationGroups, patCategory, debouncedPatSearch, patDepartment, departmentByCourse])

  // Client-side pagination per list — swap for API-driven pages later without
  // touching the tables or the Pagination UI.
  const consPagination = usePagination(filteredConsultations)
  const patPagination = usePagination(filteredPatients)
  const logsPagination = usePagination(activityLogs)

  const { resetPage: resetConsPage } = consPagination
  const { resetPage: resetPatPage } = patPagination

  // Search/filter changes always reset to page 1.
  useEffect(() => {
    resetConsPage()
  }, [debouncedConsSearch, resetConsPage])
  useEffect(() => {
    resetPatPage()
  }, [debouncedPatSearch, patDepartment, patCategory, resetPatPage])

  // Patient history for detail lookup
  const patientHistoryLogs = useMemo(() => {
    if (!selectedPatient) return []
    return consultations.filter((c) => c.patientId && c.patientId === selectedPatient.patientId)
  }, [selectedPatient, consultations])

  const newAppointments = useMemo(() => appointments
    .filter((appointment) => ['Pending', 'Under Review'].includes(appointment.status))
    .sort((a, b) => b.id - a.id), [appointments])

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
              Welcome back{userRole === 'admin' ? ', Admin' : firstName ? `, ${firstName}` : ''}!
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
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap rounded-xl border-0 px-3.5 py-2 text-[12.5px] sm:text-[13px] font-extrabold transition-all duration-150 ${activeTab === 'patients' ? 'bg-primary text-white shadow-xs' : 'text-muted-soft hover:bg-white/60 hover:text-primary'}`}
            onClick={() => setActiveTab('patients')}
          >
            Patient Registry
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
                  <button type="button" key={item.label} onClick={() => handleSummaryCard(item.target)} aria-label={`${item.label}: ${item.value}`} aria-haspopup={item.target === 'onDuty' ? 'dialog' : undefined} className="group relative cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary overflow-hidden rounded-2xl border border-line-strong/80 bg-white p-3.5 sm:p-5 shadow-[0_4px_24px_rgba(18,57,59,0.06)] transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(18,57,59,0.1)]">
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
                  </button>
                ))}
              </div>
            )}

                {/* Overview Multi Grid */}
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)] gap-5 max-[980px]:grid-cols-1">
                  {/* Patient visits by time of day */}
                  <article className={`${PANEL} flex min-w-0 min-h-[330px] flex-col`}>
                    <div className={PANEL_HEADER}>
                      <div>
                        <h3 className="m-0 text-[17px] sm:text-[18px] font-bold text-[#143d40]">Clinic Peak Activity Hours</h3>
                        <p className="mb-0 mt-1 text-[12px] leading-relaxed text-muted">Patient visits by time of day for the current school week.</p>
                      </div>
                      <RefreshingBadge refreshing={insightsRefetching && !insightsLoading} />
                    </div>
                    {insightsError ? <ErrorState message={insightsError} onRetry={refetchInsights} /> : insightsLoading ? <CardSkeleton rows={5} /> : (
                      <div className="flex flex-1 flex-col justify-center">
                        <div className="mb-3 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-muted">
                          <span>Time of Day</span><span>Patient Visits</span>
                        </div>
                        <ul className="m-0 grid list-none gap-4 p-0" aria-label="Patient visits by time of day">
                          {peakHours.map((hour) => (
                            <li className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_32px] items-center gap-3 max-[480px]:grid-cols-[minmax(0,118px)_minmax(0,1fr)_24px] max-[480px]:gap-2" key={hour.label}>
                              <span className="text-[11px] sm:text-[12px] font-bold tabular-nums text-ink">{hour.label}</span>
                              <div className="h-3 overflow-hidden rounded-full bg-[#e5efec]" aria-hidden="true">
                                <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${hour.percent}%` }} />
                              </div>
                              <span className="text-right text-[12px] font-extrabold tabular-nums text-ink" aria-label={`${hour.count} patient visits`}>{hour.count}</span>
                            </li>
                          ))}
                        </ul>
                        {peakHours.every((hour) => !hour.count) && <p role="status" className="mb-0 mt-4 text-[12px] text-muted">No patient visits for the current school week.</p>}
                      </div>
                    )}
                  </article>

                  {/* Staff Shift Status Quick View */}
                  <article className={`${PANEL} min-w-0 min-h-[330px]`}>
                    <div className={PANEL_HEADER}>
                      <div>
                        <p className={KICKER}>Coverage Summary</p>
                        <h3 className="m-0 text-[18px] text-[#143d40]">Staff Status</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshingBadge refreshing={staffRefetching && !staffLoading} />
                        {canEditStaffStatus && <button type="button" className="cursor-pointer rounded-[7px] bg-bg px-3 py-2 font-extrabold text-primary" onClick={() => setAdjustShiftOpen(true)}>Adjust Shift</button>}
                      </div>
                    </div>
                    {staffError ? (
                      <ErrorState message={staffError} onRetry={refetchStaff} />
                    ) : staffLoading ? (
                      <ListSkeleton rows={4} avatar />
                    ) : (
                    <div className="grid max-h-[280px] gap-[10px] overflow-y-auto">
                      {staff.length === 0 && (
                        <EmptyState message="No active doctors or nurses yet. Add them in User Management and plan their shifts in the Doctor/Nurse Schedule." />
                      )}
                      {staff.map((member) => (
                        <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line p-3" key={member.userId}>
                          <div className="grid size-[42px] place-items-center rounded-full bg-accent text-[13px] font-extrabold text-[#fffaf3]"><UserAvatar user={member} className="size-full" /></div>
                          <div>
                            <strong className="block text-ink">{member.name}</strong>
                            <span className="block text-[12px] text-muted">{member.role} · {member.department}</span>
                            <span className="block text-[11.5px] font-bold text-primary">{member.shift}</span>
                          </div>
                          <div className="col-start-2">
                            <StatusBadge status={member.status === 'Break' ? 'On Break' : member.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </article>

                  {/* New appointment requests */}
                  <article ref={newAppointmentsRef} tabIndex={-1} aria-labelledby="new-appointments-title" className={`${PANEL} min-w-0 min-h-[330px] scroll-mt-24`}>
                    <div className={PANEL_HEADER}>
                      <h3 className="m-0 text-[17px] sm:text-[18px] font-bold text-[#143d40]" id="new-appointments-title">New Appointments</h3>
                      <RefreshingBadge refreshing={appointmentsRefetching && !appointmentsLoading} />
                    </div>
                    {appointmentsError ? (
                      <ErrorState message={appointmentsError} onRetry={refetchAppointments} />
                    ) : (
                      <div className="max-h-[280px] overflow-auto rounded-lg border border-line">
                        {appointmentsLoading ? <TableSkeleton columns={2} /> : (
                        <table className={TABLE}>
                          <thead><tr><th>Patient Name</th><th>Appointment Date</th></tr></thead>
                          <tbody>
                            {newAppointments.length === 0 ? (
                              <tr><td colSpan="2"><EmptyState message="No new appointment requests." /></td></tr>
                            ) : newAppointments.map((appointment) => (
                              <tr key={appointment.id}>
                                <td className="font-bold text-ink">{appointment.patient}</td>
                                <td className="text-[12.5px] text-muted">{formatDate(appointment.date)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        )}
                      </div>
                    )}
                  </article>

                  {canViewAuditLog && (
                    <article className={`${PANEL} min-w-0 min-h-[330px]`}>
                      <div className={PANEL_HEADER}>
                        <h3 className="m-0 text-[18px] text-[#143d40]">Live Activity Audit Log</h3>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary"><span className="size-2 rounded-full bg-success" />Live</span>
                      </div>
                      <div className="flex max-h-[280px] flex-col gap-[10px] overflow-y-auto pr-1" aria-live="polite" aria-relevant="additions text">
                        {logsError ? <ErrorState message={logsError} onRetry={refetchLogs} /> : logsLoading ? <ListSkeleton rows={4} /> : logsPagination.pageItems.length === 0 ? <EmptyState message="No administrator actions recorded yet." /> : logsPagination.pageItems.map((log) => (
                          <div className="flex gap-[10px] rounded-lg border border-line bg-[#fafcfb] p-[10px]" key={log.id}>
                            <time dateTime={log.createdAt} title={log.createdAt ? new Date(log.createdAt).toLocaleString() : undefined} className="shrink-0 font-mono text-[11px] font-extrabold text-primary">{log.time}</time>
                            <div>
                              <strong className="block text-[12.5px] text-ink">{log.user}</strong>
                              <p className="mb-0 mt-0.5 text-[12px] leading-[1.3] text-muted">{log.action}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination currentPage={logsPagination.currentPage} totalPages={logsPagination.totalPages} onPageChange={logsPagination.goToPage} />
                    </article>
                  )}
                </div>
          </div>
        )}

        {/* ================= APPOINTMENTS TAB ================= */}
        {activeTab === 'appointments' && (
          <div className={`grid gap-5 ${canCreateAppointments ? 'grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] max-[980px]:grid-cols-1' : 'grid-cols-1'}`}>
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
            {canCreateAppointments && (
            <div className={`${PANEL} self-start p-5`}>
              <h3 className="m-0 text-[18px] text-[#143d40]">Book Walk-in Appointment</h3>
              <p className="mt-0.5 text-[12px] text-muted">Register a walk-in or phone schedule for today</p>

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

                <label className={FORM_LABEL}>
                  Appointment Type
                  <select
                    value={appType}
                    onChange={(e) => {
                      setAppType(e.target.value)
                      setAppStaffId(null)
                    }}
                    className={FORM_FIELD}
                  >
                    {APPOINTMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>

                <label className={FORM_LABEL}>
                  Assign Doctor / Nurse
                  <ClinicianSelect
                    department={departmentForType(appType)}
                    value={appStaffId}
                    onChange={(id) => setAppStaffId(id)}
                    unassignedLabel="Assign later"
                    aria-label="Assign Doctor / Nurse"
                  />
                </label>

                <label className={FORM_LABEL}>
                  Time Slot (today, 8:00 AM – 5:00 PM)
                  <AppointmentTimePicker date={todayISO()} staffId={appStaffId} value={appTime} onChange={setAppTime} className={FORM_FIELD} required />
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
            </div>
            )}
          </div>
        )}

        {/* ================= CONSULTATIONS TAB ================= */}
        {activeTab === 'consultations' && canViewConsultations && (
          <div className="grid grid-cols-1 gap-5">
            {/* Left Column: List of consults */}
            <div className={`${PANEL} p-5`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[18px] text-[#143d40]">Clinical Consultation Logs</h3>
                  <p className={KICKER}>New and completed consultations from the last 7 days</p>
                </div>
                <div className="flex flex-wrap items-center gap-[10px]">
                <input
                  type="text"
                  placeholder="Search patient or diagnosis..."
                  value={consSearch}
                  onChange={(e) => setConsSearch(e.target.value)}
                  className={SEARCH_INPUT}
                />
                  <Link to="/consultations" className={`${PILL} shrink-0 no-underline`}>View All</Link>
                </div>
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

          </div>
        )}

        {/* ================= PATIENT OVERVIEW ================= */}
        {activeTab === 'patients' && (
          <div className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
              {patientsLoading ? (
                Array.from({ length: 3 }, (_, index) => <DashboardCardSkeleton key={index} />)
              ) : patientsError ? null : patientSummaryCards.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={patCategory === item.key}
                  onClick={() => setPatCategory(item.key)}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-3.5 text-left shadow-[0_4px_24px_rgba(18,57,59,0.06)] transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(18,57,59,0.1)] sm:p-5 ${patCategory === item.key ? 'border-primary ring-2 ring-primary/20' : 'border-line-strong/80'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-soft sm:text-[12px]">{item.label}</span>
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${patCategory === item.key ? 'bg-primary' : 'bg-primary/30'}`} />
                  </div>
                  <strong className="mb-1 mt-2 block text-[24px] font-extrabold leading-none tracking-tight text-[#10393b] sm:mt-3 sm:text-[32px]">
                    {registrationGroups[item.key].length}
                  </strong>
                  <span className="block text-[11px] font-medium text-muted sm:text-[12px]">{item.trend}</span>
                </button>
              ))}
            </div>
            {/* Main Patients Database */}
            <div className={`${PANEL} p-5`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[18px] text-[#143d40]">Patient Registry</h3>
                  <p className={KICKER}>Active patients registered or seen in the last 7 days</p>
                </div>
                <div className="flex flex-wrap gap-[10px]">
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={patSearch}
                    onChange={(e) => setPatSearch(e.target.value)}
                    className={SEARCH_INPUT}
                  />
                  <select
                    aria-label="By Department"
                    value={patDepartment}
                    onChange={(e) => setPatDepartment(e.target.value)}
                    className={SELECT_INPUT}
                  >
                    <option value="">By Department</option>
                    {patientDepartments.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                  <Link to="/patients" className={`${PILL} shrink-0 no-underline`}>View All</Link>
                  {(patSearch || patDepartment || patCategory !== 'all') && (
                    <button type="button" className={PILL} onClick={() => {
                      setPatSearch('')
                      setPatDepartment('')
                      setPatCategory('all')
                    }}>Clear filters</button>
                  )}
                </div>
              </div>

              {!patientsLoading && !patientsError && (
                <p role="status" className="mb-3 text-[12px] text-muted">
                  {patientSummaryCards.find((item) => item.key === patCategory).label}: {filteredPatients.length} of {registrationGroups[patCategory].length} patients
                </p>
              )}

              <div className="overflow-x-auto rounded-lg border border-line">
                {patientsError ? (
                  <ErrorState message={patientsError} onRetry={refetchPatients} />
                ) : patientsLoading ? (
                  <TableSkeleton columns={5} />
                ) : (
                  <table className={`${TABLE} [&_tbody_tr]:cursor-pointer [&_tbody_tr:hover]:bg-[#f7fbfb]`}>
                    <thead>
                      <tr>
                        <th>Patient ID</th>
                        <th>Full Name</th>
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
                          <td className="font-bold text-primary">{pat.patientId}</td>
                          <td className="font-bold text-ink">{pat.name}</td>
                          <td>{pat.courseDept}</td>
                          <td className={pat.allergies !== 'None' ? 'font-bold text-danger' : ''}>
                            {pat.allergies}
                          </td>
                          <td>
                            <StatusBadge status={pat.status} />
                          </td>
                        </tr>
                      ))}
                      {filteredPatients.length === 0 && (
                        <tr>
                          <td colSpan="5">
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

          </div>
        )}

      </div>

      {onDutyOpen && (
        <OnDutyStaffModal staff={onDutyMembers} loading={staffLoading} error={staffError} onRetry={refetchStaff} onClose={() => setOnDutyOpen(false)} />
      )}

      {canEditStaffStatus && adjustShiftOpen && (
        <AdjustStaffStatusModal staff={staff} loading={staffLoading} error={staffError} onRetry={refetchStaff} updating={statusUpdating} onUpdate={handleUpdateStaffStatus} onClose={() => setAdjustShiftOpen(false)} />
      )}

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
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.patientId}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Full Name</label>
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.name}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Age</label>
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.age ?? '—'}</p>
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-extrabold uppercase text-muted">Sex</label>
                  <p className="m-0 text-[14px] font-bold text-ink">{selectedPatient.sex || '—'}</p>
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
