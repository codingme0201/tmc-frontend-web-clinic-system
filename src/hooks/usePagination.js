import { useCallback, useMemo, useState } from 'react'

/**
 * Client-side pagination hook.
 *
 * Given the full (already-filtered) items, it exposes the current page, the
 * slice for that page, and navigation controls. Callers pass the *filtered*
 * list, so the flow is always: search/filter first, then paginate.
 *
 * Swapping to server-side/API pagination later only requires replacing the
 * `items` argument with a `totalItems` count and fetching each page from the
 * API — the returned shape and the Pagination UI stay identical.
 *
 * The returned page is clamped against the current page count, so a search
 * that shrinks the list never leaves the view on an out-of-range page. Callers
 * should call `resetPage()` when a search/filter value changes (see the
 * pages that use this hook for the pattern).
 *
 * @param {Array<any>} items Full list to paginate (filter BEFORE calling).
 * @param {{ pageSize?: number }} [options] Number of rows per page (default 8).
 * @returns {{
 *   currentPage: number,
 *   pageSize: number,
 *   totalItems: number,
 *   totalPages: number,
 *   pageItems: Array<any>,
 *   nextPage: () => void,
 *   previousPage: () => void,
 *   goToPage: (page: number) => void,
 *   resetPage: () => void,
 *   canGoNext: boolean,
 *   canGoPrev: boolean,
 * }}
 */
export function usePagination(items, { pageSize = 8 } = {}) {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const [page, setPage] = useState(1)

  // Derived clamp: if the filtered list shrinks, the view settles on the last
  // valid page until the caller's reset-on-filter effect returns to page 1.
  const currentPage = Math.min(page, totalPages)

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages))
  }, [totalPages])

  const previousPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1))
  }, [])

  const goToPage = useCallback(
    (target) => {
      setPage(Math.min(Math.max(1, target), totalPages))
    },
    [totalPages],
  )

  const resetPage = useCallback(() => setPage(1), [])

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    pageItems,
    nextPage,
    previousPage,
    goToPage,
    resetPage,
    canGoNext: currentPage < totalPages,
    canGoPrev: currentPage > 1,
  }
}
