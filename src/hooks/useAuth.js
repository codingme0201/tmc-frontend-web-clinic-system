import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * Public hook — returns the shared authentication state.
 *
 * Provides `isAuthenticated`, `user`, `userRole`, `authLoading`, and the
 * `login(email, password)` / `logout()` actions, all backed by the Laravel
 * REST API (Sanctum bearer token in localStorage).
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
