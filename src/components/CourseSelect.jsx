import { useAcademicPrograms } from '../hooks/useAcademicPrograms'
import { FORM_FIELD } from '../lib/ui'

/**
 * Course / department dropdown grouped by department. A value typed before
 * the dropdown existed is kept as a "(current)" option so older records can
 * still be saved unchanged.
 */
export default function CourseSelect({
  value = '',
  onChange,
  disabled = false,
  required = false,
  className = FORM_FIELD,
  placeholder = 'Select course / department',
  ...rest
}) {
  const { groups, courses, isLoading } = useAcademicPrograms()
  const isLegacy = value && !isLoading && !courses.includes(value)

  return (
    <select
      className={className}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled || isLoading}
      required={required}
      {...rest}
    >
      <option value="">{isLoading ? 'Loading courses…' : placeholder}</option>
      {isLegacy && <option value={value}>{value} (current)</option>}
      {groups.map((group) => (
        <optgroup key={group.department} label={group.department}>
          {group.courses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
