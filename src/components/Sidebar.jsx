import Icon from './Icon'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../hooks/useAuth'
import { navSections } from '../lib/navigation'

function Sidebar({ collapsed = false, mobileOpen = false, onNavigate }) {
  const { activePage, navigate } = useAppContext()
  const { logout, isLoggingOut } = useAuth()

  const handleNavigate = (pageId) => {
    navigate(pageId)
    onNavigate?.()
  }

  return (
    <aside
      className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label="Admin navigation"
    >
      <div className="brand-block">
        <div className="brand-mark">TC</div>
        <div className="brand-text">
          <strong>TMC CareLink</strong>
          <span>Clinic Administration</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section, sectionIndex) => (
          <div className="nav-section" key={section.label ?? sectionIndex}>
            {section.label ? <p className="nav-section-label">{section.label}</p> : null}
            {section.items.map((item) => (
              <button
                type="button"
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                key={item.id}
                title={collapsed ? item.label : undefined}
                onClick={() => handleNavigate(item.id)}
              >
                <Icon name={item.icon} />
                <span className="nav-item-label">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button
        type="button"
        className="logout-button"
        title={collapsed ? (isLoggingOut ? 'Logging out...' : 'Logout') : undefined}
        onClick={logout}
        disabled={isLoggingOut}
        aria-label={isLoggingOut ? 'Logging out' : 'Logout'}
      >
        {isLoggingOut ? <span className="spinner-sm" aria-hidden="true" /> : <Icon name="logout" />}
        <span className="nav-item-label">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
      </button>
    </aside>
  )
}

export default Sidebar
