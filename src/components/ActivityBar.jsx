function ActivityBar({ label, percent }) {
  return (
    <div style={{ '--bar-size': `${percent}%` }}>
      <span>{label}</span>
      <b />
    </div>
  )
}

export default ActivityBar
