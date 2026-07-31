import { useCallback, useContext, useEffect, useRef } from 'react'
import { AppContext } from '../context/AppContext'
import { eventsService } from '../services/eventsService'
import { useResource } from './useResource'

/** Campus events store — instantiated once by AppProvider. */
export function useClinicEventsStore({ onLog } = {}) {
  const { data, setData, isLoading, error, refetch } = useResource(eventsService.fetchEvents)

  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const addEvent = useCallback(
    async (payload) => {
      const created = await eventsService.createEvent(payload)
      setData((prev) => [...(prev || []), created])
      onLogRef.current?.(`Scheduled new clinic event: ${created.title}`)
      return created
    },
    [setData],
  )

  return { data: data || [], isLoading, error, refetch, addEvent }
}

/** Public hook — returns the shared clinic events store. */
export function useClinicEvents() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useClinicEvents must be used within an AppProvider')
  return context.clinicEvents
}
