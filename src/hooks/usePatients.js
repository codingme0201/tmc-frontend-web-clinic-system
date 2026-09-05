import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { patientsService } from '../services/patientsService'

export function usePatientsStore({ onLog } = {}) {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsService.fetchPatients(),
  })

  const createMutation = useMutation({
    mutationFn: patientsService.createPatient,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      onLogRef.current?.(`Created new patient profile for ${created.name} (${created.type})`)
    },
  })

  const addPatient = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    addPatient,
  }
}

export function usePatients() {
  const { log } = useAppContext()
  return usePatientsStore({ onLog: log })
}

export function usePatientProfile(id) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientsService.fetchPatient(id),
    enabled: !!id,
  })
}

export function usePatientMedicalInfo(id) {
  return useQuery({
    queryKey: ['patient-medical', id],
    queryFn: () => patientsService.fetchPatientMedicalInfo(id),
    enabled: !!id,
  })
}

export function usePatientRecordHistory(id) {
  return useQuery({
    queryKey: ['patient-history', id],
    queryFn: () => patientsService.fetchPatientRecordHistory(id),
    enabled: !!id,
  })
}

export function useUpdatePatientStatus() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, status }) => patientsService.updatePatientStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })

  return useCallback(
    async (id, status) => mutation.mutateAsync({ id, status }),
    [mutation],
  )
}
