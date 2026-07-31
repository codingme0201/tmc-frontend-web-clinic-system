import { useCallback, useContext, useEffect, useRef } from 'react'
import { AppContext } from '../context/AppContext'
import { consultationsService } from '../services/consultationsService'
import { useResource } from './useResource'

/** Consultation records store — instantiated once by AppProvider. */
export function useConsultationsStore({ onLog } = {}) {
  const { data, setData, isLoading, error, refetch } = useResource(consultationsService.fetchConsultations)

  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const addConsultation = useCallback(
    async (payload) => {
      const created = await consultationsService.createConsultation(payload)
      setData((prev) => [created, ...(prev || [])])
      onLogRef.current?.(`Logged clinical consultation for patient ${created.patient} - Diagnosis: ${created.diagnosis}`)
      return created
    },
    [setData],
  )

  const startConsultation = useCallback(
    async (id) => {
      const updated = await consultationsService.startConsultation(id)
      setData((prev) => (prev || []).map((c) => (c.id === id ? updated : c)))
      onLogRef.current?.(`Started consultation ${updated.reference} for patient ${updated.patient}`)
      return updated
    },
    [setData],
  )

  const saveConsultation = useCallback(
    async (id, patch) => {
      const updated = await consultationsService.updateConsultation(id, patch)
      setData((prev) => (prev || []).map((c) => (c.id === id ? updated : c)))
      return updated
    },
    [setData],
  )

  const completeConsultation = useCallback(
    async (id, finalData) => {
      const updated = await consultationsService.completeConsultation(id, finalData)
      setData((prev) => (prev || []).map((c) => (c.id === id ? updated : c)))
      onLogRef.current?.(
        `Completed consultation ${updated.reference} for patient ${updated.patient} - Diagnosis: ${updated.diagnosis}`,
      )
      return updated
    },
    [setData],
  )

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
    addConsultation,
    startConsultation,
    saveConsultation,
    completeConsultation,
  }
}

/** Public hook — returns the shared consultation store. */
export function useConsultations() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useConsultations must be used within an AppProvider')
  return context.consultations
}
