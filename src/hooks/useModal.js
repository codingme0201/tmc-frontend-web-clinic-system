import { useCallback, useEffect } from 'react'
import { useToggle } from './useToggle'

/**
 * Modal open/close state.
 *
 * Wraps a boolean with explicit `open()` / `close()` actions plus an
 * optional Escape-to-close shortcut. Compose it with the actual modal
 * markup (the `.modal-backdrop` … `.modal-card` block) and wire `close`
 * to the backdrop click and the ✕ button. `onClose` runs after the modal
 * is hidden, which is handy for clearing transient modal data.
 *
 * @param {{ closeOnEscape?: boolean, onClose?: () => void }} [options]
 * @returns {{ isOpen: boolean, open: () => void, close: () => void }}
 */
export function useModal({ closeOnEscape = false, onClose } = {}) {
  const [isOpen, , open, close] = useToggle(false)

  const openModal = useCallback(() => {
    open()
  }, [open])

  const closeModal = useCallback(() => {
    close()
    onClose?.()
  }, [close, onClose])

  // Optional keyboard shortcut: Escape closes the modal. The listener is
  // only attached while enabled, so the page keeps full control over
  // stacking multiple modals (e.g. a confirmation layered on a workspace).
  useEffect(() => {
    if (!closeOnEscape) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeOnEscape, closeModal])

  return { isOpen, open: openModal, close: closeModal }
}
