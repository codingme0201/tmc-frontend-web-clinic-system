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
    removeCertificate,
  }
}

/**
 * Public hook — pages call this on mount (page-scoped fetch + app-level
 * audit log). Returns { data, isLoading, error, refetch, isRefetching,
 * addCertificate, updateCertificate, removeCertificate }.
 */
export function useMedicalCertificates(scope = 'page') {
  const { log } = useAppContext()
  return useMedicalCertificatesStore({ onLog: log }, scope)
}
