function Icon({ name }) {
  return (
    <span className={`nav-icon nav-icon-${name}`} aria-hidden="true">
      <span />
    </span>
  )
}

export default Icon
