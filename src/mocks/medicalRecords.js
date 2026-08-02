// Temporary mock patient medical records. Consumed only by the service layer.
//
// Each record is shaped like the future REST API response:
//   { id, patientId, name, age, sex, ...clinical sections }
// `consultations` are intentionally NOT stored here — the Medical Records
// page derives each patient's consultation history from the shared
// Consultations store (by patientId), so both modules stay in sync.

export const mockMedicalRecords = [
  {
    id: 'MR-0001',
    patientId: '2023-0104',
    name: 'Angela Reyes',
    age: 20,
    sex: 'Female',
    type: 'Student',
    courseDept: 'BS Computer Science',
    contact: '0912-345-6789',
    emergencyContact: 'Maria Reyes (Mother) — 0912-345-6780',
    status: 'Active',
    lastUpdated: '2026-08-05',
    medicalHistory: [
      { id: 'MH-001', date: '2025-06-10', condition: 'Allergic Rhinitis', notes: 'Recurring seasonal symptoms; managed with antihistamines.' },
      { id: 'MH-002', date: '2024-03-22', condition: 'Recurring headaches', notes: 'Occasional migraines triggered by stress and lack of sleep.' },
      { id: 'MH-003', date: '2023-11-05', condition: 'Respiratory infection', notes: 'Upper respiratory tract infection, recovered fully.' },
    ],
    conditions: [
      { id: 'MC-001', name: 'Mild Asthma', status: 'Active', diagnosedDate: '2023-11-12', notes: 'Exercise-induced; rescue inhaler advised.' },
      { id: 'MC-002', name: 'Migraines', status: 'Active', diagnosedDate: '2024-04-02', notes: 'Patient advised to monitor triggers and maintain regular sleep.' },
    ],
    allergies: [
      { id: 'AL-001', allergen: 'Peanuts', reaction: 'Swelling and hives', severity: 'Severe', dateRecorded: '2023-06-15', notes: 'Carries emergency antihistamine.' },
      { id: 'AL-002', allergen: 'Penicillin', reaction: 'Skin rash', severity: 'Moderate', dateRecorded: '2024-01-20', notes: 'Avoid penicillin-based antibiotics.' },
    ],
    medications: [
      { id: 'MED-001', name: 'Paracetamol', dosage: '500 mg', frequency: 'Every 6 hours as needed', route: 'Oral', prescribedBy: 'Dr. R. Mendoza', prescribedDate: '2026-07-30', startDate: '2026-07-30', endDate: '', status: 'Completed', instructions: 'Take with food if stomach upset occurs.' },
      { id: 'MED-002', name: 'Salbutamol Inhaler', dosage: '100 mcg', frequency: 'As needed (max 2 puffs)', route: 'Inhalation', prescribedBy: 'Dr. R. Mendoza', prescribedDate: '2026-05-10', startDate: '2026-05-10', endDate: '', status: 'Active', instructions: 'Use before exercise or when wheezing.' },
    ],
  },
  {
    id: 'MR-0002',
    patientId: '2022-0941',
    name: 'Mark Dela Cruz',
    age: 21,
    sex: 'Male',
    type: 'Student',
    courseDept: 'BS Information Technology',
    contact: '0922-876-5432',
    emergencyContact: 'Tomas Dela Cruz (Father) — 0922-876-5431',
    status: 'Active',
    lastUpdated: '2026-08-03',
    medicalHistory: [
      { id: 'MH-001', date: '2023-02-20', condition: 'Gastroesophageal reflux disease (GERD)', notes: 'Managed with dietary changes and proton pump inhibitors.' },
      { id: 'MH-002', date: '2022-08-14', condition: 'Dengue fever', notes: 'Admitted for observation; recovered without complications.' },
    ],
    conditions: [
      { id: 'MC-001', name: 'GERD', status: 'Active', diagnosedDate: '2023-02-20', notes: 'Avoid spicy food and late meals; follow-up refills on file.' },
    ],
    allergies: [],
    medications: [
      { id: 'MED-001', name: 'Omeprazole', dosage: '20 mg', frequency: 'Once daily before breakfast', route: 'Oral', prescribedBy: 'Dr. R. Mendoza', prescribedDate: '2026-07-29', startDate: '2026-07-29', endDate: '', status: 'Active', instructions: 'Take 30 minutes before a meal.' },
      { id: 'MED-002', name: 'Antacid Liquid', dosage: '10 ml', frequency: 'As needed for heartburn', route: 'Oral', prescribedBy: 'Dr. R. Mendoza', prescribedDate: '2026-07-29', startDate: '2026-07-29', endDate: '', status: 'Completed', instructions: 'Shake well before use.' },
    ],
  },
  {
    id: 'MR-0003',
    patientId: '2021-1122',
    name: 'Joanna Lim',
    age: 23,
    sex: 'Female',
    type: 'Student',
    courseDept: 'BEED Elementary Education',
    contact: '0933-222-1111',
    emergencyContact: 'Lim Sian (Father) — 0933-222-0000',
    status: 'Active',
    lastUpdated: '2026-08-04',
    medicalHistory: [
      { id: 'MH-001', date: '2025-06-10', condition: 'Allergic Rhinitis', notes: 'Seasonal; controlled with oral antihistamines.' },
      { id: 'MH-002', date: '2024-09-15', condition: 'Contact dermatitis', notes: 'Forearm rash from fabric; resolved with topical steroid.' },
    ],
    conditions: [
      { id: 'MC-001', name: 'Allergic Rhinitis', status: 'Active', diagnosedDate: '2025-06-10', notes: 'Seasonal triggers; antihistamine on standing order.' },
      { id: 'MC-002', name: 'Contact Dermatitis', status: 'Inactive', diagnosedDate: '2024-09-15', notes: 'Rash resolved; avoid known irritants.' },
    ],
    allergies: [
      { id: 'AL-001', allergen: 'Sulfa Drugs', reaction: 'Skin rash', severity: 'Moderate', dateRecorded: '2024-01-20', notes: 'Do not prescribe sulfonamide antibiotics.' },
    ],
    medications: [
      { id: 'MED-001', name: 'Cetirizine', dosage: '10 mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Nurse C. Villanueva', prescribedDate: '2026-06-15', startDate: '2026-06-15', endDate: '', status: 'Active', instructions: 'May cause drowsiness; take at night if needed.' },
      { id: 'MED-002', name: 'Paracetamol', dosage: '500 mg', frequency: 'Every 4 hours as needed', route: 'Oral', prescribedBy: 'Nurse C. Villanueva', prescribedDate: '2026-07-30', startDate: '2026-07-30', endDate: '2026-08-02', status: 'Completed', instructions: 'Do not exceed 4 doses in 24 hours.' },
    ],
  },
  {
    id: 'MR-0004',
    patientId: 'EMP-119',
    name: 'Susan Clave',
    age: 45,
    sex: 'Female',
    type: 'Staff',
    courseDept: 'Registrar Office',
    contact: '0955-456-7890',
    emergencyContact: 'Robert Clave (Husband) — 0955-456-7891',
    status: 'Active',
    lastUpdated: '2026-07-29',
    medicalHistory: [
      { id: 'MH-001', date: '2025-07-10', condition: 'Right ankle sprain', notes: 'Recovered with R.I.C.E. protocol and physiotherapy.' },
      { id: 'MH-002', date: '2024-02-18', condition: 'Urinary tract infection', notes: 'Resolved with a course of antibiotics.' },
    ],
    conditions: [
      { id: 'MC-001', name: 'Right Ankle Sprain', status: 'Resolved', diagnosedDate: '2025-07-10', notes: 'Full range of motion restored.' },
    ],
    allergies: [
      { id: 'AL-001', allergen: 'Seafood', reaction: 'Hives and itching', severity: 'Mild', dateRecorded: '2024-03-02', notes: 'Mild reaction; antihistamine sufficient.' },
    ],
    medications: [
      { id: 'MED-001', name: 'Ibuprofen', dosage: '400 mg', frequency: 'Every 8 hours for 3 days', route: 'Oral', prescribedBy: 'Nurse C. Villanueva', prescribedDate: '2026-07-29', startDate: '2026-07-29', endDate: '2026-08-01', status: 'Completed', instructions: 'Take with food.' },
    ],
  },
  {
    id: 'MR-0005',
    patientId: '2023-0881',
    name: 'John Paul Santos',
    age: 20,
    sex: 'Male',
    type: 'Student',
    courseDept: 'BS Business Administration',
    contact: '0977-123-4567',
    emergencyContact: 'Lorna Santos (Mother) — 0977-123-4568',
    status: 'Active',
    lastUpdated: '2026-08-01',
    medicalHistory: [
      { id: 'MH-001', date: '2024-07-19', condition: 'Dengue fever', notes: 'Hospitalized for observation; platelet count normalized.' },
      { id: 'MH-002', date: '2023-12-01', condition: 'Bronchitis', notes: 'Treated with rest and fluids; resolved in one week.' },
    ],
    conditions: [],
    allergies: [],
    medications: [
      { id: 'MED-001', name: 'Paracetamol', dosage: '500 mg', frequency: 'Every 6 hours as needed', route: 'Oral', prescribedBy: 'Nurse C. Villanueva', prescribedDate: '2026-08-01', startDate: '2026-08-01', endDate: '', status: 'Active', instructions: 'Use for fever and body aches.' },
      { id: 'MED-002', name: 'Oral Rehydration Salts', dosage: '1 sachet', frequency: 'Every 3 hours', route: 'Oral', prescribedBy: 'Nurse C. Villanueva', prescribedDate: '2026-08-01', startDate: '2026-08-01', endDate: '', status: 'Active', instructions: 'Dissolve in 200 ml of water.' },
    ],
  },
  {
    id: 'MR-0006',
    patientId: '2024-0012',
    name: 'Patricia Mae Garcia',
    age: 19,
    sex: 'Female',
    type: 'Student',
    courseDept: 'BS Hospitality Management',
    contact: '0998-765-4321',
    emergencyContact: 'Leon Garcia (Father) — 0998-765-4320',
    status: 'Active',
    lastUpdated: '2026-07-28',
    medicalHistory: [
      { id: 'MH-001', date: '2024-01-30', condition: 'Eczema', notes: 'Recurring dry patches on arms; controlled with moisturizers.' },
      { id: 'MH-002', date: '2023-10-12', condition: 'Dental caries', notes: 'Treated with temporary filling; follow-up scheduled.' },
    ],
    conditions: [
      { id: 'MC-001', name: 'Eczema', status: 'Active', diagnosedDate: '2024-01-30', notes: 'Avoid dust mites and harsh soaps.' },
      { id: 'MC-002', name: 'Dental Caries', status: 'Resolved', diagnosedDate: '2023-10-12', notes: 'Temporary filling applied; root canal follow-up advised.' },
    ],
    allergies: [
      { id: 'AL-001', allergen: 'Dust Mites', reaction: 'Sneezing and nasal congestion', severity: 'Mild', dateRecorded: '2024-02-05', notes: 'Trigger for eczema flare-ups.' },
    ],
    medications: [
      { id: 'MED-001', name: 'Hydrocortisone Cream', dosage: '1%', frequency: 'Twice daily on affected areas', route: 'Topical', prescribedBy: 'Dr. S. Lopez', prescribedDate: '2026-04-18', startDate: '2026-04-18', endDate: '', status: 'Active', instructions: 'Apply a thin layer; avoid broken skin.' },
      { id: 'MED-002', name: 'Analgesic', dosage: '500 mg', frequency: 'Every 6 hours as needed', route: 'Oral', prescribedBy: 'Dr. S. Lopez', prescribedDate: '2026-07-28', startDate: '2026-07-28', endDate: '2026-07-30', status: 'Completed', instructions: 'For post-dental procedure pain.' },
    ],
  },
  {
    id: 'MR-0007',
    patientId: 'EMP-042',
    name: 'Dr. Alberto Ruiz',
    age: 48,
    sex: 'Male',
    type: 'Faculty',
    courseDept: 'College of Engineering',
    contact: '0944-123-9876',
    emergencyContact: 'Elena Ruiz (Wife) — 0944-123-9870',
    status: 'Active',
    lastUpdated: '2026-07-15',
    medicalHistory: [
      { id: 'MH-001', date: '2022-03-14', condition: 'Hypertension', notes: 'Lifestyle modification and daily medication; monitored regularly.' },
      { id: 'MH-002', date: '2019-08-30', condition: 'Gastritis', notes: 'Resolved with short-term acid suppression.' },
    ],
    conditions: [
      { id: 'MC-001', name: 'Hypertension', status: 'Active', diagnosedDate: '2022-03-14', notes: 'Advise regular BP monitoring and low-sodium diet.' },
    ],
    allergies: [
      { id: 'AL-001', allergen: 'Aspirin', reaction: 'Stomach pain', severity: 'Moderate', dateRecorded: '2020-11-22', notes: 'Avoid NSAIDs; use paracetamol instead.' },
    ],
    medications: [
      { id: 'MED-001', name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Dr. R. Mendoza', prescribedDate: '2022-03-14', startDate: '2022-03-14', endDate: '', status: 'Active', instructions: 'Take at the same time each day.' },
      { id: 'MED-002', name: 'Esomeprazole', dosage: '20 mg', frequency: 'Once daily for 14 days', route: 'Oral', prescribedBy: 'Dr. R. Mendoza', prescribedDate: '2019-08-30', startDate: '2019-08-30', endDate: '2019-09-13', status: 'Completed', instructions: 'Complete the full course.' },
    ],
  },
]
