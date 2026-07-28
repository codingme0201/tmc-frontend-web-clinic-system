function StaffRow({ name, role, shift }) {
  return (
    <div className="staff-row">
      <div className="staff-avatar">{name.slice(0, 2).toUpperCase()}</div>
      <div>
        <strong>{name}</strong>
        <span>{role}</span>
      </div>
      <time>{shift}</time>
    </div>
  )
}

export default StaffRow
