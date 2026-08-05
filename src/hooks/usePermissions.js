import { useResource } from './useResource'
import { rolesService } from '../services/rolesService'

/**
 * Permission catalog for the Roles & Permissions page.
 *
 * Reuses the generic `useResource` fetcher; consumers group the flat list
 * by `module` to build the assignment UI.
 */
export function usePermissions() {
  return useResource(rolesService.fetchPermissions)
}
