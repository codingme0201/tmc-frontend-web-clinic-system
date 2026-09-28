import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { medicalRecordsService } from '../services/medicalRecordsService'

/**
 * Medical records store — instantiated once by AppProvider so every page
 * shares the same data. Backed by TanStack Query:
 *   - `useQuery(['medical-records'])` loads the registry from the API.
 *   - Each management mutation (conditions/allergies) calls the API and
 *     invalidates the list so the UI refreshes from the server.
 */
export function useMedicalRecordsStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  // Scoped query key (see useAppointments): the dashboard keeps its own view
  // so module pages fetch fresh on open and show their skeleton.
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['medical-records', scope],
    queryFn: medicalRecordsService.fetchMedicalRecords,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 3000),
  })

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['medical-records'] })
  }, [queryClient])

  const addConditionMutation = useMutation({
    mutationFn: ({ recordId, payload }) => medicalRecordsService.addCondition(recordId, payload),
    onSuccess: (updated, { payload }) => {
      refresh()
      onLogRef.current?.(`Added condition "${payload.name}" to ${updated.name}'s medical record`)
    },
  })

  const updateConditionMutation = useMutation({
    mutationFn: ({ recordId, conditionId, patch }) =>
      medicalRecordsService.updateCondition(recordId, conditionId, patch),
    onSuccess: (updated) => {
      refresh()
      onLogRef.current?.(`Updated condition on ${updated.name}'s medical record`)
    },
  })

  const removeConditionMutation = useMutation({
    mutationFn: ({ recordId, conditionId }) => medicalRecordsService.removeCondition(recordId, conditionId),
    onSuccess: (updated, { conditionName }) => {
      refresh()
      onLogRef.current?.(`Removed condition "${conditionName}" from ${updated.name}'s medical record`)
    },
  })

  const addAllergyMutation = useMutation({
    mutationFn: ({ recordId, payload }) => medicalRecordsService.addAllergy(recordId, payload),
    onSuccess: (updated, { payload }) => {
      refresh()
      onLogRef.current?.(`Recorded "${payload.allergen}" allergy on ${updated.name}'s medical record`)
    },
  })

  const updateAllergyMutation = useMutation({
    mutationFn: ({ recordId, allergyId, patch }) =>
      medicalRecordsService.updateAllergy(recordId, allergyId, patch),
    onSuccess: (updated) => {
      refresh()
      onLogRef.current?.(`Updated allergy information on ${updated.name}'s medical record`)
    },
  })

  const removeAllergyMutation = useMutation({
    mutationFn: ({ recordId, allergyId }) => medicalRecordsService.removeAllergy(recordId, allergyId),
    onSuccess: (updated, { allergen }) => {
      refresh()
      onLogRef.current?.(`Removed "${allergen}" allergy from ${updated.name}'s medical record`)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ recordId, status }) => medicalRecordsService.updateRecordStatus(recordId, status),
    onSuccess: (updated, { status }) => {
      refresh()
      onLogRef.current?.(
        status === 'Archived'
          ? `Archived medical record for ${updated.name}`
          : `Restored medical record for ${updated.name} to Active`,
      )
    },
  })

  const createRecordMutation = useMutation({
    mutationFn: medicalRecordsService.createRecord,
    onSuccess: (created) => {
      refresh()
      onLogRef.current?.(`Created medical record for ${created.name}`)
    },
  })

  const addMedicationMutation = useMutation({
    mutationFn: ({ recordId, payload }) => medicalRecordsService.addMedication(recordId, payload),
    onSuccess: (updated, { payload }) => {
      refresh()
      onLogRef.current?.(`Added medication "${payload.name}" to ${updated.name}'s medical record`)
    },
  })

  const updateMedicationMutation = useMutation({
    mutationFn: ({ recordId, medicationId, patch }) =>
      medicalRecordsService.updateMedication(recordId, medicationId, patch),
    onSuccess: (updated) => {
      refresh()
      onLogRef.current?.(`Updated medication on ${updated.name}'s medical record`)
    },
  })

  const removeMedicationMutation = useMutation({
    mutationFn: ({ recordId, medicationId }) => medicalRecordsService.removeMedication(recordId, medicationId),
    onSuccess: (updated, { medicationName }) => {
      refresh()
      onLogRef.current?.(`Removed medication "${medicationName}" from ${updated.name}'s medical record`)
    },
  })

  const addHistoryMutation = useMutation({
    mutationFn: ({ recordId, payload }) => medicalRecordsService.addHistory(recordId, payload),
    onSuccess: (updated, { payload }) => {
      refresh()
      onLogRef.current?.(`Added history entry "${payload.condition}" to ${updated.name}'s medical record`)
    },
  })

  const removeHistoryMutation = useMutation({
    mutationFn: ({ recordId, historyId }) => medicalRecordsService.removeHistory(recordId, historyId),
    onSuccess: (updated) => {
      refresh()
      onLogRef.current?.(`Removed a history entry from ${updated.name}'s medical record`)
    },
  })

  const createRecord = useCallback(
    async (payload) => createRecordMutation.mutateAsync(payload),
    [createRecordMutation],
  )

  const addMedication = useCallback(
    async (recordId, payload) => addMedicationMutation.mutateAsync({ recordId, payload }),
    [addMedicationMutation],
  )

  const updateMedication = useCallback(
    async (recordId, medicationId, patch) =>
      updateMedicationMutation.mutateAsync({ recordId, medicationId, patch }),
    [updateMedicationMutation],
  )

  const removeMedication = useCallback(
    async (recordId, medicationId, medicationName) =>
      removeMedicationMutation.mutateAsync({ recordId, medicationId, medicationName }),
    [removeMedicationMutation],
  )

  const addHistory = useCallback(
    async (recordId, payload) => addHistoryMutation.mutateAsync({ recordId, payload }),
    [addHistoryMutation],
  )

  const removeHistory = useCallback(
    async (recordId, historyId) => removeHistoryMutation.mutateAsync({ recordId, historyId }),
    [removeHistoryMutation],
  )

  const addCondition = useCallback(
    async (recordId, payload) => addConditionMutation.mutateAsync({ recordId, payload }),
    [addConditionMutation],
  )

  const updateCondition = useCallback(
    async (recordId, conditionId, patch) =>
      updateConditionMutation.mutateAsync({ recordId, conditionId, patch }),
    [updateConditionMutation],
  )

  const removeCondition = useCallback(
    async (recordId, conditionId, conditionName) =>
      removeConditionMutation.mutateAsync({ recordId, conditionId, conditionName }),
    [removeConditionMutation],
  )

  const addAllergy = useCallback(
    async (recordId, payload) => addAllergyMutation.mutateAsync({ recordId, payload }),
    [addAllergyMutation],
  )

  const updateAllergy = useCallback(
    async (recordId, allergyId, patch) =>
      updateAllergyMutation.mutateAsync({ recordId, allergyId, patch }),
    [updateAllergyMutation],
  )

  const removeAllergy = useCallback(
    async (recordId, allergyId, allergen) =>
      removeAllergyMutation.mutateAsync({ recordId, allergyId, allergen }),
    [removeAllergyMutation],
  )

  const updateRecordStatus = useCallback(
    async (recordId, status) => updateStatusMutation.mutateAsync({ recordId, status }),
    [updateStatusMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    updateRecordStatus,
    addCondition,
    updateCondition,
    removeCondition,
    addAllergy,
    updateAllergy,
    removeAllergy,
    createRecord,
    addMedication,
    updateMedication,
    removeMedication,
    addHistory,
    removeHistory,
  }
}

/** Public hook — pages call this on mount (page-scoped fetch + app-level audit log). */
export function useMedicalRecords(scope = 'page') {
  const { log } = useAppContext()
  return useMedicalRecordsStore({ onLog: log }, scope)
}
