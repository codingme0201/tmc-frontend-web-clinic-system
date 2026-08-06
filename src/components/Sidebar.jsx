import Icon from './Icon'
import InlineSpinner from './Spinner'
import ConfirmLogoutModal from './ConfirmLogoutModal'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useToggle } from '../hooks/useToggle'
import { navSections } from '../lib/navigation'

function Sidebar({ collapsed = false, mobileOpen = false, onNavigate }) {
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
        'fixed inset-y-0 left-0 z-30 flex w-[260px] -translate-x-full flex-col gap-5 overflow-y-auto overflow-x-hidden bg-primary-dark p-[22px_18px] text-[#eaf8f5] transition-[transform,padding] duration-200 ease-out',
        'desktop:sticky desktop:top-0 desktop:h-svh desktop:w-auto desktop:translate-x-0',
        mobileOpen ? 'translate-x-0' : '',
        collapsed ? 'desktop:px-[14px]' : '',
      ].join(' ')}
      aria-label="Admin navigation"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-gold font-extrabold text-primary-dark">
          TC
        </div>
        <div className={collapsed ? 'desktop:hidden' : ''}>
          <strong className="block text-[17px] leading-[1.1] text-white">TMC CareLink</strong>
          <span className="mt-[3px] block text-[12px] text-[#a9d1ca]">Clinic Administration</span>
        </div>
      </div>

      <nav className="flex flex-col gap-4">
        {visibleSections.map((section, sectionIndex) => (
          <div className="grid gap-[5px]" key={section.label ?? sectionIndex}>
            {section.label ? (
              <p
                className={`mx-[10px] mb-[3px] mt-[10px] text-[11px] font-extrabold uppercase text-[#86bdb4] ${collapsed ? 'desktop:hidden' : ''}`}
              >
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => (
              <button
                type="button"
                className={[
                  'flex min-h-10 w-full cursor-pointer items-center gap-[11px] rounded-lg px-[11px] py-[10px] text-left text-[#d9efea] transition-colors duration-150 hover:bg-white/10',
                  activePage === item.id
                    ? 'bg-primary text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]'
                    : '',
                  collapsed ? 'desktop:justify-center desktop:px-[10px]' : '',
                ].join(' ')}
                key={item.id}
                title={collapsed ? item.label : undefined}
                onClick={() => handleNavigate(item.id)}
              >
                <Icon name={item.icon} />
                <span className={collapsed ? 'desktop:hidden' : ''}>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button
        type="button"
        className={[
          'mt-auto flex min-h-10 w-full cursor-pointer items-center gap-[11px] rounded-lg px-[11px] py-[10px] text-left text-[#ffe6db] transition-colors duration-150 hover:bg-white/10 disabled:cursor-not-allowed',
          collapsed ? 'desktop:justify-center desktop:px-[10px]' : '',
        ].join(' ')}
        title={collapsed ? (isLoggingOut ? 'Logging out...' : 'Logout') : undefined}
        onClick={openLogout}
        disabled={isLoggingOut}
        aria-label={isLoggingOut ? 'Logging out' : 'Logout'}
      >
        {isLoggingOut ? <InlineSpinner /> : <Icon name="logout" />}
        <span className={collapsed ? 'desktop:hidden' : ''}>
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </span>
      </button>

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
