import { request } from './api'

export async function fetchNotifications({ page = 1, type = 'All', unread = false } = {}) {
  const params = new URLSearchParams()
  params.set('page', page)
  if (type && type !== 'All') params.set('type', type)
  if (unread) params.set('unread', '1')
  const data = await request(`/notifications?${params.toString()}`)
  return data
}

export async function fetchUnreadCount() {
  const data = await request('/notifications/unread-count')
  return data.count
}

export async function fetchNotification(id) {
  const data = await request(`/notifications/${id}`)
  return data.data
}

export async function sendNotification({ userId, title, message, type = 'system', category = '', source = '' }) {
  const { data } = await request('/notifications', {
    method: 'POST',
    body: {
      user_id: userId,
      title,
      message,
      type,
      category: category || undefined,
      source: source || undefined,
    },
  })
  return data
}

export async function markAsRead(id) {
  const { data } = await request(`/notifications/${id}/read`, { method: 'PATCH' })
  return data
}

export async function markAllAsRead() {
  const data = await request('/notifications/read-all', { method: 'PATCH' })
  return data
}

export async function deleteNotification(id) {
  const data = await request(`/notifications/${id}`, { method: 'DELETE' })
  return data
}

export const notificationsService = {
  fetchNotifications,
  fetchUnreadCount,
  fetchNotification,
  sendNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
}
