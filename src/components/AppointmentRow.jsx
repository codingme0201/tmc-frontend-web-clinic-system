function AppointmentRow({ time, patient, type, status }) {
  return (
    <div className="appointment-row">
      <div className="appointment-time">{time}</div>
      <div>
        <strong>{patient}</strong>
        <span>{type}</span>
      </div>
      <mark>{status}</mark>
    </div>
  )
}

export default AppointmentRow
