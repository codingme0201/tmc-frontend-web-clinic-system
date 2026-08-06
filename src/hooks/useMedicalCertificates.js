import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { medicalCertificatesService } from '../services/medicalCertificatesService'

/**
 * Medical certificates store — page-scoped like the other module stores.
 * Backed by TanStack Query:
 *   - `useQuery(['medical-certificates', scope])` loads the list from the
 *     Laravel API when the page opens (skeleton first, then data).
 *   - Each mutation (generate / update / void / delete) calls the API, logs
 *     the action, and invalidates the shared prefix so every scoped copy
 *     (page + future dashboard view) refreshes.
 */
export function useMedicalCertificatesStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['medical-certificates', scope],
    queryFn: medicalCertificatesService.fetchMedicalCertificates,
  })

  const createMutation = useMutation({
    mutationFn: medicalCertificatesService.createMedicalCertificate,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['medical-certificates'] })
      onLogRef.current?.(`Generated medical certificate ${created.reference} for patient ${created.patient}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => medicalCertificatesService.updateMedicalCertificate(id, patch),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['medical-certificates'] })
      onLogRef.current?.(
        `Updated medical certificate ${updated.reference} for patient ${updated.patient} (status: ${updated.status})`,
      )
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id) => medicalCertificatesService.approveMedicalCertificate(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['medical-certificates'] })
      onLogRef.current?.(
        `Approved medical certificate request ${updated.reference} for patient ${updated.patient}`,
      )
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => medicalCertificatesService.rejectMedicalCertificate(id, reason),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['medical-certificates'] })
      onLogRef.current?.(
        `Rejected medical certificate request ${updated.reference} for patient ${updated.patient}`,
      )
    },
  })

  const issueMutation = useMutation({
    mutationFn: ({ id, payload }) => medicalCertificatesService.issueMedicalCertificate(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['medical-certificates'] })
      onLogRef.current?.(
        `Issued medical certificate ${updated.reference} for patient ${updated.patient}`,
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: medicalCertificatesService.deleteMedicalCertificate,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['medical-certificates'] })
      onLogRef.current?.(`Deleted medical certificate #${id}`)
    },
  })

  const addCertificate = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  const updateCertificate = useCallback(
    async (id, patch) => updateMutation.mutateAsync({ id, patch }),
    [updateMutation],
  )

  const approveCertificate = useCallback(
    async (id) => approveMutation.mutateAsync(id),
    [approveMutation],
  )

  const rejectCertificate = useCallback(
    async (id, reason = '') => rejectMutation.mutateAsync({ id, reason }),
    [rejectMutation],
  )

  const issueCertificate = useCallback(
    async (id, payload = {}) => issueMutation.mutateAsync({ id, payload }),
    [issueMutation],
  )

  const removeCertificate = useCallback(
    async (id) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    addCertificate,
    updateCertificate,
    approveCertificate,
    rejectCertificate,
    issueCertificate,
    removeCertificate,
  }
}

/**
 * Public hook — pages call this on mount (page-scoped fetch + app-level
 * audit log). Returns { data, isLoading, error, refetch, isRefetching,
 * addCertificate, updateCertificate, approveCertificate, rejectCertificate,
 * issueCertificate, removeCertificate }.
 */
export function useMedicalCertificates(scope = 'page') {
  const { log } = useAppContext()
  return useMedicalCertificatesStore({ onLog: log }, scope)
}
