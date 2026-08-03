import { useCallback, useState } from 'react'

/**
 * Boolean state helper with a toggle action and explicit setters.
 *
 * Returns a 4-tuple in the style of `useState`:
 * `[value, toggle, setTrue, setFalse]`.
 *
 * Use `toggle` for on/off switches (dropdowns, sidebar collapse, modal
 * flags). Reach for `setTrue` / `setFalse` when a value must be forced
 * rather than flipped (e.g. close on outside click or after navigation).
 *
 * @param {boolean} [initialValue=false] Initial boolean value.
 * @returns {[boolean, () => void, () => void, () => void]}
 *   `[value, toggle, setTrue, setFalse]`.
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(Boolean(initialValue))

  const toggle = useCallback(() => setValue((v) => !v), [])
  const setTrue = useCallback(() => setValue(true), [])
  const setFalse = useCallback(() => setValue(false), [])

  return [value, toggle, setTrue, setFalse]
}
