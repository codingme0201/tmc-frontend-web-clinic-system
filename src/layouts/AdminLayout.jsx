import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useToggle } from '../hooks/useToggle'

function AdminLayout({ children }) {
  const [desktopCollapsed, toggleDesktopCollapsed] = useToggle(false)
  const [mobileOpen, toggleMobile, , closeMobile] = useToggle(false)

  const toggleSidebar = () => {
    if (window.innerWidth < 980) {
      toggleMobile()
    } else {
      toggleDesktopCollapsed()
    }
  }

  return (
    <div className={`admin-shell ${desktopCollapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobile} />
      )}

      <Sidebar
        collapsed={desktopCollapsed}
        mobileOpen={mobileOpen}
        onNavigate={closeMobile}
      />

      <div className="admin-main">
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="content-area">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout
