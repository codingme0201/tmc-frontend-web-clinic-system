// Mock/placeholder data for the TMC CareLink admin mockup.
// Swap these out for real API calls once the backend endpoints are ready.

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

export const dashboardStats = [
  { label: 'Today Appointments', value: '24', trend: '+8 scheduled' },
  { label: 'Active Consultations', value: '7', trend: '3 awaiting notes' },
  { label: 'Patient Records', value: '1,248', trend: '42 updated this week' },
  { label: 'Certificates Issued', value: '18', trend: '6 pending approval' },
]

export const upcomingAppointments = [
  { id: 1, time: '08:30 AM', patient: 'Angela Reyes', type: 'Check-up', status: 'Confirmed' },
  { id: 2, time: '09:15 AM', patient: 'Mark Dela Cruz', type: 'Dental concern', status: 'Pending' },
  { id: 3, time: '10:00 AM', patient: 'Joanna Lim', type: 'Follow-up', status: 'In Clinic' },
  { id: 4, time: '11:00 AM', patient: 'John Paul Santos', type: 'Fever', status: 'Pending' },
  { id: 5, time: '01:30 PM', patient: 'Patricia Mae Garcia', type: 'Vaccination', status: 'Confirmed' },
]

export const medicalStaffToday = [
  { name: 'Dr. R. Mendoza', role: 'School Physician', shift: '8:00 AM - 4:00 PM', status: 'On duty' },
  { name: 'Dr. S. Lopez', role: 'School Dentist', shift: '9:00 AM - 3:00 PM', status: 'Break' },
  { name: 'Nurse C. Villanueva', role: 'Clinic Nurse', shift: '7:30 AM - 3:30 PM', status: 'On duty' },
  { name: 'Nurse J. Santos', role: 'Medical Assistant', shift: '10:00 AM - 6:00 PM', status: 'Off duty' },
]

export const clinicActivity = [
  { label: 'Consultations', percent: 78 },
  { label: 'Prescriptions', percent: 52 },
  { label: 'Certificates', percent: 34 },
]

export const mockPatients = [
  { id: '2023-0104', name: 'Angela Reyes', type: 'Student', courseDept: 'BS Computer Science', contact: '0912-345-6789', emergencyContact: 'Maria Reyes (Mother) - 0912-345-6780', allergies: 'Peanuts, Penicillin', history: 'Mild Asthma, Migraines', status: 'Active' },
  { id: '2022-0941', name: 'Mark Dela Cruz', type: 'Student', courseDept: 'BS Information Technology', contact: '0922-876-5432', emergencyContact: 'Tomas Dela Cruz (Father) - 0922-876-5431', allergies: 'None', history: 'Gastroesophageal reflux disease (GERD)', status: 'Active' },
  { id: '2021-1122', name: 'Joanna Lim', type: 'Student', courseDept: 'BEED Elementary Education', contact: '0933-222-1111', emergencyContact: 'Lim Sian (Father) - 0933-222-0000', allergies: 'Sulfa drugs', history: 'Allergic Rhinitis', status: 'Active' },
  { id: 'EMP-042', name: 'Dr. Alberto Ruiz', type: 'Faculty', courseDept: 'College of Engineering', contact: '0944-123-9876', emergencyContact: 'Elena Ruiz (Wife) - 0944-123-9870', allergies: 'Aspirin', history: 'Hypertension', status: 'Active' },
  { id: 'EMP-119', name: 'Susan Clave', type: 'Staff', courseDept: 'Registrar Office', contact: '0955-456-7890', emergencyContact: 'Robert Clave (Husband) - 0955-456-7891', allergies: 'Seafood', history: 'None', status: 'Active' },
  { id: '2023-0881', name: 'John Paul Santos', type: 'Student', courseDept: 'BS Business Administration', contact: '0977-123-4567', emergencyContact: 'Lorna Santos (Mother) - 0977-123-4568', allergies: 'None', history: 'None', status: 'Active' },
  { id: '2024-0012', name: 'Patricia Mae Garcia', type: 'Student', courseDept: 'BS Hospitality Management', contact: '0998-765-4321', emergencyContact: 'Leon Garcia (Father) - 0998-765-4320', allergies: 'Dust Mites', history: 'Eczema', status: 'Active' }
]

