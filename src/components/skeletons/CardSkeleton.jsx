import Skeleton from '../Skeleton'

/**
 * Skeleton for bar-style widgets — clinic activity bars, peak-hours rows.
 * Renders label + full-width bar rows so the chart area keeps its height
 * and rhythm while the data loads.
 *
 * @param {{ rows?: number }} props
 */
function CardSkeleton({ rows = 4 }) {
  return (
    <div className="grid gap-[14px]" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <Skeleton width={110 + (i % 2) * 50} height={12} />
          <Skeleton width="100%" height={10} className="mt-[7px] rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default CardSkeleton
