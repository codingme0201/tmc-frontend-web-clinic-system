import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rolesService } from '../services/rolesService'

/**
 * Roles store for the Roles & Permissions page.
 *
 * Backed by TanStack Query: the list loads via `useQuery(['roles'])` and
 * every CRUD/permission mutation invalidates that key so the list refreshes
 * from the Laravel API after each change.
 */
export function useRoles() {
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesService.fetchRoles,
  })

  const invalidateRoles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['roles'] })
  }, [queryClient])

  const createMutation = useMutation({
    mutationFn: rolesService.createRole,
    onSuccess: invalidateRoles,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => rolesService.updateRole(id, payload),
    onSuccess: invalidateRoles,
  })

  const deleteMutation = useMutation({
    mutationFn: rolesService.deleteRole,
    onSuccess: invalidateRoles,
  })

  const assignMutation = useMutation({
    mutationFn: ({ id, permissionIds }) => rolesService.updateRolePermissions(id, permissionIds),
    onSuccess: invalidateRoles,
  })

  const createRole = useCallback(async (payload) => createMutation.mutateAsync(payload), [createMutation])

  const updateRole = useCallback(
    async (id, payload) => updateMutation.mutateAsync({ id, payload }),
    [updateMutation],
  )

  const removeRole = useCallback(async (id) => deleteMutation.mutateAsync(id), [deleteMutation])

  const assignPermissions = useCallback(
    async (id, permissionIds) => assignMutation.mutateAsync({ id, permissionIds }),
    [assignMutation],
  )

  return {
    data: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    createRole,
    updateRole,
    removeRole,
    assignPermissions,
  }
}
