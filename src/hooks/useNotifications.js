import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { notificationsService } from '../services/notificationsService'

export function useNotificationsStore({ onLog } = {}, scope = 'page') {
  const queryClient = useQueryClient()
  const onLogRef = useRef(onLog)
  useEffect(() => {
    onLogRef.current = onLog
  }, [onLog])

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', scope],
    queryFn: () => notificationsService.fetchNotifications({ page: 1 }),
  })

  const { data: unreadCount = 0, isLoading: unreadLoading } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: notificationsService.fetchUnreadCount,
  })

  const sendMutation = useMutation({
    mutationFn: notificationsService.sendNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      onLogRef.current?.('Sent a notification')
    },
  })

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      onLogRef.current?.('Marked all notifications as read')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: notificationsService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      onLogRef.current?.('Deleted a notification')
    },
  })

  const sendNotification = useCallback(
    async (payload) => sendMutation.mutateAsync(payload),
    [sendMutation],
  )

  const markAsRead = useCallback(
    async (id) => markReadMutation.mutateAsync(id),
    [markReadMutation],
  )

  const markAllAsRead = useCallback(
    async () => markAllReadMutation.mutateAsync(),
    [markAllReadMutation],
  )

  const deleteNotification = useCallback(
    async (id) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  )

  return {
    data: data?.data || [],
    meta: data?.meta || null,
    unreadCount,
    unreadLoading,
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    sendNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendBusy: sendMutation.isPending,
    markReadBusy: markReadMutation.isPending,
    markAllReadBusy: markAllReadMutation.isPending,
    deleteBusy: deleteMutation.isPending,
  }
}

export function useNotifications(scope = 'page') {
  const { log } = useAppContext()
  return useNotificationsStore({ onLog: log }, scope)
}
