import Skeleton from '../Skeleton'
import { TABLE } from '../../lib/ui'

/**
 * Skeleton data table — drop-in replacement for a real `<table className={TABLE}>`
 * while rows are loading. Mirrors the table chrome (header band + row padding)
 * so the layout doesn't jump when real data arrives.
 *
 * @param {{ columns?: number, rows?: number, colWidths?: number[], header?: boolean }} props
 */
function TableSkeleton({ columns = 6, rows = 6, colWidths, header = true }) {
  const widths =
    colWidths ??
    Array.from({ length: columns }, (_, i) => (i === 0 ? 88 : 96 + (i % 3) * 24))

  return (
    <table className={TABLE} aria-hidden="true">
      {header && (
        <thead>
          <tr>
            {widths.slice(0, columns).map((w, i) => (
              <th key={i}>
                <Skeleton width={64} height={12} />
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            {widths.slice(0, columns).map((w, c) => (
              <td key={c}>
                <Skeleton width={c === 0 ? 88 : w} height={14} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default TableSkeleton
