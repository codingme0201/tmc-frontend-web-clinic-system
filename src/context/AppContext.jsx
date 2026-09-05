/* eslint-disable react-refresh/only-export-components */
// The context object, provider, and consumer hook intentionally live in one
// file as a single composition root. Fast Refresh falls back to a full
// reload when this file changes — an acceptable trade-off for the merge.
import { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useActivityLogsStore } from '../hooks/useActivityLogs'

export const AppContext = createContext(undefined)

/**
 * Composition root for app-wide page/navigation state.
 *
 * - Routing lives in react-router (see App.jsx): this provider derives
 *   `activePage` from the current location and exposes `navigate(pageId)`.
 * - The global audit logger (`log`) lives here — every page's store
 *   mutations route their activity through it. Data stores themselves are
 *   **page-scoped**: each page fetches its own data when it mounts, so a
 *   page shows its skeletons on first load exactly like the Roles &
 *   Permissions page, while TanStack Query's shared cache (same query keys)
 *   keeps revisits instant with a background refetch.
 *
 * Must be rendered inside an AuthProvider and a Router (HashRouter).
 */
export function AppProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  // The active page is the current route segment ('' → 'dashboard').
  const activePage = location.pathname.replace(/^\//, '') || 'dashboard'

  // Global audit trail (small, app-wide) — also the target of `log`, which
  // every page store calls after a successful mutation.
  const activityLogs = useActivityLogsStore()
  const log = useCallback(
    (action) => activityLogs.addActivityLog(action).catch(() => {}),
    [activityLogs],
  )

  const value = useMemo(
    () => ({
      activePage,
      navigate: (pageId) => navigate('/' + pageId),
      activityLogs,
      log,
    }),
    [activePage, navigate, activityLogs, log],
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
