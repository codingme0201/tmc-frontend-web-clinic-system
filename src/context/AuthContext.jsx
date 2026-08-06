/* eslint-disable react-refresh/only-export-components */
// Dedicated authentication context (Phase 1 — Laravel REST API + Sanctum).
// The context object and provider live here; the public `useAuth` consumer
// hook lives in hooks/useAuth.js following the project's hook convention.
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { clearAuthToken, getAuthToken, setAuthToken } from '../services/api'

export const AuthContext = createContext(undefined)

/**
 * Authentication state provider.
 *
 * Owns everything auth-related:
 *  - `isAuthenticated` / `user` / `userRole` (from the Laravel API)
 *  - `authLoading` while a persisted token is validated on load
 *  - `login(email, password)` / `logout()` backed by the REST API
 *
 * The bearer token is persisted in localStorage and attached to API requests
 * by the shared request helper. Domain/pages state stays in AppContext.
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAuthToken() !== null)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  // True while the persisted token is being validated against the API on
  // initial load, so the app can avoid flashing the login page.
  const [authLoading, setAuthLoading] = useState(() => getAuthToken() !== null)
  // True while the logout API call is in flight; exposed so logout controls
  // can show a spinner and block duplicate submissions.
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  // Refs guard against concurrent calls regardless of render timing.
  const logoutInFlightRef = useRef(false)

  // Validate any persisted token against the backend on mount. When there is
  // no token, `authLoading` already initializes to false, so nothing to do.
  useEffect(() => {
    if (getAuthToken() === null) return

    let active = true
    ;(async () => {
      try {
        const { user: currentUser } = await authService.fetchCurrentUser()
        if (!active) return
        setUser(currentUser)
        setUserRole(currentUser.role)
        setIsAuthenticated(true)
      } catch (err) {
        // Only an explicit 401 means the token is invalid (expired/revoked).
        // Network or server hiccups keep the token so a page refresh can
        // re-validate it later instead of silently destroying the session.
        if (!active) return
        if (err?.status === 401) clearAuthToken()
        setUser(null)
        setUserRole(null)
        setIsAuthenticated(false)
      } finally {
        if (active) setAuthLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { token, user: authenticatedUser } = await authService.login({ email, password })
    setAuthToken(token)
    setUser(authenticatedUser)
    setUserRole(authenticatedUser.role)
    setIsAuthenticated(true)
    // Move the user onto the dashboard — sign-in always lands on the home
    // page rather than a stale protected route. The authenticated user is
    // returned so callers (e.g. the login page) can greet them.
    navigate('/dashboard')
    return authenticatedUser
  }, [navigate])

  // Frontend convenience for UI gating (hiding buttons/menu items). The
  // Laravel backend remains the actual security boundary.
  const can = useCallback((permission) => user?.permissions?.includes(permission) ?? false, [user])

  const logout = useCallback(async () => {
    // Prevent duplicate logout requests (e.g. double-click on the button).
    if (logoutInFlightRef.current) return
    logoutInFlightRef.current = true
    setIsLoggingOut(true)
    try {
      await authService.logout()
    } catch {
      // The token may already be invalid on the server; local state must
      // still be cleared so protected pages are no longer reachable.
    } finally {
      logoutInFlightRef.current = false
      setIsLoggingOut(false)
      clearAuthToken()
      setUser(null)
      setUserRole(null)
      setIsAuthenticated(false)
      navigate('/login')
    }
  }, [navigate])

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      userRole,
      authLoading,
      isLoggingOut,
      can,
      login,
      logout,
    }),
    [isAuthenticated, user, userRole, authLoading, isLoggingOut, can, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
