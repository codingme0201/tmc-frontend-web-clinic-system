import { useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRoles } from '../hooks/useRoles'
import { usePermissions } from '../hooks/usePermissions'
import { useForm } from 'react-hook-form'
import { useToast } from '../hooks/useToast'
import { rolesService } from '../services/rolesService'
import {
  PILL, PRIMARY_BTN, PANEL, KICKER, TABLE, SIDEBAR_FORM, FORM_LABEL, FORM_FIELD,
  BTN_INFO, BTN_PRIMARY, BTN_DANGER, BTN_ACTION_DANGER,
} from '../lib/ui'
import InlineSpinner from '../components/Spinner'
import Skeleton from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/AsyncState'

const MODAL_CARD_SM = 'flex max-h-[90vh] w-[min(480px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_CARD_WIDE = 'flex max-h-[90vh] w-[min(780px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'

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
    <div>
      {/* Page header */}
      <section className="mb-5 flex items-center justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <p className={KICKER}>{page.eyebrow}</p>
          <h2 className="m-0 text-[clamp(30px,5vw,48px)] leading-[1.02] text-ink">{page.title}</h2>
          <span className="mt-[6px] block text-[13px] text-muted">{page.description}</span>
        </div>
        {canCreate && (
          <button type="button" className={PRIMARY_BTN} onClick={openCreate}>
            + Create Role
          </button>
        )}
      </section>

      {/* Roles panel */}
      <div className={`${PANEL} p-5`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[18px] text-[#143d40]">System Roles</h3>
            <p className={KICKER}>Roles control which modules and actions each user can access</p>
          </div>
          {!roles.isLoading && !roles.error && (
            <span className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-muted">{roles.data.length} roles</span>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-line">
          {roles.error ? (
            <ErrorState message={roles.error} onRetry={roles.refetch} />
          ) : (
            <table className={TABLE}>
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
                        <div className="flex items-center gap-2">
                          <strong className="font-bold text-ink">{roleLabel(role.name)}</strong>
                          {role.is_system ? <span className="inline-flex items-center whitespace-nowrap rounded-full bg-bg px-[9px] py-[3px] text-[11px] font-extrabold text-muted">System</span> : null}
                        </div>
                      </td>
                      <td className="text-muted">{role.description || '—'}</td>
                      <td>
                        <span className="font-bold text-ink">{role.permissions_count}</span>
                      </td>
                      <td>
                        <span className="font-bold text-ink">{role.users_count}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-[6px]">
                          {canUpdate && (
                            <button type="button" className={BTN_INFO} onClick={() => openEdit(role)}>
                              Edit
                            </button>
                          )}
                          {canAssign && (
                            <button type="button" className={BTN_PRIMARY} onClick={() => openPerms(role)}>
                              Permissions
                            </button>
                          )}
                          {canDelete && !role.is_system && (
                            <button type="button" className={BTN_DANGER} onClick={() => setDeleteTarget(role)}>
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
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Edit role' : 'Create role'}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setRoleModalOpen(false)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">{editing ? `Edit Role — ${roleLabel(editing.name)}` : 'Create Role'}</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) setRoleModalOpen(false)
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <form className={SIDEBAR_FORM} onSubmit={submitRoleForm}>
                <label className={FORM_LABEL}>
                  Role Name
                  <input
                    type="text"
                    placeholder="e.g. front-desk"
                    className={FORM_FIELD}
                    {...roleForm.register('name', { required: 'Role name is required.' })}
                    disabled={busy}
                  />
                </label>
                <label className={FORM_LABEL}>
                  Description
                  <input
                    type="text"
                    placeholder="What is this role for?"
                    className={FORM_FIELD}
                    {...roleForm.register('description')}
                    disabled={busy}
                  />
                </label>
                <p className="mt-0.5 text-[12px] text-muted">Permissions can be assigned after creating the role.</p>
                <div className={MODAL_FOOTER_ACTIONS}>
                  <button
                    type="button"
                    className={PILL}
                    onClick={() => setRoleModalOpen(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`} disabled={busy}>
                    {busy && <InlineSpinner />}
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
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Permissions for ${roleLabel(permTarget.name)}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy && !permLoading) setPermTarget(null)
          }}
        >
          <div className={MODAL_CARD_WIDE}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Permissions — {roleLabel(permTarget.name)}</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy && !permLoading) setPermTarget(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              {permLoading ? (
                <div className="grid gap-[14px]">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div className="m-0 rounded-lg border border-line p-[12px_14px]" key={i}>
                      <Skeleton width={160} height={12} />
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[7px_14px]">
                        {Array.from({ length: 3 }, (_, j) => (
                          <Skeleton key={j} width="100%" height={18} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-[14px]">
                  <p className="mt-0 text-[12px] text-muted">
                    {totalSelected} of {totalPermissions} permissions selected
                  </p>
                  {Object.entries(permissionGroups).map(([module, perms]) => (
                    <fieldset className="m-0 rounded-lg border border-line p-[12px_14px]" key={module}>
                      <legend className="flex w-full items-center justify-between gap-[10px] px-2 text-[12px] font-extrabold uppercase tracking-[0.02em] text-ink">
                        {module}
                        <span className="rounded-full bg-bg px-2 py-[2px] text-[11px] font-extrabold text-primary">
                          {perms.filter((perm) => selectedIds.has(perm.id)).length}/{perms.length}
                        </span>
                      </legend>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[7px_14px]">
                        {perms.map((perm) => (
                          <label className="group flex cursor-pointer items-center gap-2 text-[13px] text-ink" key={perm.id}>
                            <input
                              type="checkbox"
                              className="m-0 size-[15px] accent-primary"
                              checked={selectedIds.has(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              disabled={busy}
                            />
                            <span className="group-has-checked:font-bold group-has-checked:text-primary">{perm.label}</span>
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
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button
                  type="button"
                  className={PILL}
                  onClick={() => setPermTarget(null)}
                  disabled={busy || permLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`}
                  onClick={handleSavePermissions}
                  disabled={busy || permLoading}
                >
                  {busy && <InlineSpinner />}
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
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-label={`Delete role ${roleLabel(deleteTarget.name)}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDeleteTarget(null)
          }}
        >
          <div className={MODAL_CARD_SM}>
            <div className={MODAL_HEADER}>
              <h3 className="m-0 text-[18px] text-ink">Delete Role</h3>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  if (!busy) setDeleteTarget(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className={MODAL_BODY}>
              <p className="mt-0">
                Delete the role <strong>{roleLabel(deleteTarget.name)}</strong>? Users assigned to it must be
                moved to another role first, and this cannot be undone.
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <div className={MODAL_FOOTER_ACTIONS}>
                <button
                  type="button"
                  className={PILL}
                  onClick={() => setDeleteTarget(null)}
                  disabled={busy}
                >
                  Keep Role
                </button>
                <button type="button" className={`${BTN_ACTION_DANGER} min-h-10 px-[14px] text-[13px]`} onClick={handleConfirmDelete} disabled={busy}>
                  {busy && <InlineSpinner />}
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
