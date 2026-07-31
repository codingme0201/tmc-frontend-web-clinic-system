import { useEffect, useState } from 'react'

/**
 * Returns a value that only updates `delay` ms after the latest change.
 *
 * Wrap search inputs with this so filtering/derived work doesn't run on every
 * keystroke — the returned value lags the input value by `delay`.
 *
 * @param {any} value Value to debounce (e.g. the raw search string).
 * @param {number} delay Debounce delay in milliseconds (default 300).
 * @returns {any} The debounced value.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
