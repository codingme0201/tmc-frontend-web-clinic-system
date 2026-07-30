import { createContext, useContext, useMemo, useState, useEffect } from 'react'

const AppContext = createContext(undefined)

/**
 * Holds the app-wide UI state: which admin page is active, and whether
 * the mock "session" is authenticated (i.e. past the Login screen).
 */
export function AppProvider({ children }) {
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#/', '')
    return hash || 'dashboard'
  })
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('tmc_auth') === 'true'
  })

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

  const value = useMemo(
    () => ({
      activePage,
      navigate: (pageId) => {
        window.location.hash = '#/' + pageId
        setActivePage(pageId)
      },
      isAuthenticated,
      login: () => {
        localStorage.setItem('tmc_auth', 'true')
        setIsAuthenticated(true)
        window.location.hash = '#/dashboard'
      },
      logout: () => {
        localStorage.removeItem('tmc_auth')
        setIsAuthenticated(false)
        window.location.hash = '#/login'
      },
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
