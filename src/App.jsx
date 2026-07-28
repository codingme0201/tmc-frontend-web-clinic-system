import { useState } from 'react'
import './App.css'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import PlaceholderPage from './pages/PlaceholderPage'

const pages = {
  dashboard: {
    title: 'Dashboard',
    eyebrow: 'TMC CareLink',
    description: 'Clinic appointment and medical record management overview.',
    component: Dashboard,
  },
  appointments: {
    title: 'Appointments',
    eyebrow: 'Clinic',
    description: 'Manage student, faculty, and staff clinic appointment requests.',
  },
  consultations: {
    title: 'Consultations',
    eyebrow: 'Clinic',
    description: 'Track consultation notes, outcomes, and assigned medical personnel.',
  },
  medicalRecords: {
    title: 'Medical Records',
    eyebrow: 'Clinic',
    description: 'Maintain secure patient health histories and clinic visit records.',
  },
  medicalCertificates: {
    title: 'Medical Certificates',
    eyebrow: 'Clinic',
    description: 'Prepare and issue clinic-approved medical certificates.',
  },
  prescriptions: {
    title: 'Prescriptions',
    eyebrow: 'Clinic',
    description: 'Record prescribed medicine, dosage, and patient instructions.',
  },
  patients: {
    title: 'Patients',
    eyebrow: 'Patient Registry',
    description: 'View student, faculty, and staff patient profiles.',
  },
  staffSchedule: {
    title: 'Medical Staff Schedule',
    eyebrow: 'Schedules',
    description: 'Plan doctor, nurse, and assigned medical staff clinic shifts.',
  },
  clinicCalendar: {
    title: 'Clinic Calendar',
    eyebrow: 'Schedules',
    description: 'Review appointments, events, and clinic availability by date.',
  },
  reports: {
    title: 'Reports',
    eyebrow: 'Insights',
    description: 'Generate appointment, consultation, and medical record summaries.',
  },
  notifications: {
    title: 'Notifications',
    eyebrow: 'Communications',
    description: 'Send appointment updates, reminders, and clinic announcements.',
  },
  users: {
    title: 'User Management',
    eyebrow: 'Administration',
    description: 'Manage admin, doctor, nurse, registrar, and staff access.',
  },
  settingsAudit: {
    title: 'Settings Audit Logs',
    eyebrow: 'System',
    description: 'Review configuration changes and activity history.',
  },
  rolesPermissions: {
    title: 'Roles & Permissions',
    eyebrow: 'System',
    description: 'Configure role-based access for TMC CareLink modules.',
  },
}

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [showLogin, setShowLogin] = useState(false)
  const page = pages[activePage] ?? pages.dashboard
  const PageComponent = page.component ?? PlaceholderPage

  if (showLogin) {
    return <Login onEnterAdmin={() => setShowLogin(false)} />
  }

  return (
    <AdminLayout
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={() => setShowLogin(true)}
    >
      <PageComponent page={page} />
    </AdminLayout>
  )
}

export default App
