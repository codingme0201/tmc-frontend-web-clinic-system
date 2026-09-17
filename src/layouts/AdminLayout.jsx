import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import MobileBottomNav from '../components/MobileBottomNav'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { useToggle } from '../hooks/useToggle'

function AdminLayout({ children }) {
  const [desktopCollapsed, toggleDesktopCollapsed] = useToggle(false)
  const [mobileOpen, toggleMobile, , closeMobile] = useToggle(false)

  const toggleSidebar = () => {
    if (window.innerWidth <= 980) {
      toggleMobile()
    } else {
      toggleDesktopCollapsed()
    }
  }

  return (
    <div
      className={[
        'grid h-svh overflow-hidden bg-bg transition-[grid-template-columns] duration-200 ease-out max-[980px]:grid-cols-1',
        // Exactly one grid-cols utility is present at a time — keeping both
        // in the class list lets equal-specificity CSS order decide the width.
        desktopCollapsed ? 'grid-cols-[76px_minmax(0,1fr)]' : 'grid-cols-[292px_minmax(0,1fr)]',
      ].join(' ')}
    >
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#082020]/65 backdrop-blur-xs transition-opacity duration-300 desktop:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <Sidebar
        collapsed={desktopCollapsed}
        mobileOpen={mobileOpen}
        onNavigate={closeMobile}
        onClose={closeMobile}
      />

      <div className="flex h-svh min-w-0 flex-col overflow-hidden relative">
        <BackendStatusBanner />
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-[26px] max-[980px]:p-[16px_14px_96px_14px]">
          {children}
        </main>
        <MobileBottomNav onOpenMenu={toggleMobile} />
      </div>
    </div>
  )
}

export default AdminLayout
