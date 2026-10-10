import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { clinicStaffService } from '../services/clinicStaffService'

/**
 * Medical staff directory store — doctors, nurses and front desk staff with
 * their credentials. Profile/verification mutations refresh the directory,
 * the open detail view and the clinician pickers (eligible staff).
 */
export function useClinicStaffStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-staff', scope],
    queryFn: clinicStaffService.fetchClinicStaff,
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clinic-staff'] })
    queryClient.invalidateQueries({ queryKey: ['clinic-staff-member'] })
    queryClient.invalidateQueries({ queryKey: ['eligible-staff'] })
  }, [queryClient])

  const updateMineMutation = useMutation({
    mutationFn: clinicStaffService.updateMyStaffProfile,
    onSuccess: (member) => {
      invalidate()
      onLogRef.current?.(`Updated own professional profile (${member.credentials.status})`)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, notes }) => clinicStaffService.verifyCredentials(id, { status, notes }),
    onSuccess: (member) => {
      invalidate()
      onLogRef.current?.(`Marked credentials of ${member.name} as ${member.credentials.status}`)
    },
  })

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    updateMyProfile: useCallback(async (payload) => updateMineMutation.mutateAsync(payload), [updateMineMutation]),
    verifyCredentials: useCallback(
      async (id, status, notes = '') => verifyMutation.mutateAsync({ id, status, notes }),
      [verifyMutation],
    ),
  }
}

export function useClinicStaff(scope = 'page') {
  const { log } = useAppContext()
  return useClinicStaffStore({ onLog: log }, scope)
}

/** Detail view of one staff member (schedule + assigned patients). */
export function useClinicStaffMember(id) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clinic-staff-member', id],
    queryFn: () => clinicStaffService.fetchClinicStaffMember(id),
    enabled: !!id,
  })
  return { data: data || null, isLoading, error: error?.message ?? null, refetch }
}
