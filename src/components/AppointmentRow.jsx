import StatusBadge from './StatusBadge'

function AppointmentRow({ time, patient, type, status }) {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[92px_minmax(0,1fr)_auto] items-start sm:items-center gap-2 sm:gap-3 rounded-xl border border-line-strong/80 bg-white/70 p-3 sm:p-3.5 shadow-2xs transition-all duration-150 hover:border-primary/40 hover:bg-white hover:shadow-xs">
      <div className="flex w-full items-center justify-between sm:w-auto">
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 text-[12px] font-extrabold text-primary">
          {time}
        </span>
        <div className="sm:hidden">
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="min-w-0">
        <strong className="block truncate font-bold text-ink text-[13.5px]">{patient}</strong>
        <span className="block text-[12px] text-muted">{type}</span>
      </div>
      <div className="hidden sm:block">
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

export default AppointmentRow
