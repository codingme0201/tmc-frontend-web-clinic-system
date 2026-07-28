function PlaceholderPage({ page }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-panel">
        <p>{page.eyebrow}</p>
        <h2>{page.title}</h2>
        <span>{page.description}</span>
        <strong>Future development</strong>
      </div>
    </section>
  )
}

export default PlaceholderPage
