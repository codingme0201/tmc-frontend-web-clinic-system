import { useCallback, useContext, useEffect, useRef } from 'react'
import { AppContext } from '../context/AppContext'
import { staffService } from '../services/staffService'
import { useResource } from './useResource'

/** Medical staff store — instantiated once by AppProvider. */
export function useStaffStore({ onLog } = {}) {
  const { data, setData, isLoading, error, refetch } = useResource(staffService.fetchStaff)

  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const updateStaffStatus = useCallback(
    async (name, newStatus) => {
      const updated = await staffService.updateStaffStatus(name, newStatus)
      setData((prev) => (prev || []).map((m) => (m.name === name ? updated : m)))
      onLogRef.current?.(`Updated status of ${name} to: ${newStatus}`)
      return updated
    },
    [setData],
  )

  return { data: data || [], isLoading, error, refetch, updateStaffStatus }
}

/** Public hook — returns the shared staff store. */
export function useStaff() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useStaff must be used within an AppProvider')
  return context.staff
}
