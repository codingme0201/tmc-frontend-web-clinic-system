import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { staffSchedulesService } from '../services/staffSchedulesService'

/**
 * Staff schedules store — backed by TanStack Query.
 *
 * - `useQuery(['staff-schedules'])` loads schedules from the Laravel API.
 * - Each mutation (create / update / delete / availability) calls the API,
 *   logs the action, and invalidates the list so the UI refreshes.
 */
export function useStaffSchedulesStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['staff-schedules', scope],
    queryFn: staffSchedulesService.fetchStaffSchedules,
  })

  const createMutation = useMutation({
    mutationFn: staffSchedulesService.createStaffSchedule,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] })
      onLogRef.current?.(`Created schedule for ${created.user?.name ?? 'staff'} on ${created.date}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => staffSchedulesService.updateStaffSchedule(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] })
      onLogRef.current?.(`Updated schedule for ${updated.user?.name ?? 'staff'} on ${updated.date}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: staffSchedulesService.deleteStaffSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] })
      onLogRef.current?.('Deleted staff schedule')
    },
  })

  const availabilityMutation = useMutation({
    mutationFn: ({ id, status }) => staffSchedulesService.updateStaffAvailability(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] })
      onLogRef.current?.(`Updated availability of ${updated.user?.name ?? 'staff'} to: ${updated.status}`)
    },
  })

  const createSchedule = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

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
