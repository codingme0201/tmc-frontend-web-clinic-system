// Static app configuration: sidebar navigation structure and page header copy.
// This is UI config, not domain data — it stays independent of the API
// is replaced with a real API.

// Each item optionally declares the permission required to see it in the
// sidebar (module access control). The Laravel backend enforces the same
// permissions on the API — hiding items here is UX only.
export const navSections = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'grid', permission: 'dashboard.view' }],
  },
  {
    label: 'Clinic',
    items: [
      { id: 'appointments', label: 'Appointments', icon: 'calendarCheck', permission: 'appointments.view' },
      { id: 'consultations', label: 'Consultations', icon: 'stethoscope', permission: 'consultations.view' },
      { id: 'medicalRecords', label: 'Medical Records', icon: 'folderHeart', permission: 'medical_records.view' },
      { id: 'medicalCertificates', label: 'Medical Certificates', icon: 'certificate', permission: 'medical_certificates.view' },
      { id: 'prescriptions', label: 'Prescriptions', icon: 'pill', permission: 'prescriptions.view' },
    ],
  },
  {
    items: [{ id: 'patients', label: 'Patients', icon: 'users', permission: 'patients.view' }],
  },
  {
    label: 'Schedules',
    items: [
      { id: 'staffSchedule', label: 'Doctor/Nurse Schedule', icon: 'clipboardClock', permission: 'schedules.view' },
      { id: 'clinicCalendar', label: 'Clinic Calendar', icon: 'calendarDays', permission: 'calendar.view' },
    ],
  },
  {
    items: [
      { id: 'reports', label: 'Reports', icon: 'barChart', permission: 'reports.view' },
      { id: 'notifications', label: 'Notifications', icon: 'bell', permission: 'notifications.view' },
      { id: 'users', label: 'User Management', icon: 'shieldUser', permission: 'users.view' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'auditLogs', label: 'Audit Logs', icon: 'scrollText', permission: 'audit_logs.view' },
      { id: 'settingsAudit', label: 'System Settings', icon: 'settings', permission: 'settings.view' },
      { id: 'rolesPermissions', label: 'Roles & Permissions', icon: 'key', permission: 'roles.view' },
    ],
  },
]

// Page header copy shown by the AdminLayout/PlaceholderPage for each nav item.
export const pageContent = {
  dashboard: {
    title: 'Dashboard',
    eyebrow: 'TMC CareLink',
    description: 'Clinic appointment and medical record management overview.',
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
    description: 'Manage administrator, doctor, nurse, and patient accounts.',
  },
  auditLogs: {
    title: 'Audit Logs',
    eyebrow: 'System',
    description: 'Track and review all user actions and system events across the clinic platform.',
  },
  settingsAudit: {
    title: 'System Settings',
    eyebrow: 'System',
    description: 'Configure clinic identity, contact channels, operating schedules, and preferences.',
  },
  rolesPermissions: {
    title: 'Roles & Permissions',
    eyebrow: 'System',
    description: 'Configure role-based access for TMC CareLink modules.',
  },
}
