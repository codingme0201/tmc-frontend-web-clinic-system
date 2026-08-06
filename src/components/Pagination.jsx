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
  'cursor-pointer rounded-md border border-[#d4e4e0] bg-white px-[10px] py-[6px] text-[12.5px] font-extrabold text-ink transition-all duration-200 hover:border-primary hover:bg-[#f0faf8] hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-[#d4e4e0] disabled:hover:bg-white disabled:hover:text-ink'

/**
 * Reusable pagination controls. Renders nothing when there is only one page,
 * so it can be dropped under any table/list without extra conditionals.
 *
 * @param {{
 *   currentPage: number,
 *   totalPages: number,
 *   onPageChange: (page: number) => void,
 * }} props
 */
function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages])

  if (totalPages <= 1) return null

  return (
    <nav className="mt-[14px] flex flex-wrap items-center justify-between gap-3 border-t border-line pt-[14px]" aria-label="Pagination">
      <span className="text-[12.5px] font-bold text-muted">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex flex-wrap items-center gap-[6px]">
        <button
          type="button"
          className={BASE_PAGE_BTN}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          ← Prev
        </button>
        {pages.map((item, idx) =>
          item === '…' ? (
            <span key={`ellipsis-${idx}`} className="px-[2px] text-muted" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              className={`${BASE_PAGE_BTN} ${item === currentPage ? 'border-primary bg-primary text-white disabled:hover:border-primary disabled:hover:bg-primary disabled:hover:text-white' : ''}`}
              disabled={item === currentPage}
              aria-current={item === currentPage ? 'page' : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}
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
    </nav>
  )
}

export default Pagination
