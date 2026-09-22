import { useEffect, useMemo, useState } from 'react'
import { useSearch } from './useSearch'
import { usePagination } from './usePagination'

/**
 * Medical Records list state — debounced search, status filter, and pagination.
 *
 * Everything that decides "which records are visible" lives in this single
 * hook so the page stays declarative and the logic can move to a server
 * without rewriting the UI:
 *
 *   Today:  records (fetched via API) → debounce → filter → paginate
 *   Future: GET /medical-records?q=&status=&page=&limit=
 *           → { data, total, totalPages }
 *
 * The derived `queryParams` object already matches the future API request
 * contract ({ q, status, page, limit }) and `total`/`totalPages` mirror the
 * expected response metadata. To go live, replace the in-memory
 * `filtered`/`pageItems` derivations with a service call that takes
 * `queryParams` and returns `{ data, total, totalPages }` — the UI below
 * (list rows + <Pagination>) stays unchanged.
 */
export function useMedicalRecordList(records, { pageSize = 8, debounceDelay = 300 } = {}) {
  // Debounced query — the same value would be sent to the API as `?q=`.
  const { search, setSearch, debouncedSearch, resetSearch } = useSearch({ debounceMs: debounceDelay })
  const [statusFilter, setStatusFilter] = useState('All')
  const [patientFilter, setPatientFilter] = useState('All')

  // Search + filter pipeline (runs against the debounced query only).
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return records.filter((r) => {
      const matchStatus = statusFilter === 'All' || r.status === statusFilter
      const matchPatient =
        patientFilter === 'All' ||
        r.patientId === patientFilter ||
        String(r.id) === String(patientFilter) ||
        r.name.toLowerCase() === patientFilter.toLowerCase()
      const matchQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.patientId.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.conditions.some((c) => c.name.toLowerCase().includes(q)) ||
        r.allergies.some((a) => a.allergen.toLowerCase().includes(q))
      return matchStatus && matchPatient && matchQuery
    })
  }, [records, debouncedSearch, statusFilter, patientFilter])

  // Client-side pagination over the filtered list. For server-side pagination,
  // swap this for a fetch driven by queryParams.page/limit and keep the same
  // returned shape (currentPage/totalPages/pageItems) for the Pagination UI.
  const pagination = usePagination(filtered, { pageSize })
  const { pageItems, resetPage, currentPage, totalPages, goToPage } = pagination

  // Any search/filter change starts back at page 1 (mirrors an API refetch).
  useEffect(() => {
    resetPage()
  }, [debouncedSearch, statusFilter, patientFilter, resetPage])

  // Request + response parameters ready for the future REST API.
  const queryParams = useMemo(
    () => ({
      q: debouncedSearch.trim(),
      status: statusFilter === 'All' ? '' : statusFilter,
      patient: patientFilter === 'All' ? '' : patientFilter,
      page: currentPage,
      limit: pageSize,
      total: filtered.length,
      totalPages,
    }),
    [debouncedSearch, statusFilter, patientFilter, currentPage, pageSize, filtered.length, totalPages],
  )

  const clearFilters = () => {
    resetSearch()
    setStatusFilter('All')
    setPatientFilter('All')
  }

  return {
    search,
    setSearch,
    debouncedSearch,
    statusFilter,
    setStatusFilter,
    patientFilter,
    setPatientFilter,
    filtered,
    pageItems,
    currentPage,
    totalPages,
    goToPage,
    queryParams,
    clearFilters,
  }
}
