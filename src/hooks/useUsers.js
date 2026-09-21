import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersService } from '../services/usersService'

/**
 * User management store — backed by TanStack Query.
 *
 * - `useQuery(['users'])` loads the list from the Laravel API.
 * - Each mutation (create / update / status / role / password) calls the
 *   API, invalidates the list so the UI refreshes from the server.
 */
export function useUsersStore() {
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.fetchUsers,
  })

  const invalidateUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }, [queryClient])

  const createMutation = useMutation({
    mutationFn: usersService.createUser,
    onSuccess: invalidateUsers,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => usersService.updateUser(id, payload),
    onSuccess: invalidateUsers,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => usersService.updateUserStatus(id, status),
    onSuccess: invalidateUsers,
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, roleId }) => usersService.updateUserRole(id, roleId),
    onSuccess: invalidateUsers,
  })

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }) => usersService.resetPassword(id, password),
  })

  const createUser = useCallback(
    async (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )

  const updateUser = useCallback(
    async (id, payload) => updateMutation.mutateAsync({ id, payload }),
    [updateMutation],
  )

  const updateUserStatus = useCallback(
    async (id, status) => statusMutation.mutateAsync({ id, status }),
    [statusMutation],
  )

  const updateUserRole = useCallback(
    async (id, roleId) => roleMutation.mutateAsync({ id, roleId }),
    [roleMutation],
  )

  const resetUserPassword = useCallback(
    async (id, password) => passwordMutation.mutateAsync({ id, password }),
    [passwordMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    isRefetching,
    createUser,
    updateUser,
    updateUserStatus,
    updateUserRole,
    resetUserPassword,
  }
}
