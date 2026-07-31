// Temporary mock dashboard insight data (static charts). Consumed only by the service layer.

export const clinicActivity = [
  { label: 'Consultations', percent: 78 },
  { label: 'Prescriptions', percent: 52 },
  { label: 'Certificates', percent: 34 },
]

export const mockPeakHours = [
  { label: '08:00 AM - 10:00 AM', count: 18, percent: 85 },
  { label: '10:00 AM - 12:00 PM', count: 22, percent: 100 },
  { label: '12:00 PM - 02:00 PM', count: 8, percent: 36 },
  { label: '02:00 PM - 04:00 PM', count: 14, percent: 63 },
  { label: '04:00 PM - 06:00 PM', count: 5, percent: 22 },
]
