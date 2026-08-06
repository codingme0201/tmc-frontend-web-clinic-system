function ActivityBar({ label, percent }) {
  return (
    <div className="grid gap-[7px]" style={{ '--bar-size': `${percent}%` }}>
      <span className="text-[13px] font-extrabold text-ink">{label}</span>
      <b className="block h-[10px] w-full rounded-full bg-[linear-gradient(90deg,var(--color-primary)_var(--bar-size),#e5efec_var(--bar-size))]" />
    </div>
  )
}

export default ActivityBar
