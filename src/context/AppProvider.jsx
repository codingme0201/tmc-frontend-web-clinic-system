import { useEffect, useMemo, useState } from 'react'
import { AppContext } from './AppContext'
import { useAppointmentsStore } from '../hooks/useAppointments'
import { usePatientsStore } from '../hooks/usePatients'
import { useConsultationsStore } from '../hooks/useConsultations'
import { useStaffStore } from '../hooks/useStaff'
import { useActivityLogsStore } from '../hooks/useActivityLogs'
import { useClinicEventsStore } from '../hooks/useClinicEvents'
import { useClinicInsightsStore } from '../hooks/useClinicInsights'

/**
 * Composition root for app-wide state.
 *
 * - Auth + routing state (mock "session" backed by localStorage).
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('tmc_auth') === 'true'
  })
  // Mock session role (same localStorage pattern as the auth flag). The current
  // login is the Administrator; this is where a doctor/nurse login would set
  // 'doctor'/'nurse' so the authorization gate below stays meaningful.
  const [userRole, setUserRole] = useState(() => localStorage.getItem('tmc_user_role') || 'admin')

  useEffect(() => {
    const handleHashChange = () => {
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
    if (!isAuthenticated && window.location.hash !== '#/login') {
      window.location.hash = '#/login'
    } else if (isAuthenticated && (window.location.hash === '#/login' || !window.location.hash)) {
      window.location.hash = '#/dashboard'
    }

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isAuthenticated])

  // --- Domain stores (one instance, shared app-wide) -----------------------
  const activityLogs = useActivityLogsStore()
  // Plain callback — the store hooks keep it in a ref, so there is no stale
  // closure even though this is recreated on every render.
  const log = (action) => activityLogs.addActivityLog(action)

  const appointments = useAppointmentsStore({ onLog: log })
  const patients = usePatientsStore({ onLog: log })
  const consultations = useConsultationsStore({ onLog: log })
  const staff = useStaffStore({ onLog: log })
  const clinicEvents = useClinicEventsStore({ onLog: log })
  const clinicInsights = useClinicInsightsStore()

  const value = useMemo(
    () => ({
      activePage,
      navigate: (pageId) => {
        window.location.hash = '#/' + pageId
        setActivePage(pageId)
      },
      isAuthenticated,
      userRole,
      login: () => {
        localStorage.setItem('tmc_auth', 'true')
        localStorage.setItem('tmc_user_role', 'admin')
        setUserRole('admin')
        setIsAuthenticated(true)
        window.location.hash = '#/dashboard'
      },
      logout: () => {
        localStorage.removeItem('tmc_auth')
        localStorage.removeItem('tmc_user_role')
        setUserRole(null)
        setIsAuthenticated(false)
        window.location.hash = '#/login'
      },
      appointments,
      patients,
      consultations,
      staff,
      activityLogs,
      clinicEvents,
      clinicInsights,
    }),
    [
      activePage,
      isAuthenticated,
      userRole,
      appointments,
      patients,
      consultations,
      staff,
      activityLogs,
      clinicEvents,
      clinicInsights,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
