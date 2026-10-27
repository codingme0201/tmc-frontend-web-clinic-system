import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useAppContext } from '../context/AppContext'
import { staffSchedulesService } from '../services/staffSchedulesService'

/**
 * Staff schedules store — backed by TanStack Query.
 *
 * - The directory query loads one row per scheduled staff member.
 * - Detail queries load that staff member's shifts and patients for a school week.
 * - Each mutation (create / update / delete / availability) calls the API,
 *   logs the action, and invalidates the list so the UI refreshes.
 */
export function useStaffSchedulesStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const invalidateSchedules = useCallback(() => {
    for (const key of ['staff-schedules', 'weekly-staff-schedules', 'appointment-calendar', 'staff', 'clinic-staff', 'clinic-staff-member', 'eligible-staff']) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
  }, [queryClient])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['staff-schedules', 'directory', scope, user?.id],
    enabled: Boolean(user?.id),
    queryFn: staffSchedulesService.fetchScheduledStaff,
    refetchInterval: 15_000,
  })

  const createMutation = useMutation({
    mutationFn: staffSchedulesService.createStaffSchedule,
    onSuccess: (created) => {
      invalidateSchedules()
      onLogRef.current?.(`Created schedule for ${created.user?.name ?? 'staff'} on ${created.date}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => staffSchedulesService.updateStaffSchedule(id, payload),
    onSuccess: (updated) => {
      invalidateSchedules()
      onLogRef.current?.(`Updated schedule for ${updated.user?.name ?? 'staff'} on ${updated.date}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: staffSchedulesService.deleteStaffSchedule,
    onSuccess: () => {
      invalidateSchedules()
      onLogRef.current?.('Deleted staff schedule')
    },
  })

  const availabilityMutation = useMutation({
    mutationFn: ({ id, status }) => staffSchedulesService.updateStaffAvailability(id, status),
    onSuccess: (updated) => {
      invalidateSchedules()
      onLogRef.current?.(`Updated availability of ${updated.user?.name ?? 'staff'} to: ${updated.status}`)
    },
  })

  const createSchedule = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  const weeklyMutation = useMutation({
    mutationFn: staffSchedulesService.saveWeeklyStaffSchedule,
    onSuccess: () => {
      invalidateSchedules()
      onLogRef.current?.('Updated regular weekly staff schedule')
    },
  })
  const saveWeeklySchedule = useCallback((payload) => weeklyMutation.mutateAsync(payload), [weeklyMutation])

  const updateSchedule = useCallback(
    async (id, payload) => updateMutation.mutateAsync({ id, payload }),
    [updateMutation],
  )

  const deleteSchedule = useCallback(
    async (id) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  )

  const updateAvailability = useCallback(
    async (id, status) => availabilityMutation.mutateAsync({ id, status }),
    [availabilityMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    createSchedule,
    saveWeeklySchedule,
    updateSchedule,
    deleteSchedule,
    updateAvailability,
  }
}

/**
 * Public hook — pages call this on mount.
 * Returns { data, isLoading, error, refetch, isRefetching, createSchedule,
 *   updateSchedule, deleteSchedule, updateAvailability }.
 */
export function useStaffSchedules(scope = 'page') {
  const { log } = useAppContext()
  return useStaffSchedulesStore({ onLog: log }, scope)
}

export function useStaffScheduleDetails(staffId, date) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['staff-schedules', 'details', user?.id, staffId, date],
    queryFn: () => staffSchedulesService.fetchStaffScheduleDetails(staffId, date),
    enabled: Boolean(user?.id && staffId),
    refetchOnMount: 'always',
  })
}

/**
 * Eligible staff store — fetches doctors and nurses for schedule assignment.
 */
export function useEligibleStaffStore() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['eligible-staff'],
    queryFn: staffSchedulesService.fetchEligibleStaff,
  })

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
  }
}

export function useEligibleStaff() {
  return useEligibleStaffStore()
}
