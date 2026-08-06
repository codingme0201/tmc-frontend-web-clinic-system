/**
 * Small inline spinner for action buttons (replaces the old `.spinner-sm`
 * CSS class). Inherits currentColor for the ring.
 */
function InlineSpinner() {
  return (
    <span
      className="mr-[7px] inline-block size-[14px] shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px] opacity-85"
      aria-hidden="true"
    />
  )
}

export default InlineSpinner
