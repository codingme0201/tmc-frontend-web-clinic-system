import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useAppContext } from '../context/AppContext'

function Topbar({ onToggleSidebar }) {
  const { logout } = useAppContext()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    const confirmed = window.confirm('Sign out of Admin Panel? You will be returned to the login page.')
    if (confirmed) logout()
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="hamburger-button"
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
        >
          <span />
          <span />
          <span />
        </button>
        <div>
          <p className="topbar-kicker">Trinidad Municipal College</p>
          <h1>TMC CareLink Admin</h1>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="online-indicator">
          <span className="online-dot" />
          Online
        </div>
        <button type="button" aria-label="Notifications">
          <Icon name="bell" />
        </button>

        <div className="admin-profile-menu" ref={dropdownRef}>
          <button
            type="button"
            className="admin-profile-trigger"
            onClick={() => setDropdownOpen((open) => !open)}
            aria-label="Account menu"
          >
            <div className="admin-profile" aria-hidden="true">
              <span>AD</span>
            </div>
          </button>

          {dropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <p>Admin User</p>
                <span>Administrator</span>
              </div>
              <button type="button" className="profile-dropdown-logout" onClick={handleLogout}>
                <Icon name="logout" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