export const mockConsultations = [
  { id: 'C-2026-001', date: '2026-07-30', time: '08:45 AM', patient: 'Angela Reyes', staff: 'Dr. R. Mendoza', symptoms: 'Severe Headache, Nausea', vitals: { bp: '110/70', temp: '36.8°C', pulse: '72 bpm' }, diagnosis: 'Tension Headache due to fatigue', treatment: 'Paracetamol 500mg, 1 tab. Rest in clinic for 1 hour.', disposition: 'Sent to Class' },
  { id: 'C-2026-002', date: '2026-07-30', time: '10:15 AM', patient: 'Joanna Lim', staff: 'Nurse C. Villanueva', symptoms: 'Slight Fever, Runny Nose', vitals: { bp: '120/80', temp: '37.9°C', pulse: '84 bpm' }, diagnosis: 'Mild Flu Symptoms', treatment: 'Paracetamol 500mg (every 4 hours), Cetirizine 10mg. Oral rehydration.', disposition: 'Sent Home' },
  { id: 'C-2026-003', date: '2026-07-29', time: '02:00 PM', patient: 'Mark Dela Cruz', staff: 'Dr. R. Mendoza', symptoms: 'Acid Reflux, Burning Sensation in Chest', vitals: { bp: '120/75', temp: '36.5°C', pulse: '76 bpm' }, diagnosis: 'Acid Reflux / GERD Flare-up', treatment: 'Antacid liquid 10ml.', disposition: 'Sent to Class' },
  { id: 'C-2026-004', date: '2026-07-29', time: '11:30 AM', patient: 'Susan Clave', staff: 'Nurse C. Villanueva', symptoms: 'Accidental Slip, Minor Ankle Sprain', vitals: { bp: '130/80', temp: '36.4°C', pulse: '88 bpm' }, diagnosis: 'Grade 1 Right Ankle Sprain', treatment: 'R.I.C.E. protocol, elastic bandage applied. Advised Ibuprofen 400mg.', disposition: 'Referred to Hospital' }
]

export const mockInventory = [
  { name: 'Paracetamol 500mg', category: 'Analgesics', quantity: 240, threshold: 50, unit: 'Tablets', status: 'Normal' },
  { name: 'Ibuprofen 400mg', category: 'Analgesics', quantity: 18, threshold: 30, unit: 'Tablets', status: 'Low Stock' },
  { name: 'Amoxicillin 500mg', category: 'Antibiotics', quantity: 85, threshold: 25, unit: 'Tablets', status: 'Normal' },
  { name: 'Cetirizine 10mg', category: 'Antihistamines', quantity: 12, threshold: 20, unit: 'Tablets', status: 'Low Stock' },
  { name: 'Vitamin C + Zinc', category: 'Supplements', quantity: 500, threshold: 100, unit: 'Tablets', status: 'Normal' },
  { name: 'Ethyl Alcohol 70%', category: 'Antiseptics', quantity: 3, threshold: 5, unit: 'Gallons', status: 'Low Stock' },
  { name: 'Sterile Gauze Pads 3x3', category: 'Supplies', quantity: 120, threshold: 30, unit: 'Pcs', status: 'Normal' },
]

export const mockActivityLogs = [
  { time: '10:45 AM', user: 'Nurse C. Villanueva', action: 'Logged consultation record for Joanna Lim (BS Education).' },
  { time: '10:00 AM', user: 'Dr. R. Mendoza', action: 'Updated medical profile of Angela Reyes (BS Computer Science).' },
  { time: '09:20 AM', user: 'Nurse C. Villanueva', action: 'Approved medical certificate request for Joanna Lim.' },
  { time: '08:35 AM', user: 'System', action: 'New online appointment requested by Angela Reyes.' }
]

export const mockPeakHours = [
  { label: '08:00 AM - 10:00 AM', count: 18, percent: 85 },
  { label: '10:00 AM - 12:00 PM', count: 22, percent: 100 },
  { label: '12:00 PM - 02:00 PM', count: 8, percent: 36 },
  { label: '02:00 PM - 04:00 PM', count: 14, percent: 63 },
  { label: '04:00 PM - 06:00 PM', count: 5, percent: 22 },
]

export const mockUpcomingEvents = [
  { date: 'Aug 03, 2026', title: 'Annual Student Physical Checkup Drive', description: 'Mandatory medical evaluation for incoming first-year college students.' },
  { date: 'Aug 07, 2026', title: 'Campus Blood Donation Campaign', description: 'Organized in collaboration with the Philippine Red Cross at the gymnasium.' },
  { date: 'Aug 12, 2026', title: 'Mental Health & Wellness Seminar', description: 'A seminar on stress management and academic support for college students.' }
]
