import { useCallback } from 'react'
import { useResource } from './useResource'
import { rolesService } from '../services/rolesService'

/**
 * Roles store for the Roles & Permissions page.
 *
 * Built on the generic `useResource` fetcher (no duplicate data-fetching
 * logic). Mutations call the Laravel API and update local state so the list
 * reflects server data without a full refetch.
 */
export function useRoles() {
  const { data, setData, isLoading, error, refetch } = useResource(rolesService.fetchRoles)

  const upsert = useCallback(
    (saved) => {
      setData((prev) => {
        const list = prev || []
        const exists = list.some((role) => role.id === saved.id)
        return exists ? list.map((role) => (role.id === saved.id ? saved : role)) : [...list, saved]
      })
    },
    [setData],
  )

  const createRole = useCallback(
    async (payload) => {
      const role = await rolesService.createRole(payload)
      upsert(role)
      return role
    },
    [upsert],
  )

  const updateRole = useCallback(
    async (id, payload) => {
      const role = await rolesService.updateRole(id, payload)
      upsert(role)
      return role
    },
    [upsert],
  )

  const removeRole = useCallback(
    async (id) => {
      await rolesService.deleteRole(id)
      setData((prev) => (prev || []).filter((role) => role.id !== id))
    },
    [setData],
  )

  const assignPermissions = useCallback(
    async (id, permissionIds) => {
      const role = await rolesService.updateRolePermissions(id, permissionIds)
      upsert(role)
      return role
    },
    [upsert],
  )

  return { data: data || [], isLoading, error, refetch, createRole, updateRole, removeRole, assignPermissions }
}
