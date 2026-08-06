import { useEffect, useMemo, useState } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import { usePatients } from '../hooks/usePatients'
import { useConsultations } from '../hooks/useConsultations'
import { useStaff } from '../hooks/useStaff'
import { useActivityLogs } from '../hooks/useActivityLogs'
import { useClinicEvents } from '../hooks/useClinicEvents'
import { useClinicInsights } from '../hooks/useClinicInsights'
import { useToast } from '../hooks/useToast'
import { useSearch } from '../hooks/useSearch'
import { usePagination } from '../hooks/usePagination'
import { formatDate, todayISO } from '../lib/format'
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

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'appointments', 'consultations', 'patients', 'schedule', 'activity'

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
  } = useAppointments()

  const {
    data: staff,
    isLoading: staffLoading,
    error: staffError,
    refetch: refetchStaff,
    isRefetching: staffRefetching,
    updateStaffStatus,
  } = useStaff()

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
  } = useConsultations()

  const { data: activityLogs, isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useActivityLogs()
  const { data: events, isLoading: eventsLoading, error: eventsError, refetch: refetchEvents, addEvent } = useClinicEvents()
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
  const [appType, setAppType] = useState('Check-up')
  const [appTime, setAppTime] = useState('09:00 AM')
  const [booking, setBooking] = useState(false)
  const [logging, setLogging] = useState(false)
  const [addingPatient, setAddingPatient] = useState(false)
  const [addingEvent, setAddingEvent] = useState(false)
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
  const [consStaff, setConsStaff] = useState('')

  // Add Patient Form State
  const [patId, setPatId] = useState('')
  const [patName, setPatName] = useState('')
  const [patType, setPatType] = useState('Student')
  const [patDept, setPatDept] = useState('')
  const [patContact, setPatContact] = useState('')
  const [patEmergency, setPatEmergency] = useState('')
  const [patAllergies, setPatAllergies] = useState('')
  const [patHistory, setPatHistory] = useState('')

  // Add Event Form State
  const [evtDate, setEvtDate] = useState('')
  const [evtTitle, setEvtTitle] = useState('')
  const [evtDesc, setEvtDesc] = useState('')

  // Search/Filters State
  const { search: appSearch, setSearch: setAppSearch, debouncedSearch: debouncedAppSearch } = useSearch()
  const { search: consSearch, setSearch: setConsSearch, debouncedSearch: debouncedConsSearch } = useSearch()
  const { search: patSearch, setSearch: setPatSearch, debouncedSearch: debouncedPatSearch } = useSearch()
  const [appFilter, setAppFilter] = useState('All')
  const [patFilter, setPatFilter] = useState('All')

  // Derived defaults for the consultation form (patients/staff load async).
  const effectiveConsPatient = consPatient || patients[0]?.name || ''
  const effectiveConsStaff = consStaff || staff[0]?.name || ''

  // Appointment Actions
  const handleUpdateAppointmentStatus = async (id, newStatus) => {
    try {
      await updateAppointmentStatus(id, newStatus)
      showToast(`Appointment updated to ${newStatus}.`)
    } catch (err) {
      showToast(err?.message || 'Failed to update the appointment.', 'error')
    }
  }

  const handleAddAppointment = async (e) => {
    e.preventDefault()
    if (booking || !appPatient.trim()) return
    setBooking(true)
    try {
      await createAppointment({
        patient: appPatient.trim(),
        type: appType,
        date: todayISO(),
        time: appTime,
        reason: appType,
      })
      showToast('Appointment booked successfully.')
      setAppPatient('')
    } catch (err) {
      showToast(err?.message || 'Failed to book the appointment.', 'error')
    } finally {
      setBooking(false)
    }
  }

  // Consultation Actions
  const handleLogConsultation = async (e) => {
    e.preventDefault()
    if (logging || !effectiveConsPatient.trim() || !consDiagnosis.trim()) return
    setLogging(true)
    try {
      await addConsultation({
        patient: effectiveConsPatient,
        staff: effectiveConsStaff,
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

  // Event Action
  const handleAddEvent = async (e) => {
    e.preventDefault()
    if (addingEvent || !evtTitle.trim() || !evtDate.trim()) return
    setAddingEvent(true)
    try {
      await addEvent({
        date: evtDate,
        title: evtTitle,
        description: evtDesc,
      })
      showToast(`Clinic event scheduled: ${evtTitle}`)
      setEvtDate('')
      setEvtTitle('')
      setEvtDesc('')
    } catch (err) {
      showToast(err?.message || 'Failed to schedule the event.', 'error')
    } finally {
      setAddingEvent(false)
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
      { label: 'Total Consultations', value: totalConsults, trend: 'Clinic visit records logged' },
    ]
  }, [appointments, staff, patients, consultations])

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const matchSearch = app.patient.toLowerCase().includes(debouncedAppSearch.toLowerCase())
      const matchFilter = appFilter === 'All' || app.status === appFilter
      return matchSearch && matchFilter
    })
  }, [appointments, debouncedAppSearch, appFilter])

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
  const appPagination = usePagination(filteredAppointments)
  const consPagination = usePagination(filteredConsultations)
  const patPagination = usePagination(filteredPatients)
  const logsPagination = usePagination(activityLogs)
  const staffPagination = usePagination(staff)

  const { resetPage: resetAppPage } = appPagination
  const { resetPage: resetConsPage } = consPagination
  const { resetPage: resetPatPage } = patPagination

  // Search/filter changes always reset to page 1.
  useEffect(() => {
    resetAppPage()
  }, [debouncedAppSearch, appFilter, resetAppPage])
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

  // Appointments awaiting attention (pending + under review)
  const pendingQueue = useMemo(() => {
    return appointments.filter((a) => a.status === 'Pending' || a.status === 'Under Review')
  }, [appointments])

  // Overview load state — each widget loads independently, so a slow API
  // never blocks the whole dashboard. These booleans drive the stat cards
  // (derived from four stores) while every other widget manages its own
  // loading/error state below.
  const statsLoading = appointmentsLoading || staffLoading || patientsLoading || consultationsLoading
  const statsError = appointmentsError || staffError || patientsError || consultationsError
  const retryStats = () => {
    refetchAppointments()
    refetchStaff()
    refetchPatients()
    refetchConsultations()
    refetchInsights()
  }

  const activity = clinicInsights?.clinicActivity || []
  const peakHours = clinicInsights?.peakHours || []

  return (
    <div>
      {/* Dashboard Top Header & Tabs */}
      <section className="mb-6">
        <div className="mb-5 flex items-center justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
          <div>
            <p className={KICKER}>TMC Clinic Administration</p>
            <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">Clinic Command Center</h2>
          </div>
          <div>
            {activeTab !== 'overview' && (
              <button type="button" className={PILL} onClick={() => setActiveTab('overview')}>
                ← Back to Overview
              </button>
            )}
          </div>
        </div>

        <nav className="mt-[14px] flex gap-2 overflow-x-auto border-b-2 border-[#dce8e5] pb-px">
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap border-0 border-b-[3px] border-transparent bg-transparent px-4 py-[10px] font-bold text-muted-soft transition-all duration-200 hover:border-[#a9d1ca] hover:text-primary ${activeTab === 'overview' ? 'border-primary text-primary' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap border-0 border-b-[3px] border-transparent bg-transparent px-4 py-[10px] font-bold text-muted-soft transition-all duration-200 hover:border-[#a9d1ca] hover:text-primary ${activeTab === 'appointments' ? 'border-primary text-primary' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            Appointment Queue ({pendingQueue.length})
          </button>
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap border-0 border-b-[3px] border-transparent bg-transparent px-4 py-[10px] font-bold text-muted-soft transition-all duration-200 hover:border-[#a9d1ca] hover:text-primary ${activeTab === 'consultations' ? 'border-primary text-primary' : ''}`}
            onClick={() => setActiveTab('consultations')}
          >
            Consultation Logs
          </button>
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap border-0 border-b-[3px] border-transparent bg-transparent px-4 py-[10px] font-bold text-muted-soft transition-all duration-200 hover:border-[#a9d1ca] hover:text-primary ${activeTab === 'patients' ? 'border-primary text-primary' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            Patient Registry
          </button>
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap border-0 border-b-[3px] border-transparent bg-transparent px-4 py-[10px] font-bold text-muted-soft transition-all duration-200 hover:border-[#a9d1ca] hover:text-primary ${activeTab === 'schedule' ? 'border-primary text-primary' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Staff Shifts & Events
          </button>
          <button
            type="button"
            className={`cursor-pointer whitespace-nowrap border-0 border-b-[3px] border-transparent bg-transparent px-4 py-[10px] font-bold text-muted-soft transition-all duration-200 hover:border-[#a9d1ca] hover:text-primary ${activeTab === 'activity' ? 'border-primary text-primary' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Clinic Activity
          </button>
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
              <div className="mb-[18px] grid grid-cols-4 gap-[14px] max-[980px]:grid-cols-1">
                {Array.from({ length: 4 }, (_, i) => (
                  <DashboardCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="mb-[18px] grid grid-cols-4 gap-[14px] max-[980px]:grid-cols-1">
                {activeStats.map((item) => (
                  <article key={item.label} className={PANEL}>
                    <p className="m-0 text-[13px] text-muted">{item.label}</p>
                    <strong className="mb-[5px] mt-[10px] block text-[32px] leading-none text-[#10393b]">{item.value}</strong>
                    <span className="text-[12px] text-muted">{item.trend}</span>
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
                        <p className={KICKER}>Queue Management</p>
                        <h3 className="m-0 text-[18px] text-[#143d40]">Today's Pending Appointments</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshingBadge refreshing={appointmentsRefetching && !appointmentsLoading} />
                        <button type="button" className="cursor-pointer rounded-[7px] bg-bg px-3 py-2 font-extrabold text-primary" onClick={() => setActiveTab('appointments')}>Manage Queue</button>
                      </div>
                    </div>
                    {appointmentsError ? (
                      <ErrorState message={appointmentsError} onRetry={refetchAppointments} />
                    ) : appointmentsLoading ? (
                      <ListSkeleton rows={3} />
                    ) : (
                    <div className="grid gap-[10px]">
                      {pendingQueue.slice(0, 3).map((app) => (
                        <div className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line p-3 max-[620px]:grid-cols-1" key={app.id}>
                          <div className="text-[13px] font-extrabold text-primary">{app.time}</div>
                          <div>
                            <strong className="block text-ink">{app.patient}</strong>
                            <span className="block text-[12px] text-muted">{app.type}</span>
                          </div>
                          <div className="flex flex-wrap gap-[6px]">
                            {app.status === 'Pending' && (
                              <button
                                type="button"
                                className="cursor-pointer rounded-md bg-primary px-[10px] py-[6px] text-[12px] font-extrabold text-white transition-all duration-200 hover:bg-[#08484d]"
                                onClick={() => handleUpdateAppointmentStatus(app.id, 'Under Review')}
                              >
                                Review
                              </button>
                            )}
                            <button
                              type="button"
                              className="cursor-pointer rounded-md bg-success px-3 py-[6px] text-[12px] font-extrabold text-white transition-all duration-200 hover:bg-[#238b55]"
                              onClick={() => handleUpdateAppointmentStatus(app.id, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="cursor-pointer rounded-md bg-accent px-3 py-[6px] text-[12px] font-extrabold text-white transition-all duration-200 hover:bg-[#b6451e]"
                              onClick={() => handleUpdateAppointmentStatus(app.id, 'Rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                      {pendingQueue.length === 0 && (
                        <EmptyState message="No pending appointments today." />
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
            {/* Left Column: Appts List */}
            <div className={`${PANEL} p-5`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[18px] text-[#143d40]">Interactive Appointment Queue</h3>
                  <p className={KICKER}>Students, staff, and faculty requests</p>
                </div>
                <div className="flex gap-[10px]">
                  <input
                    type="text"
                    placeholder="Search patient..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className={SEARCH_INPUT}
                  />
                  <select
                    value={appFilter}
                    onChange={(e) => setAppFilter(e.target.value)}
                    className={SELECT_INPUT}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-line">
                {appointmentsError ? (
                  <ErrorState message={appointmentsError} onRetry={refetchAppointments} />
                ) : appointmentsLoading ? (
                  <TableSkeleton columns={5} />
                ) : (
                  <table className={TABLE}>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Patient</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appPagination.pageItems.map((app) => (
                        <tr key={app.id}>
                          <td className="font-bold text-primary">
                            {app.time}
                            <span className="block text-[12px]">{formatDate(app.date)}</span>
                          </td>
                          <td className="font-bold text-ink">{app.patient}</td>
                          <td>{app.type}</td>
                          <td>
                            <StatusBadge status={app.status} />
                          </td>
                          <td>
                            {app.status === 'Pending' && (
                              <>
                                <button
                                  className="cursor-pointer rounded-md bg-bg px-2 py-1 text-[12px] font-extrabold text-primary transition-all duration-200"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Under Review')}
                                >
                                  Review
                                </button>
                                <button
                                  className="cursor-pointer rounded-md bg-[#dff6dd] px-2 py-1 text-[12px] font-extrabold text-[#1e5a1b] transition-all duration-200"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="cursor-pointer rounded-md bg-[#ffebe0] px-2 py-1 text-[12px] font-extrabold text-[#a33c12] transition-all duration-200"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Rejected')}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {app.status === 'Under Review' && (
                              <>
                                <button
                                  className="cursor-pointer rounded-md bg-[#dff6dd] px-2 py-1 text-[12px] font-extrabold text-[#1e5a1b] transition-all duration-200"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="cursor-pointer rounded-md bg-[#ffebe0] px-2 py-1 text-[12px] font-extrabold text-[#a33c12] transition-all duration-200"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Rejected')}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {app.status === 'Approved' && (
                              <button
                                className="cursor-pointer rounded-md bg-[#ffebe0] px-2 py-1 text-[12px] font-extrabold text-[#a33c12] transition-all duration-200"
                                onClick={() => handleUpdateAppointmentStatus(app.id, 'Cancelled')}
                              >
                                Cancel
                              </button>
                            )}
                            {app.status === 'Rescheduled' && (
                              <>
                                <button
                                  className="cursor-pointer rounded-md bg-[#dff6dd] px-2 py-1 text-[12px] font-extrabold text-[#1e5a1b] transition-all duration-200"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="cursor-pointer rounded-md bg-[#ffebe0] px-2 py-1 text-[12px] font-extrabold text-[#a33c12] transition-all duration-200"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Rejected')}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {(app.status === 'Rejected' || app.status === 'Cancelled' || app.status === 'Completed') && (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredAppointments.length === 0 && (
                        <tr>
                          <td colSpan="5">
                            <EmptyState message="No appointments matched the criteria." />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <Pagination
                currentPage={appPagination.currentPage}
                totalPages={appPagination.totalPages}
                onPageChange={appPagination.goToPage}
              />
            </div>

            {/* Right Column: Book Appointment Form */}
            <div className={`${PANEL} self-start p-5`}>
              <h3 className="m-0 text-[18px] text-[#143d40]">Book Appointment</h3>
              <p className="mt-0.5 text-[12px] text-muted">Register a walk-in or phone schedule</p>

              <form onSubmit={handleAddAppointment} className={SIDEBAR_FORM}>
                <label className={FORM_LABEL}>
                  Patient Name
                  <input
                    type="text"
                    placeholder="Enter patient name"
                    value={appPatient}
                    onChange={(e) => setAppPatient(e.target.value)}
                    required
                    className={FORM_FIELD}
                  />
                </label>

                <label className={FORM_LABEL}>
                  Appointment Type
                  <select value={appType} onChange={(e) => setAppType(e.target.value)} className={FORM_FIELD}>
                    <option value="Check-up">General Check-up</option>
                    <option value="Dental concern">Dental Care</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Fever">Fever/Flu Treatment</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </label>

                <label className={FORM_LABEL}>
                  Time Slot
                  <select value={appTime} onChange={(e) => setAppTime(e.target.value)} className={FORM_FIELD}>
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="01:30 PM">01:30 PM</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </label>

                <button type="submit" className={`${PRIMARY_BTN} w-full`} disabled={booking}>
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
          </div>
        )}

        {/* ================= CONSULTATIONS TAB ================= */}
        {activeTab === 'consultations' && (
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
                        <th>Attending Staff</th>
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
                  Select Patient
                  <select value={effectiveConsPatient} onChange={(e) => setConsPatient(e.target.value)} className={FORM_FIELD} disabled={patientsLoading}>
                    {patientsLoading ? (
                      <option value="">Loading patients…</option>
                    ) : (
                      patients.map((p) => (
                        <option key={p.id} value={p.name}>{p.name} ({p.id})</option>
                      ))
                    )}
                  </select>
                </label>

                <label className={FORM_LABEL}>
                  Attending Medical Staff
                  <select value={effectiveConsStaff} onChange={(e) => setConsStaff(e.target.value)} className={FORM_FIELD} disabled={staffLoading}>
                    {staffLoading ? (
                      <option value="">Loading staff…</option>
                    ) : (
                      staff.map((s) => (
                        <option key={s.name} value={s.name}>{s.name} - {s.role}</option>
                      ))
                    )}
                  </select>
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
                  <p className={KICKER}>Comprehensive record of students, faculty, and school personnel</p>
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
                    <option value="Faculty">Faculty</option>
                    <option value="Staff">Staff</option>
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
                      placeholder="e.g. 2026-0941"
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
                      <option value="Faculty">Faculty</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </label>
                  <label className={FORM_LABEL}>
                    Course/Dept
                    <input
                      type="text"
                      placeholder="BSCS / Registrar"
                      value={patDept}
                      onChange={(e) => setPatDept(e.target.value)}
                      required
                      className={FORM_FIELD}
                    />
                  </label>
                </div>

                <label className={FORM_LABEL}>
                  Contact Number
                  <input
                    type="text"
                    placeholder="09xx-xxx-xxxx"
                    value={patContact}
                    onChange={(e) => setPatContact(e.target.value)}
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

        {/* ================= STAFF SHIFTS & EVENTS ================= */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-5 max-[980px]:grid-cols-1">
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

              {/* Upcoming Clinic Events List */}
              <div className="mt-6">
                <div className={PANEL_HEADER}>
                  <h3 className="m-0 text-[18px] text-[#143d40]">Campus Health Campaigns & Events</h3>
                  <p className={KICKER}>Calendar events and scheduled immunization campaigns</p>
                </div>
                {eventsError ? (
                  <ErrorState message={eventsError} onRetry={refetchEvents} />
                ) : eventsLoading ? (
                  <ListSkeleton rows={3} />
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {events.map((evt, idx) => (
                      <div className="border-l-[3px] border-primary pl-[14px]" key={idx}>
                        <div className="text-[11px] font-extrabold uppercase text-primary">{evt.date}</div>
                        <div>
                          <h4 className="my-[3px] text-[14px] text-ink">{evt.title}</h4>
                          <p className="m-0 text-[12.5px] text-muted">{evt.description}</p>
                        </div>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <EmptyState message="No campus health events scheduled." />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Schedule New Campus Event Form */}
            <div className={`${PANEL} self-start p-5`}>
              <h3 className="m-0 text-[18px] text-[#143d40]">Schedule Clinic Event</h3>
              <p className="mt-0.5 text-[12px] text-muted">Broadcast health event details to campus</p>

              <form onSubmit={handleAddEvent} className={SIDEBAR_FORM}>
                <label className={FORM_LABEL}>
                  Event Date
                  <input
                    type="text"
                    placeholder="e.g. Aug 15, 2026"
                    value={evtDate}
                    onChange={(e) => setEvtDate(e.target.value)}
                    required
                    className={FORM_FIELD}
                  />
                </label>

                <label className={FORM_LABEL}>
                  Event Title
                  <input
                    type="text"
                    placeholder="e.g. Dental Checkup Week"
                    value={evtTitle}
                    onChange={(e) => setEvtTitle(e.target.value)}
                    required
                    className={FORM_FIELD}
                  />
                </label>

                <label className={FORM_LABEL}>
                  Description
                  <textarea
                    placeholder="Details about the campaign, venue, requirements..."
                    value={evtDesc}
                    onChange={(e) => setEvtDesc(e.target.value)}
                    required
                    className={`${FORM_FIELD} min-h-20 resize-y`}
                  />
                </label>

                <button type="submit" className={`${PRIMARY_BTN} w-full`} disabled={addingEvent}>
                  {addingEvent ? (
                    <>
                      <InlineSpinner />Scheduling...
                    </>
                  ) : (
                    'Schedule Event'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= CLINIC ACTIVITY ================= */}
        {activeTab === 'activity' && (
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
