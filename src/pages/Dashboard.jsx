import StatCard from '../components/StatCard'
import AppointmentRow from '../components/AppointmentRow'
import StaffRow from '../components/StaffRow'
import ActivityBar from '../components/ActivityBar'
import {
  dashboardStats,
  upcomingAppointments,
  medicalStaffToday,
  clinicActivity,
} from '../lib/mockData'

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
        {dashboardStats.map((item) => (
          <StatCard key={item.label} {...item} />
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
            {upcomingAppointments.map((appointment) => (
              <AppointmentRow key={`${appointment.time}-${appointment.patient}`} {...appointment} />
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
            {medicalStaffToday.map((member) => (
              <StaffRow key={member.name} {...member} />
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
            {clinicActivity.map((item) => (
              <ActivityBar key={item.label} {...item} />
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

export default Dashboard
