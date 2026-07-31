import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppContext } from './AppContext'
import { mockActivityLogs } from '../lib/mockData'
import { mockAppointments } from '../lib/mockAppointments'

/**
 * Provides app-wide UI state: active page, mock "session" auth status, the
 * shared appointment store, and the live activity/audit log. Keeping the
 * appointments here means the Dashboard queue and the Appointments module
 * always show the same, up-to-date data.
 */
export function AppProvider({ children }) {
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#/', '')
    return hash || 'dashboard'
  })
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('tmc_auth') === 'true'
  })
  const [appointments, setAppointments] = useState(mockAppointments)
  const [activityLogs, setActivityLogs] = useState(mockActivityLogs)

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

  const addActivityLog = useCallback((action) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setActivityLogs((prev) => [{ time, user: 'Admin User', action }, ...prev])
  }, [])

  const addAppointment = useCallback(
    ({ patient, type, reason = '', date, time, staff = '' }) => {
      // Derive the next reference from the highest existing number so
      // references never collide even if the store changes shape.
      const maxRef = appointments.reduce((max, app) => {
        const num = Number(app.reference.split('-').pop())
        return Number.isFinite(num) ? Math.max(max, num) : max
      }, 0)
      const reference = `APT-2026-${String(maxRef + 1).padStart(3, '0')}`
      const newAppointment = {
        id: Date.now(),
        reference,
        patient,
        patientId: '',
        type,
        reason: reason || type,
        date: date || new Date().toISOString().split('T')[0],
        time,
        staff: staff || 'Unassigned',
        status: 'Pending',
        notes: '',
        requestedOn: new Date().toISOString().split('T')[0],
      }
      setAppointments((prev) => [newAppointment, ...prev])
      addActivityLog(`Booked new ${type} appointment for ${patient} at ${time}`)
    },
    [appointments, addActivityLog],
  )

  const updateAppointmentStatus = useCallback(
    (id, newStatus, note = '') => {
      const target = appointments.find((app) => app.id === id)
      if (target) {
        addActivityLog(`Updated appointment ${target.reference} (${target.patient}) to: ${newStatus}`)
      }
      setAppointments((prev) =>
        prev.map((app) => {
          if (app.id !== id) return app
          const appended = note ? (app.notes ? `${app.notes}\n${note}` : note) : app.notes
          return { ...app, status: newStatus, notes: appended }
        }),
      )
    },
    [appointments, addActivityLog],
  )

  const rescheduleAppointment = useCallback(
    (id, { date, time, note = '' }) => {
      const target = appointments.find((app) => app.id === id)
      if (target) {
        addActivityLog(`Rescheduled appointment ${target.reference} (${target.patient}) to ${date} ${time}`)
      }
      setAppointments((prev) =>
        prev.map((app) => {
          if (app.id !== id) return app
          const rescheduleNote = `Rescheduled from ${app.date} ${app.time} to ${date} ${time}${note ? ` — ${note}` : ''}`
          const notes = app.notes ? `${app.notes}\n${rescheduleNote}` : rescheduleNote
          return { ...app, date, time, status: 'Rescheduled', notes }
        }),
      )
    },
    [appointments, addActivityLog],
  )

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
      appointments,
      activityLogs,
      addAppointment,
      updateAppointmentStatus,
      rescheduleAppointment,
      addActivityLog,
    }),
    [
      activePage,
      isAuthenticated,
      appointments,
      activityLogs,
      addAppointment,
      updateAppointmentStatus,
      rescheduleAppointment,
      addActivityLog,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
