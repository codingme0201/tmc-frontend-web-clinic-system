function AppointmentRow({ time, patient, type, status }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line p-3 max-[620px]:grid-cols-1">
      <div className="text-[13px] font-extrabold text-primary">{time}</div>
      <div>
        <strong className="block text-ink">{patient}</strong>
        <span className="block text-[12px] text-muted">{type}</span>
      </div>
      <mark className="justify-self-start rounded-full bg-[#fff2d5] px-[9px] py-[5px] text-[11px] font-extrabold text-[#815400]">
        {status}
      </mark>
    </div>
  )
}

export default AppointmentRow
