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
    <div
      className="grid min-h-svh place-items-center"
      role="status"
      aria-label="Checking your session"
    >
      <span className="sr-only">Checking your session...</span>
      <div className="grid h-[min(680px,calc(100svh-48px))] w-[min(1100px,calc(100%-48px))] grid-cols-[260px_minmax(0,1fr)] overflow-hidden rounded-[14px] border border-line-strong bg-white shadow-[0_16px_34px_rgba(38,71,67,0.08)] max-[980px]:grid-cols-1">
        <div className="flex flex-col gap-[22px] bg-primary-dark p-[22px_18px] max-[980px]:hidden">
          <div className="flex items-center gap-3">
            <Skeleton width={44} height={44} dark className="rounded-lg" />
            <div className="grid gap-[7px]">
              <Skeleton width={132} height={13} dark />
              <Skeleton width={96} height={10} dark />
            </div>
          </div>

          <div className="grid gap-2">
            <Skeleton width={90} height={10} dark className="mb-1 mt-2 ml-[2px]" />
            <Skeleton width="100%" height={36} dark className="rounded-lg" />
            <Skeleton width="100%" height={36} dark className="rounded-lg" />
            <Skeleton width={60} height={10} dark className="mb-1 mt-2 ml-[2px]" />
            <Skeleton width="100%" height={36} dark className="rounded-lg" />
            <Skeleton width="100%" height={36} dark className="rounded-lg" />
            <Skeleton width="100%" height={36} dark className="rounded-lg" />
          </div>

          <Skeleton width="100%" height={40} dark className="mt-auto rounded-lg" />
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between gap-[18px] border-b border-[#dce8e5] p-[18px_28px]">
            <div className="grid gap-[6px]">
              <Skeleton width={110} height={10} />
              <Skeleton width={190} height={18} />
            </div>
            <Skeleton width={110} height={36} />
          </div>

          <div className="flex flex-1 flex-col gap-[18px] overflow-hidden p-[26px]">
            <Skeleton width={240} height={26} />

            <div className="grid grid-cols-4 gap-[14px] max-[980px]:grid-cols-2 max-[620px]:grid-cols-1">
              <Skeleton width="100%" height={96} className="rounded-lg" />
              <Skeleton width="100%" height={96} className="rounded-lg" />
              <Skeleton width="100%" height={96} className="rounded-lg" />
              <Skeleton width="100%" height={96} className="rounded-lg" />
            </div>

            <div className="grid grid-cols-[1.4fr_0.9fr] gap-[18px] max-[980px]:grid-cols-1">
              <Skeleton width="100%" height={250} className="rounded-lg" />
              <Skeleton width="100%" height={170} className="rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLoadingScreen
