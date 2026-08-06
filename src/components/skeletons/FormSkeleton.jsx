import Skeleton from '../Skeleton'

/**
 * Skeleton for forms — renders label + input-field rows matching the app's
 * form field sizing. Use it instead of rendering an empty form while the
 * data that populates it (e.g. options for selects) is still loading.
 *
 * @param {{ fields?: number }} props
 */
function FormSkeleton({ fields = 4 }) {
  return (
    <div className="grid gap-[14px]" aria-hidden="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-[6px]">
          <Skeleton width={84} height={11} />
          <Skeleton width="100%" height={38} className="rounded-md" />
        </div>
      ))}
    </div>
  )
}

export default FormSkeleton
