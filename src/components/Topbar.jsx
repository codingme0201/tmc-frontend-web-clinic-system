import { useEffect, useRef } from 'react'
import Icon from './Icon'
import InlineSpinner from './Spinner'
import ConfirmLogoutModal from './ConfirmLogoutModal'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useToggle } from '../hooks/useToggle'

function Topbar({ onToggleSidebar }) {
  const { logout, isLoggingOut, user } = useAuth()
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
      <header className="sticky top-0 z-[5] flex min-h-[82px] items-center justify-between gap-[18px] border-b border-[#dce8e5] bg-white/85 px-[28px] py-[18px] backdrop-blur-[14px] max-[620px]:items-start max-[620px]:px-4 max-[620px]:py-4">
      <div className="flex min-w-0 items-center gap-[14px]">
        <button
          type="button"
          className="grid size-10 shrink-0 cursor-pointer place-items-center gap-1 rounded-lg bg-bg"
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
        >
          <span className="h-[2px] w-[18px] rounded-[2px] bg-[#16484b]" />
          <span className="h-[2px] w-[18px] rounded-[2px] bg-[#16484b]" />
          <span className="h-[2px] w-[18px] rounded-[2px] bg-[#16484b]" />
        </button>
        <div>
          <p className="mb-1 text-[12px] font-extrabold uppercase tracking-normal text-muted-soft">
            Trinidad Municipal College
          </p>
          <h1 className="text-[22px] text-ink max-[980px]:text-lg max-[620px]:text-lg">
            TMC CareLink Admin
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-[10px]">
        <div className="flex items-center gap-[6px] text-[12px] font-bold text-muted-soft max-[620px]:hidden">
          <span className="size-2 rounded-full bg-success" />
          Online
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="grid size-[42px] cursor-pointer place-items-center rounded-lg bg-bg text-[#16484b] max-[620px]:hidden"
        >
          <Icon name="bell" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0"
            onClick={toggleDropdown}
            aria-label="Account menu"
          >
            <div
              className="grid size-[42px] place-items-center rounded-full bg-accent text-[13px] font-extrabold text-[#fffaf3]"
              aria-hidden="true"
            >
              <span>AD</span>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[210px] overflow-hidden rounded-[10px] border border-line-strong bg-white shadow-[0_16px_34px_rgba(38,71,67,0.16)]">
              <div className="border-b border-[#eef4f2] px-4 py-[14px]">
                <p className="m-0 text-[14px] font-extrabold text-ink">Admin User</p>
                <span className="text-[12px] font-bold text-accent">Administrator</span>
              </div>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-3 text-left font-bold text-danger hover:bg-[#fdf1ec] disabled:cursor-not-allowed"
                onClick={openLogoutConfirm}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? <InlineSpinner /> : <Icon name="logout" />}
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
