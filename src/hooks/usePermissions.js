import { useQuery } from '@tanstack/react-query'
import { rolesService } from '../services/rolesService'

/**
 * Permission catalog for the Roles & Permissions page.
 *
 * Loads through TanStack Query (`['permissions']` key); consumers group the
 * flat list by `module` to build the assignment UI.
 */
export function usePermissions() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesService.fetchPermissions,
  })

  return { data, isLoading, error: error?.message ?? null, refetch }
}
