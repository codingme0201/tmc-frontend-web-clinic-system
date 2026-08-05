import Skeleton from './Skeleton'

/**
 * App-shell skeleton shown while the persisted Sanctum session is being
 * validated against GET /api/user.
 *
 * Mirrors the authenticated admin shell (sidebar, topbar, content panels) so
 * the transition into the real layout causes no jarring shift and protected
 * content is never flashed. Disappears automatically when auth resolves.
 */
function AuthLoadingScreen() {
  return (
    <div className="auth-loading-screen" role="status" aria-label="Checking your session">
      <span className="sr-only">Checking your session...</span>
      <div className="auth-skeleton-shell">
        <div className="auth-skeleton-sidebar">
          <div className="auth-skeleton-brand">
            <Skeleton width={44} height={44} className="skeleton-mark" />
            <div className="auth-skeleton-brand-text">
              <Skeleton width={132} height={13} />
              <Skeleton width={96} height={10} />
            </div>
          </div>

          <div className="auth-skeleton-nav">
            <Skeleton width={90} height={10} className="skeleton-nav-label" />
            <Skeleton width="100%" height={36} className="skeleton-nav-item" />
            <Skeleton width="100%" height={36} className="skeleton-nav-item" />
            <Skeleton width={60} height={10} className="skeleton-nav-label" />
            <Skeleton width="100%" height={36} className="skeleton-nav-item" />
            <Skeleton width="100%" height={36} className="skeleton-nav-item" />
            <Skeleton width="100%" height={36} className="skeleton-nav-item" />
          </div>

          <Skeleton width="100%" height={40} className="skeleton-logout" />
        </div>

        <div className="auth-skeleton-main">
          <div className="auth-skeleton-topbar">
            <div>
              <Skeleton width={110} height={10} />
              <Skeleton width={190} height={18} className="skeleton-title" />
            </div>
            <Skeleton width={110} height={36} />
          </div>

          <div className="auth-skeleton-content">
            <Skeleton width={240} height={26} className="skeleton-heading" />

            <div className="auth-skeleton-stats">
              <Skeleton width="100%" height={96} className="skeleton-card" />
              <Skeleton width="100%" height={96} className="skeleton-card" />
              <Skeleton width="100%" height={96} className="skeleton-card" />
              <Skeleton width="100%" height={96} className="skeleton-card" />
            </div>

            <div className="auth-skeleton-panels">
              <Skeleton width="100%" height={250} className="skeleton-card" />
              <Skeleton width="100%" height={170} className="skeleton-card" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLoadingScreen
