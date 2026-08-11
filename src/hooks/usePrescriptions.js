import { useCallback, useEffect, useRef } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { prescriptionsService } from '../services/prescriptionsService'

/**
 * Prescriptions store — page-scoped, backed by TanStack Query (same pattern
 * as the other module stores).
 *
 * The list query is server-side searched/filtered/paginated: the query key
 * carries the full query object, so any change (debounced search, patient
 * filter, date filter, page) refetches the page from the Laravel API.
 * `keepPreviousData` keeps the current page on screen while the next one
 * loads, so only the very first load (no cached data) shows the skeleton.
 *
 * Each mutation (create / update) calls the API, logs the action, and
 * invalidates the shared `['prescriptions']` prefix so every scoped copy —
 * and the detail query — refreshes from the server.
 */
export function usePrescriptionsStore({ onLog } = {}, scope = 'page', query = {}) {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isFetching, isRefetching } = useQuery({
    queryKey: ['prescriptions', scope, query],
    queryFn: () => prescriptionsService.fetchPrescriptions(query),
    placeholderData: keepPreviousData,
  })

  const createMutation = useMutation({
    mutationFn: prescriptionsService.createPrescription,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      onLogRef.current?.(`Created prescription ${created.reference} for patient ${created.patient}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => prescriptionsService.updatePrescription(id, patch),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      onLogRef.current?.(`Updated prescription ${updated.reference} for patient ${updated.patient}`)
    },
  })

  const addPrescription = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  const updatePrescription = useCallback(
    async (id, patch) => updateMutation.mutateAsync({ id, patch }),
    [updateMutation],
  )

  return {
    data: data?.data ?? [],
    meta: data?.meta ?? null,
    total: data?.meta?.total ?? 0,
    isLoading,
    error: error?.message ?? null,
    refetch,
    isFetching,
    isRefetching,
    addPrescription,
    updatePrescription,
  }
}

/**
 * Public hook — pages call this on mount with their query params (search,
 * filters, page). Returns { data, meta, total, isLoading, error, refetch,
 * isFetching, isRefetching, addPrescription, updatePrescription }.
 */
export function usePrescriptions(scope = 'page', query = {}) {
  const { log } = useAppContext()
  return usePrescriptionsStore({ onLog: log }, scope, query)
}

/**
 * Prescription detail query — fetches a single record from the Laravel API
 * while the details modal is open (`enabled`), so the view refreshes with
 * fresh server data instead of only the row captured when it was opened.
 */
export function usePrescriptionDetail(id, enabled = false) {
  return useQuery({
    queryKey: ['prescriptions', 'detail', id],
    queryFn: () => prescriptionsService.fetchPrescription(id),
    enabled: Boolean(id && enabled),
  })
}
