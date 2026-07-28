import Icon from './Icon'
import { useAppContext } from '../context/AppContext'
import { navSections } from '../lib/mockData'

function Sidebar() {
  const { activePage, navigate, logout } = useAppContext()

  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <div className="brand-block">
        <div className="brand-mark">TC</div>
        <div>
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
                onClick={() => navigate(item.id)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button type="button" className="logout-button" onClick={logout}>
        <Icon name="logout" />
        <span>Logout</span>
      </button>
    </aside>
  )
}

export default Sidebar
