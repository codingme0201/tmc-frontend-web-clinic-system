import Skeleton from '../Skeleton'

/**
 * Skeleton for detail views — avatar circle + header lines + a grid of
 * label/value info cards. Drop it in while a record's detail data is
 * loading so the page never flashes an empty shell.
 *
 * @param {{ infoFields?: number }} props
 */
function DetailSkeleton({ infoFields = 8 }) {
  return (
    <div className="grid gap-[14px]" aria-hidden="true">
      <div className="flex items-center gap-4 rounded-lg border border-line bg-white p-5">
        <Skeleton width={56} height={56} className="shrink-0 rounded-full" />
        <div className="grid gap-[8px]">
          <Skeleton width={180} height={18} />
          <Skeleton width={260} height={12} />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {Array.from({ length: infoFields }, (_, i) => (
          <div key={i} className="grid gap-[6px]">
            <Skeleton width={72} height={10} />
            <Skeleton width={120 + (i % 3) * 40} height={13} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default DetailSkeleton
