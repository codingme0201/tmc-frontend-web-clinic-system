function StaffRow({ name, role, shift }) {
  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line p-3">
      <div className="grid size-[42px] place-items-center rounded-full bg-accent text-[13px] font-extrabold text-[#fffaf3]">
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <strong className="block text-ink">{name}</strong>
        <span className="block text-[12px] text-muted">{role}</span>
      </div>
      <time className="col-start-2 text-[12px] text-muted">{shift}</time>
    </div>
  )
}

export default StaffRow
