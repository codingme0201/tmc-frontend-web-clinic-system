/* eslint-disable react-refresh/only-export-components */
// The context object, provider, and consumer hook intentionally live in one
// file as a single composition root. Fast Refresh falls back to a full
// reload when this file changes — an acceptable trade-off for the merge.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAppointmentsStore } from '../hooks/useAppointments'
import { usePatientsStore } from '../hooks/usePatients'
import { useConsultationsStore } from '../hooks/useConsultations'
import { useMedicalRecordsStore } from '../hooks/useMedicalRecords'
import { useStaffStore } from '../hooks/useStaff'
import { useActivityLogsStore } from '../hooks/useActivityLogs'
import { useClinicEventsStore } from '../hooks/useClinicEvents'
import { useClinicInsightsStore } from '../hooks/useClinicInsights'
import { useAuth } from '../hooks/useAuth'

export const AppContext = createContext(undefined)

/**
 * Composition root for app-wide page/navigation + domain state.
 *
 * - Auth (isAuthenticated, user, login, logout, …) lives in AuthContext; the
 *   hash-based route guarding below only *reads* it via useAuth().
 * - Each domain store hook (appointments, patients, etc.) is instantiated
 *   exactly once here and exposed through context, so every page consumes a
 *   single shared instance via the matching use* hook.
 *
 * Must be rendered inside an AuthProvider.
 *
 * The store hooks talk to the service layer only; pages never touch mock
 * data or services directly.
 */
export function AppProvider({ children }) {
  const { isAuthenticated, authLoading } = useAuth()

  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#/', '')
    return hash || 'dashboard'
  })

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

  const value = useMemo(
    () => ({
      activePage,
      navigate: (pageId) => {
        window.location.hash = '#/' + pageId
        setActivePage(pageId)
      },
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
