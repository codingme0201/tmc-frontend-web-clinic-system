function StatusBadge({ status }) {
  return (
    <span className={`status-badge badge-${status.toLowerCase().replace(/ /g, '-')}`}>
      {status}
    </span>
  )
}

export default StatusBadge
