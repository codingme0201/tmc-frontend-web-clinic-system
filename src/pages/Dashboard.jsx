import { useEffect, useMemo, useState } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import { usePatients } from '../hooks/usePatients'
import { useConsultations } from '../hooks/useConsultations'
import { useStaff } from '../hooks/useStaff'
import { useActivityLogs } from '../hooks/useActivityLogs'
import { useClinicEvents } from '../hooks/useClinicEvents'
import { useClinicInsights } from '../hooks/useClinicInsights'
import { useToast } from '../hooks/useToast'
import { useDebounce } from '../hooks/useDebounce'
import { usePagination } from '../hooks/usePagination'
import { formatDate, todayISO } from '../lib/format'
import Pagination from '../components/Pagination'
import Toast from '../components/Toast'
import StatusBadge from '../components/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'appointments', 'consultations', 'patients', 'schedule', 'activity'

  // All data flows through shared custom hooks — the page never imports or
  // mutates mock data directly.
  const {
    data: appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments,
    createAppointment,
    updateStatus: updateAppointmentStatus,
  } = useAppointments()

  const {
    data: staff,
    isLoading: staffLoading,
    error: staffError,
    refetch: refetchStaff,
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
  const { data: clinicInsights, isLoading: insightsLoading, error: insightsError, refetch: refetchInsights } = useClinicInsights()
  const { toast, showToast, dismiss } = useToast()

  // Modals & Panels Active States
  const [selectedPatient, setSelectedPatient] = useState(null)

  // Book Appointment Form State
  const [appPatient, setAppPatient] = useState('')
  const [appType, setAppType] = useState('Check-up')
  const [appTime, setAppTime] = useState('09:00 AM')
  const [booking, setBooking] = useState(false)

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
  const [appFilter, setAppFilter] = useState('All')
  const [appSearch, setAppSearch] = useState('')
  const [consSearch, setConsSearch] = useState('')
  const [patSearch, setPatSearch] = useState('')
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
    if (!effectiveConsPatient.trim() || !consDiagnosis.trim()) return
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
    }
  }

  // Patient Actions
  const handleAddPatient = async (e) => {
    e.preventDefault()
    if (!patId.trim() || !patName.trim()) return
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
    }
  }

  // Staff coverage action
  const handleUpdateStaffStatus = async (name, newStatus) => {
    try {
      await updateStaffStatus(name, newStatus)
      showToast(`Status of ${name} updated to ${newStatus}.`)
    } catch (err) {
      showToast(err?.message || 'Failed to update staff status.', 'error')
    }
  }

  // Event Action
  const handleAddEvent = async (e) => {
    e.preventDefault()
    if (!evtTitle.trim() || !evtDate.trim()) return
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

  // Debounced search values — filtering/pagination only run after the user
  // pauses typing (~300ms), instead of on every keystroke.
  const debouncedAppSearch = useDebounce(appSearch, 300)
  const debouncedConsSearch = useDebounce(consSearch, 300)
  const debouncedPatSearch = useDebounce(patSearch, 300)

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

  // Overview load gate
  const overviewLoading = appointmentsLoading || staffLoading || patientsLoading || consultationsLoading || insightsLoading
  const overviewError = appointmentsError || staffError || patientsError || consultationsError || insightsError
  const retryOverview = () => {
    refetchAppointments()
    refetchStaff()
    refetchPatients()
    refetchConsultations()
  }

  const activity = clinicInsights?.clinicActivity || []
  const peakHours = clinicInsights?.peakHours || []

  return (
    <div className="dashboard-page">
      {/* Dashboard Top Header & Tabs */}
      <section className="dashboard-header-block">
        <div className="page-heading">
          <div>
            <p>TMC Clinic Administration</p>
            <h2>Clinic Command Center</h2>
          </div>
          <div className="quick-actions-bar">
            {activeTab !== 'overview' && (
              <button
                type="button"
                className="secondary-pill"
                onClick={() => setActiveTab('overview')}
              >
                ← Back to Overview
              </button>
            )}
          </div>
        </div>

        <nav className="dashboard-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            Appointment Queue ({pendingQueue.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'consultations' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultations')}
          >
            Consultation Logs
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            Patient Registry
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Staff Shifts & Events
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Clinic Activity
          </button>
        </nav>
      </section>

      {/* Dynamic Tabs Content */}
      <div className="dashboard-tab-content">
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <div className="overview-tab-view">
            {overviewError ? (
              <ErrorState message={overviewError} onRetry={retryOverview} />
            ) : overviewLoading ? (
              <LoadingState label="Loading clinic overview..." />
            ) : (
              <>
                {/* Stat Cards Grid */}
                <div className="stats-grid">
                  {activeStats.map((item) => (
                    <article key={item.label} className="stat-card">
                      <p>{item.label}</p>
                      <strong>{item.value}</strong>
                      <span>{item.trend}</span>
                    </article>
                  ))}
                </div>

                {/* Overview Multi Grid */}
                <div className="dashboard-grid">
                  {/* Appointments Quick View */}
                  <article className="panel appointments-panel">
                    <div className="panel-header">
                      <div>
                        <p>Queue Management</p>
                        <h3>Today's Pending Appointments</h3>
                      </div>
                      <button type="button" onClick={() => setActiveTab('appointments')}>Manage Queue</button>
                    </div>
                    <div className="appointment-list">
                      {pendingQueue.slice(0, 3).map((app) => (
                        <div className="appointment-row interactive-row" key={app.id}>
                          <div className="appointment-time">{app.time}</div>
                          <div>
                            <strong>{app.patient}</strong>
                            <span>{app.type}</span>
                          </div>
                          <div className="row-actions">
                            {app.status === 'Pending' && (
                              <button
                                type="button"
                                className="btn-reorder-fast"
                                onClick={() => handleUpdateAppointmentStatus(app.id, 'Under Review')}
                              >
                                Review
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-action-success"
                              onClick={() => handleUpdateAppointmentStatus(app.id, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-action-danger"
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
                  </article>

                  {/* Staff Shift Status Quick View */}
                  <article className="panel staff-panel">
                    <div className="panel-header">
                      <div>
                        <p>Coverage Summary</p>
                        <h3>Staff Status</h3>
                      </div>
                      <button type="button" onClick={() => setActiveTab('schedule')}>Adjust Shifts</button>
                    </div>
                    <div className="staff-list">
                      {staff.map((member) => (
                        <div className="staff-row" key={member.name}>
                          <div className="staff-avatar">{member.name.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <strong>{member.name}</strong>
                            <span>{member.role}</span>
                          </div>
                          <div className="badge-wrapper">
                            <StatusBadge status={member.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  {/* Clinic Activity Summary */}
                  <article className="panel alerts-panel">
                    <div className="panel-header">
                      <div>
                        <p>Records</p>
                        <h3>Clinic Activity</h3>
                      </div>
                      <button type="button" onClick={() => setActiveTab('activity')}>View All</button>
                    </div>
                    <div className="activity-bars">
                      {activity.map((item) => (
                        <div style={{ '--bar-size': `${item.percent}%` }} key={item.label}>
                          <span>{item.label}</span>
                          <b />
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= APPOINTMENTS TAB ================= */}
        {activeTab === 'appointments' && (
          <div className="appointments-tab-view flex-grid-layout">
            {/* Left Column: Appts List */}
            <div className="panel main-panel">
              <div className="panel-header flex-header">
                <div>
                  <h3>Interactive Appointment Queue</h3>
                  <p>Students, staff, and faculty requests</p>
                </div>
                <div className="filters-row">
                  <input
                    type="text"
                    placeholder="Search patient..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="search-input"
                  />
                  <select
                    value={appFilter}
                    onChange={(e) => setAppFilter(e.target.value)}
                    className="filter-select"
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

              <div className="records-table-container">
                {appointmentsError ? (
                  <ErrorState message={appointmentsError} onRetry={refetchAppointments} />
                ) : appointmentsLoading ? (
                  <LoadingState label="Loading appointment queue..." />
                ) : (
                  <table className="records-table">
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
                          <td className="bold-text text-teal">
                            {app.time}
                            <span className="block-sub">{formatDate(app.date)}</span>
                          </td>
                          <td className="bold-text">{app.patient}</td>
                          <td>{app.type}</td>
                          <td>
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="actions-cell">
                            {app.status === 'Pending' && (
                              <>
                                <button
                                  className="btn-info-small"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Under Review')}
                                >
                                  Review
                                </button>
                                <button
                                  className="btn-success-small"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-danger-small"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Rejected')}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {app.status === 'Under Review' && (
                              <>
                                <button
                                  className="btn-success-small"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-danger-small"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Rejected')}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {app.status === 'Approved' && (
                              <button
                                className="btn-danger-small"
                                onClick={() => handleUpdateAppointmentStatus(app.id, 'Cancelled')}
                              >
                                Cancel
                              </button>
                            )}
                            {app.status === 'Rescheduled' && (
                              <>
                                <button
                                  className="btn-success-small"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-danger-small"
                                  onClick={() => handleUpdateAppointmentStatus(app.id, 'Rejected')}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {(app.status === 'Rejected' || app.status === 'Cancelled' || app.status === 'Completed') && (
                              <span className="muted-text">-</span>
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
            <div className="panel side-form-panel">
              <h3>Book Appointment</h3>
              <p className="form-sub">Register a walk-in or phone schedule</p>

              <form onSubmit={handleAddAppointment} className="sidebar-form">
                <label>
                  Patient Name
                  <input
                    type="text"
                    placeholder="Enter patient name"
                    value={appPatient}
                    onChange={(e) => setAppPatient(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Appointment Type
                  <select value={appType} onChange={(e) => setAppType(e.target.value)}>
                    <option value="Check-up">General Check-up</option>
                    <option value="Dental concern">Dental Care</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Fever">Fever/Flu Treatment</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </label>

                <label>
                  Time Slot
                  <select value={appTime} onChange={(e) => setAppTime(e.target.value)}>
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

                <button type="submit" className="primary-action full-width" disabled={booking}>
                  {booking ? 'Booking...' : 'Book Appointment'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= CONSULTATIONS TAB ================= */}
        {activeTab === 'consultations' && (
          <div className="consultations-tab-view flex-grid-layout">
            {/* Left Column: List of consults */}
            <div className="panel main-panel">
              <div className="panel-header flex-header">
                <div>
                  <h3>Clinical Consultation Logs</h3>
                  <p>Detailed historical consultation diagnosis and treatment records</p>
                </div>
                <input
                  type="text"
                  placeholder="Search patient or diagnosis..."
                  value={consSearch}
                  onChange={(e) => setConsSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="records-table-container">
                {consultationsError ? (
                  <ErrorState message={consultationsError} onRetry={refetchConsultations} />
                ) : consultationsLoading ? (
                  <LoadingState label="Loading consultation logs..." />
                ) : (
                  <table className="records-table">
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
                            <span className="bold-text">{cons.date}</span>
                            <span className="block-sub">{cons.time}</span>
                          </td>
                          <td className="bold-text">{cons.patient}</td>
                          <td className="bold-text text-teal">{cons.staff}</td>
                          <td>
                            <strong className="block-sub">Complaint: {cons.chiefComplaint || '—'}</strong>
                            <span className="block-sub muted-text">
                              BP: {cons.vitals.bloodPressure || '—'} | Temp: {cons.vitals.temperature || '—'} | Pulse: {cons.vitals.pulseRate || '—'}
                            </span>
                          </td>
                          <td>
                            <strong className="block-sub">{cons.diagnosis}</strong>
                            <span className="block-sub muted-text">{cons.treatment}</span>
                          </td>
                          <td>
                            {cons.disposition ? (
                              <span className={`dispo-tag dispo-${cons.disposition.toLowerCase().replace(/ /g, '-')}`}>
                                {cons.disposition}
                              </span>
                            ) : (
                              <span className="muted-text">—</span>
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
            <div className="panel side-form-panel">
              <h3>Log New Consultation</h3>
              <p className="form-sub">Log student symptoms and medication outcome</p>

              <form onSubmit={handleLogConsultation} className="sidebar-form">
                <label>
                  Select Patient
                  <select value={effectiveConsPatient} onChange={(e) => setConsPatient(e.target.value)}>
                    {patients.map((p) => (
                      <option key={p.id} value={p.name}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                </label>

                <label>
                  Attending Medical Staff
                  <select value={effectiveConsStaff} onChange={(e) => setConsStaff(e.target.value)}>
                    {staff.map((s) => (
                      <option key={s.name} value={s.name}>{s.name} - {s.role}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Symptoms Reported
                  <input
                    type="text"
                    placeholder="e.g. Headache, Fever, Sprained ankle"
                    value={consSymptoms}
                    onChange={(e) => setConsSymptoms(e.target.value)}
                    required
                  />
                </label>

                <div className="form-row-grid">
                  <label>
                    Blood Pressure
                    <input
                      type="text"
                      placeholder="120/80"
                      value={consBp}
                      onChange={(e) => setConsBp(e.target.value)}
                    />
                  </label>
                  <label>
                    Temperature
                    <input
                      type="text"
                      placeholder="36.5°C"
                      value={consTemp}
                      onChange={(e) => setConsTemp(e.target.value)}
                    />
                  </label>
                  <label>
                    Pulse
                    <input
                      type="text"
                      placeholder="75 bpm"
                      value={consPulse}
                      onChange={(e) => setConsPulse(e.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Diagnosis
                  <input
                    type="text"
                    placeholder="Clinical evaluation"
                    value={consDiagnosis}
                    onChange={(e) => setConsDiagnosis(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Treatment & Prescribed Meds
                  <textarea
                    placeholder="e.g. Paracetamol 500mg (1 tab), rest for 30 mins"
                    value={consTreatment}
                    onChange={(e) => setConsTreatment(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Disposition
                  <select value={consDisposition} onChange={(e) => setConsDisposition(e.target.value)}>
                    <option value="Sent to Class">Sent to Class</option>
                    <option value="Sent Home">Sent Home</option>
                    <option value="Rest in Clinic">Rest in Clinic</option>
                    <option value="Referred to Hospital">Referred to Hospital</option>
                  </select>
                </label>

                <button type="submit" className="primary-action full-width">Log Consultation</button>
              </form>
            </div>
          </div>
        )}

        {/* ================= PATIENT OVERVIEW ================= */}
        {activeTab === 'patients' && (
          <div className="patients-tab-view flex-grid-layout">
            {/* Main Patients Database */}
            <div className="panel main-panel">
              <div className="panel-header flex-header">
                <div>
                  <h3>Patient Registry</h3>
                  <p>Comprehensive record of students, faculty, and school personnel</p>
                </div>
                <div className="filters-row">
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={patSearch}
                    onChange={(e) => setPatSearch(e.target.value)}
                    className="search-input"
                  />
                  <select
                    value={patFilter}
                    onChange={(e) => setPatFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="All">All Types</option>
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              <div className="records-table-container">
                {patientsError ? (
                  <ErrorState message={patientsError} onRetry={refetchPatients} />
                ) : patientsLoading ? (
                  <LoadingState label="Loading patient registry..." />
                ) : (
                  <table className="records-table clickable-rows">
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
                          className="patient-selectable-row"
                          title="Click to view full health record profile"
                        >
                          <td className="bold-text text-teal">{pat.id}</td>
                          <td className="bold-text">{pat.name}</td>
                          <td>{pat.type}</td>
                          <td>{pat.courseDept}</td>
                          <td className={pat.allergies !== 'None' ? 'alert-danger-text' : ''}>
                            {pat.allergies}
                          </td>
                          <td>
                            <span className="status-badge badge-in-clinic">Active</span>
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
            <div className="panel side-form-panel">
              <h3>Create Patient Profile</h3>
              <p className="form-sub">Register new student or campus staff</p>

              <form onSubmit={handleAddPatient} className="sidebar-form">
                <div className="form-row-grid">
                  <label>
                    Patient ID
                    <input
                      type="text"
                      placeholder="e.g. 2026-0941"
                      value={patId}
                      onChange={(e) => setPatId(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Full Name
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={patName}
                      onChange={(e) => setPatName(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="form-row-grid">
                  <label>
                    Category
                    <select value={patType} onChange={(e) => setPatType(e.target.value)}>
                      <option value="Student">Student</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </label>
                  <label>
                    Course/Dept
                    <input
                      type="text"
                      placeholder="BSCS / Registrar"
                      value={patDept}
                      onChange={(e) => setPatDept(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <label>
                  Contact Number
                  <input
                    type="text"
                    placeholder="09xx-xxx-xxxx"
                    value={patContact}
                    onChange={(e) => setPatContact(e.target.value)}
                  />
                </label>

                <label>
                  Emergency Contact (Name & Phone)
                  <input
                    type="text"
                    placeholder="Guardian Name - 09xx..."
                    value={patEmergency}
                    onChange={(e) => setPatEmergency(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Known Allergies
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Nuts, None"
                    value={patAllergies}
                    onChange={(e) => setPatAllergies(e.target.value)}
                  />
                </label>

                <label>
                  Medical History
                  <textarea
                    placeholder="e.g. Hypertension, Asthma, None"
                    value={patHistory}
                    onChange={(e) => setPatHistory(e.target.value)}
                  />
                </label>

                <button type="submit" className="primary-action full-width">Add Patient Profile</button>
              </form>
            </div>
          </div>
        )}

        {/* ================= STAFF SHIFTS & EVENTS ================= */}
        {activeTab === 'schedule' && (
          <div className="schedule-tab-view flex-grid-layout">
            {/* Left: Medical Staff Schedule Table */}
            <div className="panel main-panel">
              <div className="panel-header">
                <h3>Medical Staff Shift Coverage</h3>
                <p>Track doctor/nurse shifts and set active duty status</p>
              </div>

              <div className="records-table-container">
                {staffError ? (
                  <ErrorState message={staffError} onRetry={refetchStaff} />
                ) : staffLoading ? (
                  <LoadingState label="Loading staff schedules..." />
                ) : (
                  <table className="records-table">
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
                          <td className="bold-text">{member.name}</td>
                          <td>{member.role}</td>
                          <td className="text-teal font-monospace">{member.shift}</td>
                          <td>
                            <StatusBadge status={member.status} />
                          </td>
                          <td>
                            <select
                              value={member.status}
                              onChange={(e) => handleUpdateStaffStatus(member.name, e.target.value)}
                              className="status-selector-table"
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
              <div className="clinic-events-container" style={{ marginTop: '24px' }}>
                <div className="panel-header">
                  <h3>Campus Health Campaigns & Events</h3>
                  <p>Calendar events and scheduled immunization campaigns</p>
                </div>
                {eventsError ? (
                  <ErrorState message={eventsError} onRetry={refetchEvents} />
                ) : eventsLoading ? (
                  <LoadingState label="Loading events..." />
                ) : (
                  <div className="events-timeline">
                    {events.map((evt, idx) => (
                      <div className="event-timeline-card" key={idx}>
                        <div className="event-date-pill">{evt.date}</div>
                        <div className="event-body">
                          <h4>{evt.title}</h4>
                          <p>{evt.description}</p>
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
            <div className="panel side-form-panel">
              <h3>Schedule Clinic Event</h3>
              <p className="form-sub">Broadcast health event details to campus</p>

              <form onSubmit={handleAddEvent} className="sidebar-form">
                <label>
                  Event Date
                  <input
                    type="text"
                    placeholder="e.g. Aug 15, 2026"
                    value={evtDate}
                    onChange={(e) => setEvtDate(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Event Title
                  <input
                    type="text"
                    placeholder="e.g. Dental Checkup Week"
                    value={evtTitle}
                    onChange={(e) => setEvtTitle(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Description
                  <textarea
                    placeholder="Details about the campaign, venue, requirements..."
                    value={evtDesc}
                    onChange={(e) => setEvtDesc(e.target.value)}
                    required
                  />
                </label>

                <button type="submit" className="primary-action full-width">Schedule Event</button>
              </form>
            </div>
          </div>
        )}

        {/* ================= CLINIC ACTIVITY ================= */}
        {activeTab === 'activity' && (
          <div className="activity-tab-view flex-grid-layout">
            {/* Left: Peak Hours and Activity */}
            <div className="panel main-panel">
              {/* Peak Hours Chart */}
              <div className="peak-hours-widget">
                <div className="panel-header">
                  <h3>Clinic Peak Activity Hours</h3>
                  <p>Distribution load of patients visit by hour slot</p>
                </div>
                {insightsError ? (
                  <ErrorState message={insightsError} onRetry={refetchInsights} />
                ) : insightsLoading ? (
                  <LoadingState label="Loading peak hours..." />
                ) : (
                  <div className="peak-chart-container">
                    {peakHours.map((hour) => (
                      <div className="peak-bar-row" key={hour.label}>
                        <span className="peak-time-lbl">{hour.label}</span>
                        <div className="peak-bar-wrapper">
                          <div
                            className="peak-bar-fill"
                            style={{ width: `${hour.percent}%` }}
                          />
                        </div>
                        <span className="peak-count-lbl bold-text">{hour.count} visits</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live System Audit Log */}
            <div className="panel side-form-panel">
              <h3>Live Activity Audit Log</h3>
              <p className="form-sub">Audit trail of administrator actions in real-time</p>

              <div className="audit-log-scroller">
                {logsError ? (
                  <ErrorState message={logsError} onRetry={refetchLogs} />
                ) : logsLoading ? (
                  <LoadingState label="Loading audit log..." />
                ) : (
                  logsPagination.pageItems.map((log, idx) => (
                    <div className="audit-log-card" key={idx}>
                      <div className="audit-time">{log.time}</div>
                      <div className="audit-details">
                        <strong>{log.user}</strong>
                        <p>{log.action}</p>
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
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Patient Health Profile Card</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedPatient(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="profile-details-grid">
                <div>
                  <label className="profile-lbl">Patient ID</label>
                  <p className="profile-val">{selectedPatient.id}</p>
                </div>
                <div>
                  <label className="profile-lbl">Full Name</label>
                  <p className="profile-val">{selectedPatient.name}</p>
                </div>
                <div>
                  <label className="profile-lbl">Category</label>
                  <p className="profile-val">{selectedPatient.type}</p>
                </div>
                <div>
                  <label className="profile-lbl">Course/Department</label>
                  <p className="profile-val">{selectedPatient.courseDept}</p>
                </div>
                <div>
                  <label className="profile-lbl">Phone Contact</label>
                  <p className="profile-val">{selectedPatient.contact}</p>
                </div>
                <div>
                  <label className="profile-lbl">Emergency Contact</label>
                  <p className="profile-val">{selectedPatient.emergencyContact}</p>
                </div>
              </div>

              <div className="profile-alert-box" style={{ marginTop: '16px' }}>
                <h4 className="alert-danger-text">⚠ Allergies</h4>
                <p className="bold-text">{selectedPatient.allergies}</p>
              </div>

              <div className="profile-alert-box" style={{ marginTop: '12px' }}>
                <h4 className="text-teal">✚ Medical History Background</h4>
                <p>{selectedPatient.history}</p>
              </div>

              {/* Consultation logs for this patient */}
              <div className="patient-past-logs-section" style={{ marginTop: '20px' }}>
                <h4 style={{ color: '#12393b', marginBottom: '8px' }}>Past Consultations</h4>
                {patientHistoryLogs.length > 0 ? (
                  <div className="past-consult-mini-list">
                    {patientHistoryLogs.map((log) => (
                      <div className="mini-log-card" key={log.id}>
                        <div className="mini-log-header">
                          <strong>{log.date} @ {log.time}</strong>
                          {log.disposition ? (
                            <span className={`dispo-tag dispo-${log.disposition.toLowerCase().replace(/ /g, '-')}`}>
                              {log.disposition}
                            </span>
                          ) : (
                            <span className="muted-text">—</span>
                          )}
                        </div>
                        <p className="mini-log-body">
                          <strong>Diag:</strong> {log.diagnosis} <br />
                          <strong>Treatment:</strong> {log.treatment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-mini-state">No clinical consultations recorded for this patient.</div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-pill"
                onClick={() => setSelectedPatient(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}

export default Dashboard
