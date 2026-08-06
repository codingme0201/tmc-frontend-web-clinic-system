/**
 * Subtle inline indicator shown while TanStack Query performs a background
 * refetch (`isRefetching` with data already on screen). Existing content
 * stays visible — this just signals fresh data is on the way, so pages
 * never flash full skeletons on a background refresh.
 *
 * @param {{ refreshing?: boolean }} props
 */
function RefreshingBadge({ refreshing = false }) {
  if (!refreshing) return null
  return (
    <span className="inline-flex items-center gap-[6px] text-[11px] font-extrabold text-muted" role="status">
      <span
        className="size-[10px] animate-spin rounded-full border-[2px] border-[#cfe0db] border-t-primary"
        aria-hidden="true"
      />
      Refreshing…
    </span>
  )
}

export default RefreshingBadge
