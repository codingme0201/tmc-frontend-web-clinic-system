import { useMemo } from 'react'
import { useEligibleStaff } from '../hooks/useStaffSchedules'
import { FORM_FIELD } from '../lib/ui'

/**
 * Doctor / nurse picker bound to the user account ID, so assignments are
 * linked to the real clinician (not a free-text name). Doctors are listed
 * first; verified credentials are marked with ✓.
 */
export default function ClinicianSelect({
  value = '',
  onChange,
  disabled = false,
  allowUnassigned = true,
  unassignedLabel = 'Unassigned',
  className = FORM_FIELD,
  ...rest
}) {
  const { data: clinicians = [], isLoading } = useEligibleStaff()

  const groups = useMemo(() => {
    const byRole = (role) => clinicians.filter((c) => c.role?.name === role)
    return [
      { label: 'Doctors', members: byRole('doctor') },
      { label: 'Nurses (clinical assistants)', members: byRole('nurse') },
    ].filter((g) => g.members.length > 0)
  }, [clinicians])

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
      {allowUnassigned && <option value="">{isLoading ? 'Loading clinicians…' : unassignedLabel}</option>}
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
