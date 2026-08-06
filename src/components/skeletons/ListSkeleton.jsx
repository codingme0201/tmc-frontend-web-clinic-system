import Skeleton from '../Skeleton'

/**
 * Skeleton for card-style list widgets — pending queues, staff rows, events,
 * audit logs. Each row mirrors the app's list card (border, padding, optional
 * avatar circle, title + meta lines) so the widget keeps its shape while
 * loading.
 *
 * @param {{ rows?: number, avatar?: boolean, meta?: boolean }} props
 */
function ListSkeleton({ rows = 3, avatar = false, meta = true }) {
  return (
    <div className="grid gap-[10px]" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-white p-3">
          {avatar && <Skeleton width={42} height={42} className="shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1">
            <Skeleton width={130 + (i % 2) * 70} height={13} />
            {meta && <Skeleton width={200} height={12} className="mt-[8px]" />}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ListSkeleton
