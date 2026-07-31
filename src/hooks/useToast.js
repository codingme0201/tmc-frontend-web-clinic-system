import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Lightweight toast state: `showToast(message, type)` displays a toast that
 * auto-dismisses. Returns `{ toast, showToast, dismiss }` where `toast` is
 * `{ id, message, type }` or `null`.
 */
export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  const showToast = useCallback(
    (message, type = 'success') => {
      setToast({ id: Date.now(), message, type })
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setToast(null), duration)
    },
    [duration],
  )

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { toast, showToast, dismiss }
}
