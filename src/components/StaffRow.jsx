function StaffRow({ name, role, shift }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line-strong/80 bg-white/70 p-3 shadow-2xs transition-all duration-150 hover:border-primary/40 hover:bg-white hover:shadow-xs">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-accent to-[#e67e58] text-[12.5px] font-extrabold text-white shadow-2xs">
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-ink text-[13px] font-bold">{name}</strong>
        <span className="block text-[11.5px] text-muted">{role}</span>
      </div>
      <time className="shrink-0 rounded-md bg-bg px-2 py-0.5 text-[11px] font-bold text-muted-soft">
        {shift}
      </time>
    </div>
  )
}

export default StaffRow
