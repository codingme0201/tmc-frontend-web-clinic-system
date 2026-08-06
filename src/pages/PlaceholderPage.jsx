function PlaceholderPage({ page }) {
  return (
    <section className="grid min-h-[calc(100svh-134px)] place-items-center">
      <div className="w-[min(620px,100%)] rounded-lg border border-line-strong bg-surface p-[34px] text-center shadow-[0_16px_34px_rgba(38,71,67,0.08)] max-[620px]:p-[22px]">
        <p className="mb-1 text-[12px] font-extrabold uppercase tracking-normal text-muted-soft">
          {page.eyebrow}
        </p>
        <h2 className="m-0 text-[clamp(28px,7vw,42px)] text-ink">{page.title}</h2>
        <span className="mx-auto mb-6 mt-3 block max-w-[480px] text-muted">{page.description}</span>
        <strong className="inline-flex rounded-full bg-bg px-[13px] py-2 text-primary">
          Future development
        </strong>
      </div>
    </section>
  )
}

export default PlaceholderPage
