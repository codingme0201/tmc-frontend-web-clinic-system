import Icon from './Icon'

function Topbar() {
  return (
    <header className="topbar">
      <div>
        <p className="topbar-kicker">Trinidad Municipal College</p>
        <h1>TMC CareLink Admin</h1>
      </div>
      <div className="topbar-actions">
        <button type="button" aria-label="Search">
          <Icon name="search" />
        </button>
        <button type="button" aria-label="Notifications">
          <Icon name="bell" />
        </button>
        <div className="admin-profile" aria-label="Signed in administrator">
          <span>AD</span>
        </div>
      </div>
    </header>
  )
}

export default Topbar
