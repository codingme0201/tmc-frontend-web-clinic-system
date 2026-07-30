import { useState, useMemo } from 'react'
import {
  dashboardStats,
  upcomingAppointments,
  medicalStaffToday,
  clinicActivity,
  mockPatients,
  mockConsultations,
  mockInventory,
  mockActivityLogs,
  mockPeakHours,
  mockUpcomingEvents
} from '../lib/mockData'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'appointments', 'consultations', 'patients', 'schedule', 'activity'
  
  // Stateful Mock Data for inter-module reactivity
  const [appointments, setAppointments] = useState(upcomingAppointments)
  const [staff, setStaff] = useState(medicalStaffToday)
  const [patients, setPatients] = useState(mockPatients)
  const [consultations, setConsultations] = useState(mockConsultations)
  const [inventory, setInventory] = useState(mockInventory)
  const [activityLogs, setActivityLogs] = useState(mockActivityLogs)
  const [events, setEvents] = useState(mockUpcomingEvents)

  // Modals & Panels Active States
  const [selectedPatient, setSelectedPatient] = useState(null)
  
  // Book Appointment Form State
  const [appPatient, setAppPatient] = useState('')
  const [appType, setAppType] = useState('Check-up')
  const [appTime, setAppTime] = useState('09:00 AM')

  // Log Consultation Form State
  const [consPatient, setConsPatient] = useState(patients[0]?.name || '')
  const [consSymptoms, setConsSymptoms] = useState('')
  const [consBp, setConsBp] = useState('120/80')
  const [consTemp, setConsTemp] = useState('36.7°C')
  const [consPulse, setConsPulse] = useState('75 bpm')
  const [consDiagnosis, setConsDiagnosis] = useState('')
  const [consTreatment, setConsTreatment] = useState('')
  const [consDisposition, setConsDisposition] = useState('Sent to Class')
  const [consStaff, setConsStaff] = useState(staff[0]?.name || '')

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

  // Helper log generator
  const addLog = (action) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setActivityLogs(prev => [{ time, user: 'Admin User', action }, ...prev])
  }

  // Appointment Actions
  const handleUpdateAppointmentStatus = (id, newStatus) => {
    setAppointments(prev => prev.map(app => {
      if (app.id === id) {
        addLog(`Updated appointment for ${app.patient} to: ${newStatus}`)
        return { ...app, status: newStatus }
      }
      return app
    }))
  }

  const handleAddAppointment = (e) => {
    e.preventDefault()
    if (!appPatient.trim()) return
    const newApp = {
      id: appointments.length + 1,
      time: appTime,
      patient: appPatient,
      type: appType,
      status: 'Pending'
    }
    setAppointments(prev => [...prev, newApp])
    addLog(`Booked new ${appType} appointment for ${appPatient} at ${appTime}`)
    setAppPatient('')
  }

  // Consultation Actions
  const handleLogConsultation = (e) => {
    e.preventDefault()
    if (!consPatient.trim() || !consDiagnosis.trim()) return
    const newCons = {
      id: `C-2026-00${consultations.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patient: consPatient,
      staff: consStaff,
      symptoms: consSymptoms,
      vitals: { bp: consBp, temp: consTemp, pulse: consPulse },
      diagnosis: consDiagnosis,
      treatment: consTreatment,
      disposition: consDisposition
    }
    setConsultations(prev => [newCons, ...prev])
    addLog(`Logged clinical consultation for patient ${consPatient} - Diagnosis: ${consDiagnosis}`)
    // Reset form
    setConsSymptoms('')
    setConsDiagnosis('')
    setConsTreatment('')
  }

  // Patient Actions
  const handleAddPatient = (e) => {
    e.preventDefault()
    if (!patId.trim() || !patName.trim()) return
    const newPat = {
      id: patId,
      name: patName,
      type: patType,
      courseDept: patDept,
      contact: patContact,
      emergencyContact: patEmergency,
      allergies: patAllergies || 'None',
      history: patHistory || 'None',
      status: 'Active'
    }
    setPatients(prev => [...prev, newPat])
    addLog(`Created new patient profile for ${patName} (${patType})`)
    // Reset form
    setPatId('')
    setPatName('')
    setPatDept('')
    setPatContact('')
    setPatEmergency('')
    setPatAllergies('')
    setPatHistory('')
  }

  // Staff coverage action
  const handleUpdateStaffStatus = (name, newStatus) => {
    setStaff(prev => prev.map(member => {
      if (member.name === name) {
        addLog(`Updated status of ${name} to: ${newStatus}`)
        return { ...member, status: newStatus }
      }
      return member
    }))
  }

  // Event Action
  const handleAddEvent = (e) => {
    e.preventDefault()
    if (!evtTitle.trim() || !evtDate.trim()) return
    const newEvt = {
      date: evtDate,
      title: evtTitle,
      description: evtDesc
    }
    setEvents(prev => [...prev, newEvt])
    addLog(`Scheduled new clinic event: ${evtTitle}`)
    setEvtDate('')
    setEvtTitle('')
    setEvtDesc('')
  }

  // Stats derivation
  const activeStats = useMemo(() => {
    const todayAppts = appointments.filter(a => a.status !== 'Cancelled').length
    const activeCons = staff.filter(s => s.status === 'On duty').length
    const totalPats = patients.length
    const totalConsults = consultations.length
    return [
      { label: 'Today Appointments', value: todayAppts, trend: `${appointments.filter(a => a.status === 'Pending').length} pending review` },
      { label: 'On-Duty Staff', value: activeCons, trend: `${staff.filter(s => s.status === 'Break').length} on break` },
      { label: 'Registered Patients', value: totalPats, trend: 'Unified clinic health list' },
      { label: 'Total Consultations', value: totalConsults, trend: 'Clinic visit records logged' }
    ]
  }, [appointments, staff, patients, consultations])

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const matchSearch = app.patient.toLowerCase().includes(appSearch.toLowerCase())
      const matchFilter = appFilter === 'All' || app.status === appFilter
      return matchSearch && matchFilter
    })
  }, [appointments, appSearch, appFilter])

  // Filtered Consultations
  const filteredConsultations = useMemo(() => {
    return consultations.filter(cons => {
      const matchSearch = cons.patient.toLowerCase().includes(consSearch.toLowerCase()) || 
                          cons.diagnosis.toLowerCase().includes(consSearch.toLowerCase())
      return matchSearch
    })
  }, [consultations, consSearch])

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    return patients.filter(pat => {
      const matchSearch = pat.name.toLowerCase().includes(patSearch.toLowerCase()) || pat.id.includes(patSearch)
      const matchFilter = patFilter === 'All' || pat.type === patFilter
      return matchSearch && matchFilter
    })
  }, [patients, patSearch, patFilter])

  // Patient history for detail lookup
  const patientHistoryLogs = useMemo(() => {
    if (!selectedPatient) return []
    return consultations.filter(c => c.patient === selectedPatient.name)
  }, [selectedPatient, consultations])

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
            Appointment Queue ({appointments.filter(a => a.status === 'Pending').length})
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
                  {appointments.filter(a => a.status === 'Pending').slice(0, 3).map((app) => (
                    <div className="appointment-row interactive-row" key={app.id}>
                      <div className="appointment-time">{app.time}</div>
                      <div>
                        <strong>{app.patient}</strong>
                        <span>{app.type}</span>
                      </div>
                      <div className="row-actions">
                        <button 
                          type="button"
                          className="btn-action-success"
                          onClick={() => handleUpdateAppointmentStatus(app.id, 'Confirmed')}
                        >
                          Confirm
                        </button>
                        <button 
                          type="button"
                          className="btn-action-danger"
                          onClick={() => handleUpdateAppointmentStatus(app.id, 'Cancelled')}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                  {appointments.filter(a => a.status === 'Pending').length === 0 && (
                    <div className="empty-state">No pending appointments today.</div>
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
                        <span className={`status-badge badge-${member.status.toLowerCase().replace(' ', '-')}`}>
                          {member.status}
                        </span>
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
                  {clinicActivity.map((item) => (
                    <div style={{ '--bar-size': `${item.percent}%` }} key={item.label}>
                      <span>{item.label}</span>
                      <b />
                    </div>
                  ))}
                </div>
              </article>
            </div>
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
                    <option value="Confirmed">Confirmed</option>
                    <option value="In Clinic">In Clinic</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="records-table-container">
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
                    {filteredAppointments.map(app => (
                      <tr key={app.id}>
                        <td className="bold-text text-teal">{app.time}</td>
                        <td className="bold-text">{app.patient}</td>
                        <td>{app.type}</td>
                        <td>
                          <span className={`status-badge badge-${app.status.toLowerCase().replace(' ', '-')}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="actions-cell">
                          {app.status === 'Pending' && (
                            <>
                              <button 
                                className="btn-success-small"
                                onClick={() => handleUpdateAppointmentStatus(app.id, 'Confirmed')}
                              >
                                Confirm
                              </button>
                              <button 
                                className="btn-danger-small"
                                onClick={() => handleUpdateAppointmentStatus(app.id, 'Cancelled')}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {app.status === 'Confirmed' && (
                            <button 
                              className="btn-info-small"
                              onClick={() => handleUpdateAppointmentStatus(app.id, 'In Clinic')}
                            >
                              Check-In
                            </button>
                          )}
                          {app.status === 'In Clinic' && (
                            <button 
                              className="btn-primary-small"
                              onClick={() => handleUpdateAppointmentStatus(app.id, 'Completed')}
                            >
                              Complete
                            </button>
                          )}
                          {app.status !== 'Completed' && app.status !== 'Cancelled' && app.status !== 'Pending' && (
                            <button 
                              className="btn-danger-small"
                              onClick={() => handleUpdateAppointmentStatus(app.id, 'Cancelled')}
                            >
                              Cancel
                            </button>
                          )}
                          {(app.status === 'Completed' || app.status === 'Cancelled') && (
                            <span className="muted-text">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredAppointments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="empty-row">No appointments matched the criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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

                <button type="submit" className="primary-action full-width">Book Appointment</button>
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
                    {filteredConsultations.map(cons => (
                      <tr key={cons.id}>
                        <td>
                          <span className="bold-text">{cons.date}</span>
                          <span className="block-sub">{cons.time}</span>
                        </td>
                        <td className="bold-text">{cons.patient}</td>
                        <td className="bold-text text-teal">{cons.staff}</td>
                        <td>
                          <strong className="block-sub">Symptoms: {cons.symptoms}</strong>
                          <span className="block-sub muted-text">
                            BP: {cons.vitals.bp} | Temp: {cons.vitals.temp} | Pulse: {cons.vitals.pulse}
                          </span>
                        </td>
                        <td>
                          <strong className="block-sub">{cons.diagnosis}</strong>
                          <span className="block-sub muted-text">{cons.treatment}</span>
                        </td>
                        <td>
                          <span className={`dispo-tag dispo-${cons.disposition.toLowerCase().replace(/ /g, '-')}`}>
                            {cons.disposition}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredConsultations.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-row">No consultation records match search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Add Consult form */}
            <div className="panel side-form-panel">
              <h3>Log New Consultation</h3>
              <p className="form-sub">Log student symptoms and medication outcome</p>

              <form onSubmit={handleLogConsultation} className="sidebar-form">
                <label>
                  Select Patient
                  <select value={consPatient} onChange={(e) => setConsPatient(e.target.value)}>
                    {patients.map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                </label>

                <label>
                  Attending Medical Staff
                  <select value={consStaff} onChange={(e) => setConsStaff(e.target.value)}>
                    {staff.map(s => (
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
                    {filteredPatients.map(pat => (
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
                        <td colSpan="6" className="empty-row">No patient profiles found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                    {staff.map(member => (
                      <tr key={member.name}>
                        <td className="bold-text">{member.name}</td>
                        <td>{member.role}</td>
                        <td className="text-teal font-monospace">{member.shift}</td>
                        <td>
                          <span className={`status-badge badge-${member.status.toLowerCase().replace(' ', '-')}`}>
                            {member.status}
                          </span>
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
              </div>

              {/* Upcoming Clinic Events List */}
              <div className="clinic-events-container" style={{ marginTop: '24px' }}>
                <div className="panel-header">
                  <h3>Campus Health Campaigns & Events</h3>
                  <p>Calendar events and scheduled immunization campaigns</p>
                </div>
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
                    <div className="empty-state">No campus health events scheduled.</div>
                  )}
                </div>
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
                <div className="peak-chart-container">
                  {mockPeakHours.map(hour => (
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
              </div>


            </div>

            {/* Right: Live System Audit Log */}
            <div className="panel side-form-panel">
              <h3>Live Activity Audit Log</h3>
              <p className="form-sub">Audit trail of administrator actions in real-time</p>
              
              <div className="audit-log-scroller">
                {activityLogs.map((log, idx) => (
                  <div className="audit-log-card" key={idx}>
                    <div className="audit-time">{log.time}</div>
                    <div className="audit-details">
                      <strong>{log.user}</strong>
                      <p>{log.action}</p>
                    </div>
                  </div>
                ))}
              </div>
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
                          <span className={`dispo-tag dispo-${log.disposition.toLowerCase().replace(/ /g, '-')}`}>
                            {log.disposition}
                          </span>
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

    </div>
  )
}

export default Dashboard
