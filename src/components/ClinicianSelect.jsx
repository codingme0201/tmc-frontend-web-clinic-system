import { useMemo } from 'react'
import { useEligibleStaff } from '../hooks/useStaffSchedules'
import { FORM_FIELD } from '../lib/ui'

/**
 * Doctor / nurse picker bound to the user account ID, so assignments are
 * linked to the real clinician (not a free-text name). Doctors are listed
 * first; verified credentials are marked with ✓. Staff whose application
 * was rejected are never returned by the API. Pass `department` to list
 * only the clinicians of that department (e.g. Dental).
 */
export default function ClinicianSelect({
  value = '',
  onChange,
  disabled = false,
  allowUnassigned = true,
  unassignedLabel = 'Unassigned',
  className = FORM_FIELD,
  roles = ['doctor', 'nurse'],
  department = null,
  ...rest
}) {
  const { data: allClinicians = [], isLoading } = useEligibleStaff()
  const roleKey = roles.join(',')
  const clinicians = useMemo(
    () =>
      allClinicians.filter(
        (c) =>
          roleKey.split(',').includes(c.role?.name) &&
          (!department || (c.staffProfile?.department || 'General Medicine') === department),
      ),
    [allClinicians, roleKey, department],
  )

  const groups = useMemo(() => {
    const byRole = (role) => clinicians.filter((c) => c.role?.name === role)
    return [
      { label: department ? `Doctors — ${department}` : 'Doctors', members: byRole('doctor') },
      { label: 'Nurses (clinical assistants)', members: byRole('nurse') },
    ].filter((g) => g.members.length > 0)
  }, [clinicians, department])

  const emptyLabel = department ? `No available ${department} doctors / nurses` : 'No available clinicians'

  return (
    <select
      className={className}
      value={value ? String(value) : ''}
      onChange={(e) => {
        const id = e.target.value ? Number(e.target.value) : null
        onChange?.(id, clinicians.find((c) => c.id === id) || null)
      }}
      disabled={disabled || isLoading}
      {...rest}
    >
      {allowUnassigned && (
        <option value="">{isLoading ? 'Loading clinicians…' : clinicians.length === 0 ? emptyLabel : unassignedLabel}</option>
      )}
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
              {member.staffProfile?.specialization ? ` — ${member.staffProfile.specialization}` : ''}
              {member.staffProfile?.credentialStatus === 'Verified' ? ' ✓' : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
