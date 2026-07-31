// Temporary mock clinical consultation records. Consumed only by the service layer.

export const mockConsultations = [
  { id: 'C-2026-001', date: '2026-07-30', time: '08:45 AM', patient: 'Angela Reyes', staff: 'Dr. R. Mendoza', symptoms: 'Severe Headache, Nausea', vitals: { bp: '110/70', temp: '36.8°C', pulse: '72 bpm' }, diagnosis: 'Tension Headache due to fatigue', treatment: 'Paracetamol 500mg, 1 tab. Rest in clinic for 1 hour.', disposition: 'Sent to Class' },
  { id: 'C-2026-002', date: '2026-07-30', time: '10:15 AM', patient: 'Joanna Lim', staff: 'Nurse C. Villanueva', symptoms: 'Slight Fever, Runny Nose', vitals: { bp: '120/80', temp: '37.9°C', pulse: '84 bpm' }, diagnosis: 'Mild Flu Symptoms', treatment: 'Paracetamol 500mg (every 4 hours), Cetirizine 10mg. Oral rehydration.', disposition: 'Sent Home' },
  { id: 'C-2026-003', date: '2026-07-29', time: '02:00 PM', patient: 'Mark Dela Cruz', staff: 'Dr. R. Mendoza', symptoms: 'Acid Reflux, Burning Sensation in Chest', vitals: { bp: '120/75', temp: '36.5°C', pulse: '76 bpm' }, diagnosis: 'Acid Reflux / GERD Flare-up', treatment: 'Antacid liquid 10ml.', disposition: 'Sent to Class' },
  { id: 'C-2026-004', date: '2026-07-29', time: '11:30 AM', patient: 'Susan Clave', staff: 'Nurse C. Villanueva', symptoms: 'Accidental Slip, Minor Ankle Sprain', vitals: { bp: '130/80', temp: '36.4°C', pulse: '88 bpm' }, diagnosis: 'Grade 1 Right Ankle Sprain', treatment: 'R.I.C.E. protocol, elastic bandage applied. Advised Ibuprofen 400mg.', disposition: 'Referred to Hospital' }
]
