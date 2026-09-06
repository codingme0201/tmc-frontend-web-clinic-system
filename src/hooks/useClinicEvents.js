import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { eventsService } from '../services/eventsService'

// --- Legacy Dashboard hook (kept for backward compatibility) ---

/**
 * Campus events store — Dashboard widget only.
 * Scoped so module pages fetch fresh data independently.
 */
export function useClinicEventsStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['events', scope],
    queryFn: eventsService.fetchEvents,
  })

  const createMutation = useMutation({
    mutationFn: eventsService.createEvent,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      onLogRef.current?.(`Scheduled new clinic event: ${created.title}`)
    },
  })

  const addEvent = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    addEvent,
  }
}

/** Public hook — Dashboard calls this on mount. */
export function useClinicEvents(scope = 'page') {
  const { log } = useAppContext()
  return useClinicEventsStore({ onLog: log }, scope)
}

// --- Clinic Calendar hooks ---

/**
 * Aggregated calendar data store — fetches all calendar data for a date range.
 */
export function useCalendarStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  // Calendar data is fetched with variables, so we use a stable key
  // and let the page pass date range via refetch
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['calendar', scope],
    queryFn: () => eventsService.fetchCalendarData({}),
  })

  return {
    data: data || { events: [], appointments: [], schedules: [], blocked: [] },
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
  }
}

export function useCalendar(scope = 'page') {
  const { log } = useAppContext()
  return useCalendarStore({ onLog: log }, scope)
}

/**
 * Calendar events CRUD store — for managing clinic events.
 */
export function useCalendarEventsStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['calendar-events', scope],
    queryFn: eventsService.fetchCalendarEvents,
  })

  const createMutation = useMutation({
    mutationFn: eventsService.createCalendarEvent,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      onLogRef.current?.(`Created clinic event: ${created.title}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => eventsService.updateCalendarEvent(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      onLogRef.current?.(`Updated clinic event: ${updated.title}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: eventsService.deleteCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      onLogRef.current?.('Deleted clinic event')
    },
  })

  const createEvent = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  const updateEvent = useCallback(
    async (id, payload) => updateMutation.mutateAsync({ id, payload }),
    [updateMutation],
  )

  const deleteEvent = useCallback(
    async (id) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}

export function useCalendarEvents(scope = 'page') {
  const { log } = useAppContext()
  return useCalendarEventsStore({ onLog: log }, scope)
}

/**
 * Blocked schedules store — for managing unavailable periods.
 */
export function useBlockedSchedulesStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['blocked-schedules', scope],
    queryFn: eventsService.fetchBlockedSchedules,
  })

  const blockMutation = useMutation({
    mutationFn: eventsService.blockSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      onLogRef.current?.('Blocked unavailable schedule')
    },
  })

  const unblockMutation = useMutation({
    mutationFn: eventsService.unblockSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      onLogRef.current?.('Removed blocked schedule')
    },
  })

  const blockSchedule = useCallback(
    async (payload) => blockMutation.mutateAsync(payload),
    [blockMutation],
  )

  const unblockSchedule = useCallback(
    async (id) => unblockMutation.mutateAsync(id),
    [unblockMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    blockSchedule,
    unblockSchedule,
  }
}

export function useBlockedSchedules(scope = 'page') {
  const { log } = useAppContext()
  return useBlockedSchedulesStore({ onLog: log }, scope)
}
