function StatCard({ label, value, trend }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line-strong/80 bg-white p-4 sm:p-[18px] shadow-[0_4px_24px_rgba(18,57,59,0.06)] transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(18,57,59,0.1)]">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[11px] sm:text-[12px] font-extrabold uppercase tracking-wider text-muted-soft">
          {label}
        </p>
        <span className="size-2 rounded-full bg-primary/30 transition-colors group-hover:bg-primary" />
      </div>
      <strong className="mb-1 mt-2.5 block text-[26px] sm:text-[32px] font-extrabold leading-none tracking-tight text-[#10393b]">
        {value}
      </strong>
      <span className="text-[11.5px] sm:text-[12px] font-medium text-muted">{trend}</span>
    </article>
  )
}

export default StatCard
