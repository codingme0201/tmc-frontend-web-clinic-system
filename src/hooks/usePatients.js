import { useCallback, useContext, useEffect, useRef } from 'react'
import { AppContext } from '../context/AppContext'
import { patientsService } from '../services/patientsService'
import { useResource } from './useResource'

/** Patient registry store — instantiated once by AppProvider. */
export function usePatientsStore({ onLog } = {}) {
  const { data, setData, isLoading, error, refetch } = useResource(patientsService.fetchPatients)

  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const addPatient = useCallback(
    async (payload) => {
      const created = await patientsService.createPatient(payload)
      setData((prev) => [...(prev || []), created])
      onLogRef.current?.(`Created new patient profile for ${created.name} (${created.type})`)
      return created
    },
    [setData],
  )

  return { data: data || [], isLoading, error, refetch, addPatient }
}

/** Public hook — returns the shared patient store. */
export function usePatients() {
  const context = useContext(AppContext)
  if (!context) throw new Error('usePatients must be used within an AppProvider')
  return context.patients
}
