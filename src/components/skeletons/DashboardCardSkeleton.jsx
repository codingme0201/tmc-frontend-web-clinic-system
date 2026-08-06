import Skeleton from '../Skeleton'
import { PANEL } from '../../lib/ui'

/**
 * Skeleton for a dashboard statistic card — mirrors the StatCard/PANEL
 * layout (label line, big number, trend line) so widgets never render as
 * blank white boxes while their data loads.
 */
function DashboardCardSkeleton() {
  return (
    <article className={PANEL} aria-hidden="true">
      <Skeleton width="42%" height={13} />
      <Skeleton width={72} height={30} className="mt-[12px]" />
      <Skeleton width="58%" height={12} className="mt-[9px]" />
    </article>
  )
}

export default DashboardCardSkeleton
