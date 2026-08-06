/* eslint-disable react-refresh/only-export-components */
// The context object, provider, and consumer hook intentionally live in one
// file as a single composition root. Fast Refresh falls back to a full
// reload when this file changes — an acceptable trade-off for the merge.
import { createContext, useContext, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppointmentsStore } from '../hooks/useAppointments'
import { usePatientsStore } from '../hooks/usePatients'
import { useConsultationsStore } from '../hooks/useConsultations'
import { useMedicalRecordsStore } from '../hooks/useMedicalRecords'
import { useStaffStore } from '../hooks/useStaff'
import { useActivityLogsStore } from '../hooks/useActivityLogs'
import { useClinicEventsStore } from '../hooks/useClinicEvents'
import { useClinicInsightsStore } from '../hooks/useClinicInsights'

export const AppContext = createContext(undefined)

/**
 * Composition root for app-wide page/navigation + domain state.
 *
 * - Routing now lives in react-router (see App.jsx): this provider derives
 *   `activePage` from the current location and exposes `navigate(pageId)`
 *   so components keep the same navigation API as before.
 * - Each domain store hook (appointments, patients, etc.) is instantiated
 *   exactly once here and exposed through context, so every page consumes a
 *   single shared instance via the matching use* hook.
 *
 * Must be rendered inside an AuthProvider and a Router (HashRouter).
 * The store hooks talk to the service layer only; pages never touch the
 * API or services directly.
 */
export function AppProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  // The active page is the current route segment ('' → 'dashboard').
  const activePage = location.pathname.replace(/^\//, '') || 'dashboard'

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
      navigate: (pageId) => navigate('/' + pageId),
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
      navigate,
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
