import { useBackendHealth } from '../hooks/useBackendHealth'

/**
 * Clear "backend offline" strip, rendered only when the health probe fails
 * (e.g. `php artisan serve` is not running). Replaces the confusing
 * `Request failed (502)` / network-error experience with an actionable
 * message and a retry button. Renders nothing when the backend is reachable.
 */
function BackendStatusBanner() {
  const { status, check } = useBackendHealth()

  if (status !== 'offline') return null

  return (
    <div
      className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#f0c9bc] bg-[#fdf1ec] px-[26px] py-[10px] max-[620px]:px-4"
      role="alert"
    >
      <span className="text-[13px] font-bold text-[#a33c12]">
        ⚠ Cannot reach the backend server — data may not load. Start it with{' '}
        <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[12px] text-[#7a2b10]">
          php artisan serve
        </code>{' '}
        then retry.
      </span>
      <button
        type="button"
        onClick={check}
        disabled={status === 'checking'}
        className="cursor-pointer rounded-md border border-[#e4a78f] bg-white px-3 py-1.5 text-[12.5px] font-extrabold text-[#a33c12] transition-colors duration-150 hover:bg-[#fbe3d8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'checking' ? 'Checking...' : 'Retry connection'}
      </button>
    </div>
  )
}

export default BackendStatusBanner
