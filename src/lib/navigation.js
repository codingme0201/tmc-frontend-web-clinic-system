// Static app configuration: sidebar navigation structure and page header copy.
// This is UI config, not domain data — it stays even after the mock backend
// is replaced with a real API.

export const navSections = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'grid' }],
  },
  {
    label: 'Clinic',
    items: [
      { id: 'appointments', label: 'Appointments', icon: 'calendarCheck' },
      { id: 'consultations', label: 'Consultations', icon: 'stethoscope' },
      { id: 'medicalRecords', label: 'Medical Records', icon: 'folderHeart' },
      { id: 'medicalCertificates', label: 'Medical Certificates', icon: 'certificate' },
      { id: 'prescriptions', label: 'Prescriptions', icon: 'pill' },
    ],
  },
  {
    items: [{ id: 'patients', label: 'Patients', icon: 'users' }],
  },
  {
    label: 'Schedules',
    items: [
      { id: 'staffSchedule', label: 'Doctor/Nurse Schedule', icon: 'clipboardClock' },
      { id: 'clinicCalendar', label: 'Clinic Calendar', icon: 'calendarDays' },
    ],
  },
  {
    items: [
      { id: 'reports', label: 'Reports', icon: 'barChart' },
      { id: 'notifications', label: 'Notifications', icon: 'bell' },
      { id: 'users', label: 'User Management', icon: 'shieldUser' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settingsAudit', label: 'Settings Audit Logs', icon: 'settings' },
      { id: 'rolesPermissions', label: 'Roles & Permissions', icon: 'key' },
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
