import { useMemo } from 'react'

// Builds the numbered page list, collapsing large ranges with an ellipsis.
function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const candidates = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  const pages = [...candidates].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const items = []
  let prev = 0
  for (const p of pages) {
    if (p - prev > 1) items.push('…')
    items.push(p)
    prev = p
  }
  return items
}

const BASE_PAGE_BTN =
  'cursor-pointer rounded-lg border border-[#d4e4e0] bg-white px-2.5 sm:px-3 py-1.5 text-[12px] sm:text-[12.5px] font-extrabold text-ink transition-all duration-150 hover:border-primary hover:bg-[#f0faf8] hover:text-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#d4e4e0] disabled:hover:bg-white disabled:hover:text-ink shadow-2xs'

// Current page gets its own full class list (no bg-white / text-ink / disabled
// overrides) so the teal active style can never lose a CSS-order tie against
// the base button's white background.
const ACTIVE_PAGE_BTN =
  'cursor-pointer rounded-lg border border-primary bg-primary px-2.5 sm:px-3 py-1.5 text-[12px] sm:text-[12.5px] font-extrabold text-white shadow-[0_4px_12px_rgba(20,120,109,0.35)] transition-all duration-150 hover:border-primary hover:bg-primary hover:text-white'

/**
 * Reusable pagination controls.
 *
 * @param {{
 *   currentPage: number,
 *   totalPages: number,
 *   onPageChange: (page: number) => void,
 *   pageSize?: number,
 *   onPageSizeChange?: (size: number) => void,
 *   pageSizeOptions?: number[],
 * }} props
 */
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [8, 10, 25, 50],
}) {
  const pages = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages])

  if (totalPages <= 1 && !onPageSizeChange) return null

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-strong/80 pt-3.5" aria-label="Pagination">
      <div className="flex items-center gap-3">
        <span className="text-[12px] sm:text-[12.5px] font-bold text-muted">
          Page <strong className="text-ink font-extrabold">{currentPage}</strong> of {totalPages}
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-[12px] text-muted font-bold">
            <span>Show:</span>
            <select
              className="rounded-lg border border-[#d4e4e0] bg-white px-2 py-1 text-[12px] font-bold text-ink shadow-2xs focus:border-primary focus:outline-none"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            className={BASE_PAGE_BTN}
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <div className="hidden sm:flex items-center gap-1">
            {pages.map((item, idx) =>
              item === '…' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={item}
                  className={item === currentPage ? ACTIVE_PAGE_BTN : BASE_PAGE_BTN}
                  aria-current={item === currentPage ? 'page' : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            className={BASE_PAGE_BTN}
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </nav>
  )
}

export default Pagination
