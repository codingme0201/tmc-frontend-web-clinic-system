import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function AdminLayout({ children }) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleSidebar = () => {
    if (window.innerWidth < 980) {
      setMobileOpen((open) => !open)
    } else {
      setDesktopCollapsed((collapsed) => !collapsed)
    }
  }

  return (
    <div className={`admin-shell ${desktopCollapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <Sidebar
        collapsed={desktopCollapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className="admin-main">
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="content-area">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout
