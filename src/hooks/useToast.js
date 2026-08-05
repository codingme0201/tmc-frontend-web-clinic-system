import { useCallback } from 'react'
import { toast as sonner } from 'sonner'

/**
 * Toast adapter over sonner.
 *
 * Pages keep calling `showToast(message, type)` — the app-level `<Toaster />`
 * (App.jsx) renders the notifications. Sonner's API is used directly:
 * success/error/info/warning map onto the matching toast variants.
 */
export function useToast() {
  const showToast = useCallback((message, type = 'success') => {
    if (type === 'error') sonner.error(message)
    else if (type === 'warning') sonner.warning(message)
    else if (type === 'info') sonner.info(message)
    else sonner.success(message)
  }, [])

  return { showToast }
}
