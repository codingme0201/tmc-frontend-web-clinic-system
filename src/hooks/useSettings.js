import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { settingsService } from '../services/settingsService'

export function useSettingsStore({ onLog } = {}, scope = 'settings') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => { onLogRef.current = onLog }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['settings', scope],
    queryFn: settingsService.fetchSettings,
  })

  const updateMutation = useMutation({
    mutationFn: settingsService.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      onLogRef.current?.('Updated system settings')
    },
  })

  return {
    data: data || null,
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    updateSettings: useCallback(async (p) => updateMutation.mutateAsync(p), [updateMutation]),
    isUpdating: updateMutation.isPending,
  }
}

export function useSettings(scope = 'settings') {
  const { log } = useAppContext()
  return useSettingsStore({ onLog: log }, scope)
}
