/**
 * Reusable skeleton loading block.
 *
 * Renders a shimmering placeholder in the app's design language. Compose
 * several instances to approximate the layout of content that is loading —
 * the AuthLoadingScreen uses it to mirror the admin shell while the session
 * is being checked.
 *
 * @param {{ width?: number|string, height?: number|string, className?: string, style?: Object }} props
 */
function Skeleton({ width, height, className = '', style }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  )
}

export default Skeleton
