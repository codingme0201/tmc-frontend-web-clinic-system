import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { queueService } from '../services/queueService'

/**
 * Daily patient queue store (first in, first out).
 *   - `useQuery(['queue', scope, date])` loads the day's entries; it refreshes
 *     every 30 seconds so every screen sees arrivals and calls in near real time.
 *   - Check-in / undo / serve mutations refresh the queue, appointments and
 *     consultations together, since they are one workflow.
 */
export function useQueueStore({ onLog } = {}, scope = 'page', date = '') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['queue', scope, date],
    queryFn: () => queueService.fetchQueue(date),
    refetchInterval: 30000,
  })

  const invalidateLinked = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['queue'] })
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
    queryClient.invalidateQueries({ queryKey: ['consultations'] })
  }, [queryClient])

  const checkInMutation = useMutation({
    mutationFn: queueService.checkIn,
    onSuccess: (entry) => {
      invalidateLinked()
      onLogRef.current?.(`Checked in ${entry.patient} (${entry.reference}) — queue #${entry.queueNumber}`)
    },
  })

  const undoMutation = useMutation({
    mutationFn: queueService.undoCheckIn,
    onSuccess: (entry) => {
      invalidateLinked()
      onLogRef.current?.(`Undid check-in of ${entry.patient} (${entry.reference})`)
    },
  })

  const serveMutation = useMutation({
    mutationFn: queueService.serve,
    onSuccess: (consultation) => {
      invalidateLinked()
      onLogRef.current?.(`Called in ${consultation.patient} — started consultation ${consultation.reference}`)
    },
  })

  return {
    entries: data?.entries || [],
    meta: data?.meta || null,
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    checkIn: useCallback(async (id) => checkInMutation.mutateAsync(id), [checkInMutation]),
    undoCheckIn: useCallback(async (id) => undoMutation.mutateAsync(id), [undoMutation]),
    serve: useCallback(async (id) => serveMutation.mutateAsync(id), [serveMutation]),
  }
}

/** Public hook. Returns { entries, meta, isLoading, error, refetch, isRefetching, checkIn, undoCheckIn, serve }. */
export function useQueue(scope = 'page', date = '') {
  const { log } = useAppContext()
  return useQueueStore({ onLog: log }, scope, date)
}
