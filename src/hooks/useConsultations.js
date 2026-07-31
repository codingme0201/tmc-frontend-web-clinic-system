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

  return { data: data || [], isLoading, error, refetch, addConsultation }
}

/** Public hook — returns the shared consultation store. */
export function useConsultations() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useConsultations must be used within an AppProvider')
  return context.consultations
}
