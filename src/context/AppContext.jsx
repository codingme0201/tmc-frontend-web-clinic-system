import { createContext, useContext, useMemo, useState } from 'react'

const AppContext = createContext(undefined)

/**
 * Holds the app-wide UI state: which admin page is active, and whether
 * the mock "session" is authenticated (i.e. past the Login screen).
 */
export function AppProvider({ children }) {
  const [activePage, setActivePage] = useState('dashboard')
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  const value = useMemo(
    () => ({
      activePage,
      navigate: (pageId) => setActivePage(pageId),
      isAuthenticated,
      login: () => setIsAuthenticated(true),
      logout: () => setIsAuthenticated(false),
    }),
    [activePage, isAuthenticated],
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
