const stats = [
  { label: 'Today Appointments', value: '24', trend: '+8 scheduled' },
  { label: 'Active Consultations', value: '7', trend: '3 awaiting notes' },
  { label: 'Patient Records', value: '1,248', trend: '42 updated this week' },
  { label: 'Certificates Issued', value: '18', trend: '6 pending approval' },
]

const appointments = [
  { time: '08:30 AM', patient: 'Angela Reyes', type: 'Check-up', status: 'Confirmed' },
  { time: '09:15 AM', patient: 'Mark Dela Cruz', type: 'Dental concern', status: 'Waiting' },
  { time: '10:00 AM', patient: 'Joanna Lim', type: 'Follow-up', status: 'In clinic' },
]

const staff = [
  { name: 'Dr. R. Mendoza', role: 'School Physician', shift: '8:00 AM - 4:00 PM' },
  { name: 'Nurse C. Villanueva', role: 'Clinic Nurse', shift: '7:30 AM - 3:30 PM' },
  { name: 'Nurse J. Santos', role: 'Medical Assistant', shift: '10:00 AM - 6:00 PM' },
]

function Dashboard() {
  return (
    <div className="dashboard-page">
      <section className="page-heading">
        <div>
          <p>Clinic Command Center</p>
          <h2>Dashboard</h2>
        </div>
        <button type="button" className="primary-action">New Appointment</button>
      </section>

      <section className="stats-grid" aria-label="Clinic overview">
        {stats.map((item) => (
          <article className="stat-card" key={item.label}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.trend}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel appointments-panel">
          <div className="panel-header">
            <div>
              <p>Queue</p>
              <h3>Upcoming Appointments</h3>
            </div>
            <button type="button">View All</button>
          </div>
          <div className="appointment-list">
            {appointments.map((appointment) => (
              <div className="appointment-row" key={`${appointment.time}-${appointment.patient}`}>
                <div className="appointment-time">{appointment.time}</div>
                <div>
                  <strong>{appointment.patient}</strong>
                  <span>{appointment.type}</span>
                </div>
                <mark>{appointment.status}</mark>
              </div>
            ))}
          </div>
        </article>

        <article className="panel staff-panel">
          <div className="panel-header">
            <div>
              <p>Coverage</p>
              <h3>Medical Staff Today</h3>
            </div>
          </div>
          <div className="staff-list">
            {staff.map((member) => (
              <div className="staff-row" key={member.name}>
                <div className="staff-avatar">{member.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
                <time>{member.shift}</time>
              </div>
            ))}
          </div>
        </article>

        <article className="panel insights-panel">
          <div className="panel-header">
            <div>
              <p>Records</p>
              <h3>Clinic Activity</h3>
            </div>
          </div>
          <div className="activity-bars">
            <div style={{ '--bar-size': '78%' }}>
              <span>Consultations</span>
              <b />
            </div>
            <div style={{ '--bar-size': '52%' }}>
              <span>Prescriptions</span>
              <b />
            </div>
            <div style={{ '--bar-size': '34%' }}>
              <span>Certificates</span>
              <b />
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}

export default Dashboard
