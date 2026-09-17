import Icon from './Icon'
import InlineSpinner from './Spinner'
import ConfirmLogoutModal from './ConfirmLogoutModal'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useToggle } from '../hooks/useToggle'
import { navSections } from '../lib/navigation'

function Sidebar({ collapsed = false, mobileOpen = false, onNavigate, onClose }) {
  const { activePage, navigate } = useAppContext()
  const { logout, isLoggingOut, can, user } = useAuth()
  const { showToast } = useToast()
  const [logoutOpen, , openLogout, closeLogout] = useToggle(false)

  // Module access control: only show nav items the user's role permits.
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((section) => section.items.length > 0)

  const handleNavigate = (pageId) => {
    navigate(pageId)
    onNavigate?.()
  }

  const confirmLogout = async () => {
    if (isLoggingOut) return
    await logout()
    closeLogout()
    showToast('Signed out successfully.')
  }

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] -translate-x-full flex-col gap-4 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#083b3f] via-[#094145] to-[#062c30] p-[20px_16px] text-[#eaf8f5] shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-[transform,padding] duration-250 ease-out',
        'desktop:sticky desktop:top-0 desktop:h-svh desktop:w-auto desktop:translate-x-0 desktop:rounded-none desktop:bg-primary-dark desktop:shadow-none desktop:p-[22px_18px]',
        mobileOpen ? 'translate-x-0 rounded-r-3xl' : '',
        collapsed ? 'desktop:px-[14px]' : '',
      ].join(' ')}
      aria-label="Admin navigation"
    >
      {/* Brand Header + Mobile Close Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold font-extrabold text-primary-dark shadow-xs">
            TC
          </div>
          <div className={collapsed ? 'desktop:hidden' : ''}>
            <strong className="block text-[16px] leading-[1.1] text-white font-extrabold tracking-tight">
              TMC CareLink
            </strong>
            <span className="mt-[2px] block text-[11.5px] text-[#9bd1c8]">Clinic Administration</span>
          </div>
        </div>

        {/* Dedicated Mobile Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid size-8 place-items-center rounded-lg bg-white/10 text-white/80 transition-all hover:bg-white/20 active:scale-90 desktop:hidden"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Mobile User Profile Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm desktop:hidden">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-accent to-[#e67e58] text-[12.5px] font-extrabold text-white shadow-2xs">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-white leading-tight">
              {user?.name || 'Administrator'}
            </p>
            <span className="text-[11px] font-medium text-[#9cd4cb]">Administrator</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-[#6be3a6]">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Online
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-3.5 mt-1">
        {visibleSections.map((section, sectionIndex) => (
          <div className="grid gap-[3px]" key={section.label ?? sectionIndex}>
            {section.label ? (
              <p
                className={`mx-2 mb-[3px] mt-2 text-[10.5px] font-extrabold uppercase tracking-wider text-[#7eb9ae] ${collapsed ? 'desktop:hidden' : ''}`}
              >
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => {
              const isActive = activePage === item.id
              return (
                <button
                  type="button"
                  className={[
                    'flex min-h-[42px] w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition-all duration-150 active:scale-[0.98]',
                    isActive
                      ? 'bg-gradient-to-r from-primary to-[#199083] text-white shadow-[0_4px_16px_rgba(20,120,109,0.35)]'
                      : 'text-[#d3ece7] hover:bg-white/10 active:bg-white/15',
                    collapsed ? 'desktop:justify-center desktop:px-[10px]' : '',
                  ].join(' ')}
                  key={item.id}
                  title={collapsed ? item.label : undefined}
                  onClick={() => handleNavigate(item.id)}
                >
                  <Icon name={item.icon} size={18} />
                  <span className={collapsed ? 'desktop:hidden' : ''}>{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Sign Out Button */}
      <div className="mt-auto pt-3 border-t border-white/10">
        <button
          type="button"
          className={[
            'flex min-h-[42px] w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[#ffd8cb] transition-all duration-150 hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed',
            collapsed ? 'desktop:justify-center desktop:px-[10px]' : '',
          ].join(' ')}
          title={collapsed ? (isLoggingOut ? 'Logging out...' : 'Logout') : undefined}
          onClick={openLogout}
          disabled={isLoggingOut}
          aria-label={isLoggingOut ? 'Logging out' : 'Logout'}
        >
          {isLoggingOut ? <InlineSpinner /> : <Icon name="logout" size={18} />}
          <span className={collapsed ? 'desktop:hidden' : ''}>
            {isLoggingOut ? 'Logging out...' : 'Sign out'}
          </span>
        </button>
      </div>

      <ConfirmLogoutModal
        open={logoutOpen}
        user={user}
        busy={isLoggingOut}
        onClose={closeLogout}
        onConfirm={confirmLogout}
      />
    </aside>
  )
}

export default Sidebar
