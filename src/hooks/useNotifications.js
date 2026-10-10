import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { notificationsService } from '../services/notificationsService'

export function useNotificationsStore({ onLog, canSend = false } = {}, scope = 'page') {
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

  const recipientsQuery = useQuery({
    queryKey: ['notification-recipients'],
    queryFn: notificationsService.fetchRecipients,
    enabled: canSend,
  })

  const sentQuery = useQuery({
    queryKey: ['notifications', 'sent'],
    queryFn: notificationsService.fetchSentNotifications,
    enabled: canSend,
  })

  const sendMutation = useMutation({
    mutationFn: notificationsService.sendNotification,
    onSuccess: (sent) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      onLogRef.current?.(`Sent notification "${sent?.title}" to ${sent?.recipient?.name || 'a user'}`)
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
    recipients: recipientsQuery.data || [],
    recipientsLoading: recipientsQuery.isLoading,
    recipientsError: recipientsQuery.error?.message ?? null,
    sent: sentQuery.data || [],
    sentLoading: sentQuery.isLoading,
    sentError: sentQuery.error?.message ?? null,
    refetchSent: sentQuery.refetch,
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

export function useNotifications(scope = 'page', { canSend = false } = {}) {
  const { log } = useAppContext()
  return useNotificationsStore({ onLog: log, canSend }, scope)
}
