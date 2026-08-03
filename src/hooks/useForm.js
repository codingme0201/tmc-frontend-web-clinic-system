import { useCallback, useState } from 'react'

/**
 * Lightweight form state for the admin forms.
 *
 * Holds a single `values` object keyed by field name, exposes
 * `setValue` / `setValues` for updates, an optional `validate` function,
 * and a `reset` that also clears errors. The page keeps owning submit
 * logic, busy flags, and toasts — this hook only standardizes the
 * value/error plumbing that was previously repeated per form.
 *
 * @param {Object} [initialValues={}] Initial field values.
 * @param {{ validate?: (values: Object) => Object }} [options]
 *   `validate` receives the current values and returns an errors object
 *   keyed by field (empty object = valid).
 * @returns {{
 *   values: Object,
 *   setValues: (updater: Object | ((prev: Object) => Object)) => void,
 *   setValue: (name: string, value: any) => void,
 *   handleChange: (event: Event) => void,
 *   errors: Object,
 *   setErrors: (errors: Object) => void,
 *   runValidation: () => Object,
 *   reset: (nextValues?: Object) => void,
 * }}
 */
export function useForm(initialValues = {}, { validate } = {}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})

  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  // Convenience for `name`-attributed inputs; setValue covers the rest.
  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }, [])

  // Runs the optional validator against the current values, stores the
  // result, and returns it so callers can short-circuit a submit.
  const runValidation = useCallback(() => {
    if (!validate) return {}
    const nextErrors = validate(values) || {}
    setErrors(nextErrors)
    return nextErrors
  }, [validate, values])

  const reset = useCallback(
    (nextValues) => {
      setValues(nextValues === undefined ? initialValues : nextValues)
      setErrors({})
    },
    [initialValues],
  )

  return { values, setValues, setValue, handleChange, errors, setErrors, runValidation, reset }
}
