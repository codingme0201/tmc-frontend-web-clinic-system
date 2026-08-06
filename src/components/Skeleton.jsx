/**
 * Reusable skeleton loading block.
 *
 * Renders a shimmering placeholder in the app's design language. Compose
 * several instances to approximate the layout of content that is loading —
 * the AuthLoadingScreen uses it to mirror the admin shell while the session
 * is being checked.
 *
 * @param {{
 *   width?: number|string,
 *   height?: number|string,
 *   dark?: boolean,
 *   className?: string,
 *   style?: Object,
 * }} props
 */
function Skeleton({ width, height, dark = false, className = '', style }) {
  return (
    <span
      className={[
        'inline-block animate-shimmer rounded-md bg-[length:400%_100%] motion-reduce:animate-none',
        dark
          ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0.09)_25%,rgba(255,255,255,0.18)_37%,rgba(255,255,255,0.09)_63%)]'
          : 'bg-[linear-gradient(90deg,#e0ebe8_25%,#f1f7f5_37%,#e0ebe8_63%)]',
        className,
      ].join(' ')}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  )
}

export default Skeleton
