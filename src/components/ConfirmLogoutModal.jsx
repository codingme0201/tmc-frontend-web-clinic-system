import { createPortal } from 'react-dom'
import InlineSpinner from './Spinner'

/**
 * Modal confirmation for signing out — replaces the old `window.confirm`
 * alert. Rendered by the Topbar and Sidebar logout controls; shows the
 * signed-in user, blocks closing while the logout request is in flight,
 * and only proceeds when the user explicitly confirms.
 *
 * @param {{
 *   open: boolean,
 *   user?: Object|null,
 *   busy?: boolean,
 *   onClose: () => void,
 *   onConfirm: () => void,
 * }} props
 */
function ConfirmLogoutModal({ open, user = null, busy = false, onClose, onConfirm }) {
  if (!open) return null

  // Rendered through a portal to document.body so the fixed overlay always
  // covers the viewport. Without it, the sidebar's collapse `transform`
  // creates a containing block that traps the fixed overlay inside the
  // sidebar instead of the screen.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm sign out"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div className="w-[min(420px,100%)] animate-modal-scale overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]">
        <div className="flex items-center justify-between border-b border-line p-[16px_20px]">
          <h3 className="m-0 text-[18px] text-ink">Sign Out</h3>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5">
          <p className="mt-0 text-[14px] leading-relaxed text-ink">
            {user ? (
              <>
                Sign out of <strong>{user.name}</strong>? You will be returned to the login page.
              </>
            ) : (
              'Sign out of the Admin Panel? You will be returned to the login page.'
            )}
          </p>
        </div>
        <div className="flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-full border-0 bg-bg px-[14px] py-2 text-[13px] font-extrabold text-primary transition-all duration-200 hover:bg-[#dbeae5] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-accent px-[14px] text-[13px] font-extrabold text-white transition-all duration-200 hover:bg-[#b6451e] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy && <InlineSpinner />}
              {busy ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmLogoutModal
