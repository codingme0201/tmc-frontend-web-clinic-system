import { useCallback, useContext, useEffect, useRef } from 'react'
import { AppContext } from '../context/AppContext'
import { medicalRecordsService } from '../services/medicalRecordsService'
import { useResource } from './useResource'

/** Medical records store — instantiated once by AppProvider. */
export function useMedicalRecordsStore({ onLog } = {}) {
  const { data, setData, isLoading, error, refetch } = useResource(medicalRecordsService.fetchMedicalRecords)

  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  // Replaces a record in the store with the updated copy returned by the service.
  const applyRecord = useCallback(
    (updated) => {
      setData((prev) => (prev || []).map((r) => (r.id === updated.id ? updated : r)))
    },
    [setData],
  )

  const addCondition = useCallback(
    async (recordId, payload) => {
      const updated = await medicalRecordsService.addCondition(recordId, payload)
      applyRecord(updated)
      onLogRef.current?.(`Added condition "${payload.name}" to ${updated.name}'s medical record`)
      return updated
    },
    [applyRecord],
  )

  const updateCondition = useCallback(
    async (recordId, conditionId, patch) => {
      const updated = await medicalRecordsService.updateCondition(recordId, conditionId, patch)
      applyRecord(updated)
      onLogRef.current?.(`Updated condition on ${updated.name}'s medical record`)
      return updated
    },
    [applyRecord],
  )

  const removeCondition = useCallback(
    async (recordId, conditionId, conditionName) => {
      const updated = await medicalRecordsService.removeCondition(recordId, conditionId)
      applyRecord(updated)
      onLogRef.current?.(`Removed condition "${conditionName}" from ${updated.name}'s medical record`)
      return updated
    },
    [applyRecord],
  )

  const addAllergy = useCallback(
    async (recordId, payload) => {
      const updated = await medicalRecordsService.addAllergy(recordId, payload)
      applyRecord(updated)
      onLogRef.current?.(`Recorded "${payload.allergen}" allergy on ${updated.name}'s medical record`)
      return updated
    },
    [applyRecord],
  )

  const updateAllergy = useCallback(
    async (recordId, allergyId, patch) => {
      const updated = await medicalRecordsService.updateAllergy(recordId, allergyId, patch)
      applyRecord(updated)
      onLogRef.current?.(`Updated allergy information on ${updated.name}'s medical record`)
      return updated
    },
    [applyRecord],
  )

  const removeAllergy = useCallback(
    async (recordId, allergyId, allergen) => {
      const updated = await medicalRecordsService.removeAllergy(recordId, allergyId)
      applyRecord(updated)
      onLogRef.current?.(`Removed "${allergen}" allergy from ${updated.name}'s medical record`)
      return updated
    },
    [applyRecord],
  )

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
    addCondition,
    updateCondition,
    removeCondition,
    addAllergy,
    updateAllergy,
    removeAllergy,
  }
}

/** Public hook — returns the shared medical records store. */
export function useMedicalRecords() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useMedicalRecords must be used within an AppProvider')
  return context.medicalRecords
}
