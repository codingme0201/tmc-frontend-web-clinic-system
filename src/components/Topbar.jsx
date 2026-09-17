import { useEffect, useRef } from 'react'
import Icon from './Icon'
import InlineSpinner from './Spinner'
import ConfirmLogoutModal from './ConfirmLogoutModal'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { useToast } from '../hooks/useToast'
import { useToggle } from '../hooks/useToggle'

function Topbar({ onToggleSidebar }) {
  const { logout, isLoggingOut, user } = useAuth()
  const { unreadCount } = useNotifications('topbar')
  const { showToast } = useToast()
  const [dropdownOpen, toggleDropdown, , closeDropdown] = useToggle(false)
  const [logoutOpen, , openLogout, closeLogout] = useToggle(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [closeDropdown])

  const openLogoutConfirm = () => {
    closeDropdown()
    if (isLoggingOut) return
    openLogout()
  }

  const confirmLogout = async () => {
    if (isLoggingOut) return
    await logout()
    closeLogout()
    showToast('Signed out successfully.')
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-[64px] sm:min-h-[76px] items-center justify-between gap-3 sm:gap-[18px] border-b border-[#dce8e5]/80 bg-white/90 px-3.5 sm:px-[28px] py-2.5 sm:py-[14px] backdrop-blur-xl shadow-[0_2px_12px_rgba(18,57,59,0.03)]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-line-strong/60 bg-bg text-primary transition-all duration-150 hover:bg-[#dbeae5] active:scale-95 shadow-2xs"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
          >
            <div className="flex flex-col gap-[3.5px]">
              <span className="h-[2px] w-[18px] rounded-full bg-[#16484b]" />
              <span className="h-[2px] w-[18px] rounded-full bg-[#16484b]" />
              <span className="h-[2px] w-[14px] rounded-full bg-[#16484b]" />
            </div>
          </button>
          <div className="min-w-0">
            <p className="mb-0 text-[10.5px] sm:text-[11.5px] font-extrabold uppercase tracking-wider text-muted-soft truncate">
              Trinidad Municipal College
            </p>
            <h1 className="text-[16px] sm:text-[20px] font-extrabold text-ink leading-tight truncate">
              TMC CareLink
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-2.5 py-1 text-[11.5px] font-extrabold text-success">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Online
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="relative grid size-10 cursor-pointer place-items-center rounded-xl border border-line-strong/60 bg-bg text-[#16484b] transition-all duration-150 hover:bg-[#dbeae5] active:scale-95 shadow-2xs"
            onClick={() => { window.location.hash = '#/notifications' }}
          >
            <Icon name="bell" size={19} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-danger text-[10px] font-extrabold text-white ring-2 ring-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="relative cursor-pointer border-0 bg-transparent p-0 active:scale-95 transition-transform"
              onClick={toggleDropdown}
              aria-label="Account menu"
            >
              <div
                className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-accent to-[#e67e58] text-[13px] font-extrabold text-white shadow-2xs"
                aria-hidden="true"
              >
                <span>{user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-white" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[220px] overflow-hidden rounded-2xl border border-line-strong/80 bg-white/95 p-1.5 backdrop-blur-xl shadow-[0_16px_36px_rgba(18,57,59,0.15)] animate-modal-scale">
                <div className="border-b border-[#eef4f2] px-3 py-2.5">
                  <p className="m-0 text-[13.5px] font-extrabold text-ink truncate">
                    {user?.name || 'Admin User'}
                  </p>
                  <span className="text-[11.5px] font-bold text-accent">Administrator</span>
                </div>
                <button
                  type="button"
                  className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-xl border-0 bg-transparent px-3 py-2.5 text-left text-[13px] font-bold text-danger transition-colors hover:bg-[#fdf1ec] disabled:cursor-not-allowed active:scale-[0.98]"
                  onClick={openLogoutConfirm}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? <InlineSpinner /> : <Icon name="logout" size={17} />}
                  {isLoggingOut ? 'Logging out...' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    <ConfirmLogoutModal
      open={logoutOpen}
      user={user}
      busy={isLoggingOut}
      onClose={closeLogout}
      onConfirm={confirmLogout}
    />
    </>
  )
}

export default Topbar
