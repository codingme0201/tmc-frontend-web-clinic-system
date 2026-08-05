/* eslint-disable react-refresh/only-export-components */
// The context object, provider, and consumer hook intentionally live in one
// file as a single composition root. Fast Refresh falls back to a full
// reload when this file changes — an acceptable trade-off for the merge.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAppointmentsStore } from '../hooks/useAppointments'
import { usePatientsStore } from '../hooks/usePatients'
import { useConsultationsStore } from '../hooks/useConsultations'
import { useMedicalRecordsStore } from '../hooks/useMedicalRecords'
import { useStaffStore } from '../hooks/useStaff'
import { useActivityLogsStore } from '../hooks/useActivityLogs'
import { useClinicEventsStore } from '../hooks/useClinicEvents'
import { useClinicInsightsStore } from '../hooks/useClinicInsights'
import { authService } from '../services/authService'
import { clearAuthToken, getAuthToken, setAuthToken } from '../services/api'

export const AppContext = createContext(undefined)

/**
 * Composition root for app-wide state.
 *
 * - Auth + routing state backed by the Laravel REST API (Sanctum bearer
 *   token in localStorage, validated against GET /api/user on load).
 * - Each domain store hook (appointments, patients, etc.) is instantiated
 *   exactly once here and exposed through context, so every page consumes a
 *   single shared instance via the matching use* hook.
 *
 * The store hooks talk to the service layer only; pages never touch mock
 * data or services directly.
 */
export function AppProvider({ children }) {
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#/', '')
    return hash || 'dashboard'
  })
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAuthToken() !== null)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  // True while the persisted token is being validated against the API on
  // initial load, so the app can avoid flashing the login page.
  const [authLoading, setAuthLoading] = useState(() => getAuthToken() !== null)

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

  useEffect(() => {
    const handleHashChange = () => {
      if (authLoading) return
      const pageId = window.location.hash.replace('#/', '') || 'dashboard'
      if (pageId === 'login' && isAuthenticated) {
        window.location.hash = '#/dashboard'
      } else if (pageId !== 'login' && !isAuthenticated) {
        window.location.hash = '#/login'
      } else {
        setActivePage(pageId)
      }
    }
    window.addEventListener('hashchange', handleHashChange)

    // Sync initial route based on auth status
    if (!authLoading) {
      if (!isAuthenticated && window.location.hash !== '#/login') {
        window.location.hash = '#/login'
      } else if (isAuthenticated && (window.location.hash === '#/login' || !window.location.hash)) {
        window.location.hash = '#/dashboard'
      }
    }

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isAuthenticated, authLoading])

  // --- Domain stores (one instance, shared app-wide) -----------------------
  const activityLogs = useActivityLogsStore()
  // Plain callback — the store hooks keep it in a ref, so there is no stale
  // closure even though this is recreated on every render.
  const log = (action) => activityLogs.addActivityLog(action)

  const appointments = useAppointmentsStore({ onLog: log })
  const patients = usePatientsStore({ onLog: log })
  const consultations = useConsultationsStore({ onLog: log })
  const medicalRecords = useMedicalRecordsStore({ onLog: log })
  const staff = useStaffStore({ onLog: log })
  const clinicEvents = useClinicEventsStore({ onLog: log })
  const clinicInsights = useClinicInsightsStore()

  const login = useCallback(async (email, password) => {
    const { token, user: authenticatedUser } = await authService.login({ email, password })
    setAuthToken(token)
    setUser(authenticatedUser)
    setUserRole(authenticatedUser.role)
    setIsAuthenticated(true)
    window.location.hash = '#/dashboard'
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // The token may already be invalid on the server; local state must
      // still be cleared so protected pages are no longer reachable.
    } finally {
      clearAuthToken()
      setUser(null)
      setUserRole(null)
      setIsAuthenticated(false)
      window.location.hash = '#/login'
    }
  }, [])

  const value = useMemo(
    () => ({
      activePage,
      navigate: (pageId) => {
        window.location.hash = '#/' + pageId
        setActivePage(pageId)
      },
      isAuthenticated,
      user,
      userRole,
      authLoading,
      login,
      logout,
      appointments,
      patients,
      consultations,
      medicalRecords,
      staff,
      activityLogs,
      clinicEvents,
      clinicInsights,
    }),
    [
      activePage,
      isAuthenticated,
      user,
      userRole,
      authLoading,
      login,
      logout,
      appointments,
      patients,
      consultations,
      medicalRecords,
      staff,
      activityLogs,
      clinicEvents,
      clinicInsights,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
