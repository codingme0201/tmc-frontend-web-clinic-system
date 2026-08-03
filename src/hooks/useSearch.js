import { useCallback, useState } from 'react'
import { useDebounce } from './useDebounce'

/**
 * Debounced search state.
 *
 * Owns the raw search string and exposes its debounced twin, so callers
 * run filtering/derived work only after the user pauses typing. Replaces
 * the repeated `useState('')` + `useDebounce(search, 300)` pairing with a
 * single call. `resetSearch()` clears the query (e.g. from a
 * "Clear filters" button).
 *
 * The debounced value is the exact string that should be sent to an API
 * later as `?q=` — pages keep filtering on `debouncedSearch` and reset
 * pagination when it changes, exactly as they do today.
 *
 * @param {{ debounceMs?: number, initialValue?: string }} [options]
 * @returns {{
 *   search: string,
 *   setSearch: (value: string) => void,
 *   debouncedSearch: string,
 *   resetSearch: () => void,
 * }}
 */
export function useSearch({ debounceMs = 300, initialValue = '' } = {}) {
  const [search, setSearch] = useState(initialValue)
  const debouncedSearch = useDebounce(search, debounceMs)
  const resetSearch = useCallback(() => setSearch(initialValue), [initialValue])

  return { search, setSearch, debouncedSearch, resetSearch }
}
