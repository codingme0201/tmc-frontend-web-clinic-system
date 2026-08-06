function StatCard({ label, value, trend }) {
  return (
    <article className="rounded-lg border border-line-strong bg-surface p-[18px] shadow-[0_16px_34px_rgba(38,71,67,0.08)]">
      <p className="m-0 text-[13px] text-muted">{label}</p>
      <strong className="mb-[5px] mt-[10px] block text-[32px] leading-none text-[#10393b]">
        {value}
      </strong>
      <span className="text-[12px] text-muted">{trend}</span>
    </article>
  )
}

export default StatCard
