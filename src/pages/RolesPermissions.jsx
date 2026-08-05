import { useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRoles } from '../hooks/useRoles'
import { usePermissions } from '../hooks/usePermissions'
import { useForm } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import { rolesService } from '../services/rolesService'
import Skeleton from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'

/** Capitalizes a role slug for display (admin → Admin, front-desk → Front desk). */
function roleLabel(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function RolesPermissions({ page }) {
  const { can } = useAuth()
  const roles = useRoles()
  const permissions = usePermissions()
  const { showToast } = useToast()

  // Permission catalog grouped by module for the assignment UI.
  const permissionGroups = useMemo(() => {
    const groups = {}
    for (const perm of permissions.data || []) {
      ;(groups[perm.module] ||= []).push(perm)
    }
    return groups
  }, [permissions.data])

  // Generic in-flight guard (same pattern as the other modules).
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)

  // Create / edit role modal
  const [editing, setEditing] = useState(null) // null = create mode
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const roleForm = useForm({ defaultValues: { name: '', description: '' } })

  // Assign-permissions modal
  const [permTarget, setPermTarget] = useState(null)
  const [permLoading, setPermLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null)

  const canCreate = can('roles.create')
  const canUpdate = can('roles.update')
  const canAssign = can('roles.assign_permissions')
  const canDelete = can('roles.delete')

  // ---------- Create / Edit -------------------------------------------------

  const openCreate = () => {
    setEditing(null)
    roleForm.reset()
    setRoleModalOpen(true)
  }

  const openEdit = (role) => {
    setEditing(role)
    roleForm.reset({ name: role.name, description: role.description || '' })
    setRoleModalOpen(true)
  }

  // RHF blocks submission when the name is empty; the onInvalid handler
  // preserves the previous inline error toast for that case.
  const submitRoleForm = (event) => {
    roleForm.handleSubmit(handleSaveRole, () => showToast('Role name is required.', 'error'))(event)
  }

  const handleSaveRole = async ({ name, description }) => {
    if (busyRef.current) return

    busyRef.current = true
    setBusy(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
    }
    try {
      if (editing) {
        await roles.updateRole(editing.id, payload)
        showToast(`Role "${roleLabel(editing.name)}" updated.`)
      } else {
        await roles.createRole(payload)
        showToast(`Role "${roleLabel(payload.name)}" created.`)
      }
      setRoleModalOpen(false)
    } catch (err) {
      showToast(err?.message || 'Failed to save the role.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Assign permissions ----------------------------------------------

  const openPerms = async (role) => {
    setPermTarget(role)
    setPermLoading(true)
    setSelectedIds(new Set())
    try {
      const detail = await rolesService.fetchRole(role.id)
      setSelectedIds(new Set((detail.permissions || []).map((perm) => perm.id)))
    } catch (err) {
      showToast(err?.message || 'Failed to load the role permissions.', 'error')
      setPermTarget(null)
    } finally {
      setPermLoading(false)
    }
  }

  const togglePermission = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSavePermissions = async () => {
    if (!permTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await roles.assignPermissions(permTarget.id, [...selectedIds])
      showToast(`Permissions updated for "${roleLabel(permTarget.name)}".`)
      setPermTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to update permissions.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Delete ------------------------------------------------------------

  const handleConfirmDelete = async () => {
    if (!deleteTarget || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await roles.removeRole(deleteTarget.id)
      showToast(`Role "${roleLabel(deleteTarget.name)}" deleted.`)
      setDeleteTarget(null)
    } catch (err) {
      showToast(err?.message || 'Failed to delete the role.', 'error')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ---------- Render ---------------------------------------------------------------

  const totalSelected = selectedIds.size
  const totalPermissions = (permissions.data || []).length

  return (
    <div className="roles-page">
      {/* Page header */}
      <section className="page-heading">
        <div>
          <p>{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <span className="page-heading-description">{page.description}</span>
        </div>
        {canCreate && (
          <button type="button" className="primary-action" onClick={openCreate}>
            + Create Role
          </button>
        )}
      </section>

      {/* Roles panel */}
      <div className="panel main-panel">
        <div className="panel-header flex-header">
          <div>
            <h3>System Roles</h3>
            <p>Roles control which modules and actions each user can access</p>
          </div>
          {!roles.isLoading && !roles.error && (
            <span className="results-count">{roles.data.length} roles</span>
          )}
        </div>

        <div className="records-table-container">
          {roles.error ? (
            <ErrorState message={roles.error} onRetry={roles.refetch} />
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Description</th>
                  <th>Permissions</th>
                  <th>Users</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.isLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      <td>
                        <Skeleton width={110} height={16} />
                      </td>
                      <td>
                        <Skeleton width={220} height={14} />
                      </td>
                      <td>
                        <Skeleton width={60} height={14} />
                      </td>
                      <td>
                        <Skeleton width={40} height={14} />
                      </td>
                      <td>
                        <Skeleton width={140} height={28} />
                      </td>
                    </tr>
                  ))
                ) : roles.data.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <EmptyState message="No roles configured yet. Create one to get started." />
                    </td>
                  </tr>
                ) : (
                  roles.data.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <div className="role-name-cell">
                          <strong className="bold-text">{roleLabel(role.name)}</strong>
                          {role.is_system ? <span className="chip-tag muted">System</span> : null}
                        </div>
                      </td>
                      <td className="muted-text">{role.description || '—'}</td>
                      <td>
                        <span className="bold-text">{role.permissions_count}</span>
                      </td>
                      <td>
                        <span className="bold-text">{role.users_count}</span>
                      </td>
                      <td className="actions-cell">
                        <div className="row-actions">
                          {canUpdate && (
                            <button type="button" className="btn-info-small" onClick={() => openEdit(role)}>
                              Edit
                            </button>
                          )}
                          {canAssign && (
                            <button type="button" className="btn-primary-small" onClick={() => openPerms(role)}>
                              Permissions
                            </button>
                          )}
                          {canDelete && !role.is_system && (
                            <button type="button" className="btn-danger-small" onClick={() => setDeleteTarget(role)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================= CREATE / EDIT ROLE MODAL ================= */}
      {roleModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Edit role' : 'Create role'}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setRoleModalOpen(false)
          }}
        >
          <div className="modal-card modal-card-sm">
            <div className="modal-header">
              <h3>{editing ? `Edit Role — ${roleLabel(editing.name)}` : 'Create Role'}</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => {
                  if (!busy) setRoleModalOpen(false)
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form className="sidebar-form" onSubmit={submitRoleForm}>
                <label>
                  Role Name
                  <input
                    type="text"
                    placeholder="e.g. front-desk"
                    {...roleForm.register('name', { required: 'Role name is required.' })}
                    disabled={busy}
                  />
                </label>
                <label>
                  Description
                  <input
                    type="text"
                    placeholder="What is this role for?"
                    {...roleForm.register('description')}
                    disabled={busy}
                  />
                </label>
                <p className="form-sub">Permissions can be assigned after creating the role.</p>
                <div className="modal-footer-actions">
                  <button
                    type="button"
                    className="secondary-pill"
                    onClick={() => setRoleModalOpen(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-action" disabled={busy}>
                    {busy && <span className="spinner-sm" aria-hidden="true" />}
                    {busy ? 'Saving...' : editing ? 'Save Changes' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= ASSIGN PERMISSIONS MODAL ================= */}
      {permTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Permissions for ${roleLabel(permTarget.name)}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy && !permLoading) setPermTarget(null)
          }}
        >
          <div className="modal-card modal-card-wide">
            <div className="modal-header">
              <h3>Permissions — {roleLabel(permTarget.name)}</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => {
                  if (!busy && !permLoading) setPermTarget(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {permLoading ? (
                <div className="perm-groups">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div className="perm-group" key={i}>
                      <Skeleton width={160} height={12} />
                      <div className="perm-checkbox-grid">
                        {Array.from({ length: 3 }, (_, j) => (
                          <Skeleton key={j} width="100%" height={18} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="perm-groups">
                  <p className="form-sub" style={{ marginTop: 0 }}>
                    {totalSelected} of {totalPermissions} permissions selected
                  </p>
                  {Object.entries(permissionGroups).map(([module, perms]) => (
                    <fieldset className="perm-group" key={module}>
                      <legend className="perm-group-title">
                        {module}
                        <span className="perm-count-pill">
                          {perms.filter((perm) => selectedIds.has(perm.id)).length}/{perms.length}
                        </span>
                      </legend>
                      <div className="perm-checkbox-grid">
                        {perms.map((perm) => (
                          <label className="perm-checkbox" key={perm.id}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              disabled={busy}
                            />
                            <span>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                  {totalPermissions === 0 && (
                    <EmptyState message="No permissions are available to assign." />
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="secondary-pill"
                  onClick={() => setPermTarget(null)}
                  disabled={busy || permLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={handleSavePermissions}
                  disabled={busy || permLoading}
                >
                  {busy && <span className="spinner-sm" aria-hidden="true" />}
                  {busy ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Delete role ${roleLabel(deleteTarget.name)}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDeleteTarget(null)
          }}
        >
          <div className="modal-card modal-card-sm">
            <div className="modal-header">
              <h3>Delete Role</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => {
                  if (!busy) setDeleteTarget(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>
                Delete the role <strong>{roleLabel(deleteTarget.name)}</strong>? Users assigned to it must be
                moved to another role first, and this cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="secondary-pill"
                  onClick={() => setDeleteTarget(null)}
                  disabled={busy}
                >
                  Keep Role
                </button>
                <button type="button" className="btn-action-danger" onClick={handleConfirmDelete} disabled={busy}>
                  {busy && <span className="spinner-sm" aria-hidden="true" />}
                  {busy ? 'Deleting...' : 'Delete Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default RolesPermissions
