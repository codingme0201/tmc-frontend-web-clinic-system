import { useCallback, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { activityLogsService } from '../services/activityLogsService'
import { useResource } from './useResource'

/** Activity/audit log store — instantiated once by AppProvider. */
export function useActivityLogsStore() {
  const { data, setData, isLoading, error, refetch } = useResource(activityLogsService.fetchActivityLogs)

  const addActivityLog = useCallback(
    async (action) => {
      const entry = await activityLogsService.addActivityLog(action)
      setData((prev) => [entry, ...(prev || [])])
      return entry
    },
    [setData],
  )

  return { data: data || [], isLoading, error, refetch, addActivityLog }
}

/** Public hook — returns the shared activity log store. */
export function useActivityLogs() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useActivityLogs must be used within an AppProvider')
  return context.activityLogs
}
