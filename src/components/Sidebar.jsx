import Icon from './Icon'
import { useAppContext } from '../context/AppContext'
import { navSections } from '../lib/mockData'

function Sidebar({ collapsed = false, mobileOpen = false, onNavigate }) {
  const { activePage, navigate, logout } = useAppContext()

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
        title={collapsed ? 'Logout' : undefined}
        onClick={logout}
      >
        <Icon name="logout" />
        <span className="nav-item-label">Logout</span>
      </button>
    </aside>
  )
}

export default Sidebar
