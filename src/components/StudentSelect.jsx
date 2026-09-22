import { useState, useRef, useEffect, useMemo } from 'react'
import { usePatients } from '../hooks/usePatients'
import { FORM_FIELD } from '../lib/ui'

/**
 * Reusable searchable combobox dropdown for selecting students/patients.
 * Allows typing either the student's name OR their student ID (e.g., "24-012345"),
 * showing matching students in real-time.
 *
 * @param {Object} props
 * @param {string|number|null} props.value - Currently selected value (matches valueKey)
 * @param {Function} props.onChange - Callback `(val, studentObject) => void`
 * @param {'patientId'|'name'|'id'|'object'} [props.valueKey='patientId'] - Property to bind to `value`
 * @param {Array} [props.patients] - Optional list of patients. If omitted, uses `usePatients()`
 * @param {string} [props.placeholder='Search student name or ID (e.g. 24-012345)...']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.required=false]
 * @param {boolean} [props.allowClear=true]
 * @param {boolean} [props.allowCustomInput=false] - If true, allows free-form text input
 * @param {string} [props.className='']
 * @param {string} [props.id]
 * @param {string} [props.name]
 */
export default function StudentSelect({
  value = '',
  onChange,
  valueKey = 'patientId',
  patients: externalPatients,
  placeholder = 'Search student name or ID (e.g. 24-012345)...',
  disabled = false,
  required = false,
  allowClear = true,
  allowCustomInput = false,
  className = '',
  id,
  name,
}) {
  const { data: defaultPatients = [], isLoading } = usePatients()
  const patientList = externalPatients ?? defaultPatients

  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Find currently selected patient
  const selectedPatient = useMemo(() => {
    if (!value) return null
    return patientList.find((p) => {
      if (valueKey === 'object') return p.patientId === value?.patientId || p.id === value?.id
      if (valueKey === 'id') return String(p.id) === String(value)
      if (valueKey === 'name') return p.name === value
      return p.patientId === value || String(p.id) === String(value)
    }) || null
  }, [value, patientList, valueKey])

  // Filtered patients based on search term
  const filteredPatients = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase()
    if (!q) return patientList

    return patientList.filter((p) => {
      const nameMatch = (p.name || '').toLowerCase().includes(q)
      const idMatch = (p.patientId || '').toLowerCase().includes(q)
      const deptMatch = (p.courseDept || '').toLowerCase().includes(q)
      return nameMatch || idMatch || deptMatch
    })
  }, [patientList, searchTerm])

  // Display label for the input
  const displayValue = useMemo(() => {
    if (isFocused) return searchTerm
    if (selectedPatient) {
      return `${selectedPatient.name} (${selectedPatient.patientId})`
    }
    if (allowCustomInput && typeof value === 'string' && value) {
      return value
    }
    return ''
  }, [isFocused, searchTerm, selectedPatient, allowCustomInput, value])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setIsFocused(false)
        setSearchTerm('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFocus = () => {
    if (disabled) return
    setIsFocused(true)
    setIsOpen(true)
    // Pre-populate search term with nothing so full list shows, or partial name
    setSearchTerm('')
  }

  const handleInputChange = (e) => {
    const text = e.target.value
    setSearchTerm(text)
    if (!isOpen) setIsOpen(true)

    if (allowCustomInput) {
      onChange?.(text, null)
    }
  }

  const handleSelect = (patient) => {
    let outVal = patient.patientId
    if (valueKey === 'name') outVal = patient.name
    if (valueKey === 'id') outVal = patient.id
    if (valueKey === 'object') outVal = patient

    onChange?.(outVal, patient)
    setIsOpen(false)
    setIsFocused(false)
    setSearchTerm('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange?.(valueKey === 'object' ? null : '', null)
    setSearchTerm('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setIsFocused(false)
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true)
    }
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        {/* Search / User Icon */}
        <div className="pointer-events-none absolute left-3 flex items-center text-muted-soft">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          disabled={disabled || isLoading}
          required={required && !value}
          placeholder={isLoading ? 'Loading students...' : placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`${FORM_FIELD} pl-9 pr-14 text-[13px] ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'bg-white'}`}
        />

        {/* Action icons (Clear & Dropdown Chevron) */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {allowClear && !!value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="cursor-pointer rounded-full p-0.5 text-muted hover:bg-gray-200 hover:text-ink transition-colors"
              title="Clear selection"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false)
                } else {
                  inputRef.current?.focus()
                  setIsOpen(true)
                }
              }
            }}
            className="cursor-pointer text-muted-soft hover:text-ink transition-colors"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown Options List */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-[120] mt-1 max-h-64 overflow-y-auto rounded-xl border border-line-strong bg-white p-1.5 shadow-[0_10px_28px_rgba(18,57,59,0.15)] animate-fade-in">
          {filteredPatients.length === 0 ? (
            <div className="p-3 text-center text-[12.5px] text-muted">
              No students found matching <span className="font-semibold text-ink">"{searchTerm}"</span>.
            </div>
          ) : (
            <ul className="m-0 list-none p-0 flex flex-col gap-0.5">
              {filteredPatients.map((patient) => {
                const isSelected =
                  selectedPatient &&
                  (selectedPatient.patientId === patient.patientId || selectedPatient.id === patient.id)

                return (
                  <li key={patient.id || patient.patientId}>
                    <button
                      type="button"
                      onClick={() => handleSelect(patient)}
                      className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold border-l-[3px] border-primary'
                          : 'hover:bg-[#f0f7f5] text-ink'
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13.5px] font-bold truncate">{patient.name}</span>
                          <span className="inline-flex items-center font-mono text-[11px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            {patient.patientId}
                          </span>
                        </div>
                        {patient.courseDept && (
                          <span className="text-[11.5px] text-muted-soft truncate mt-0.5">
                            {patient.courseDept}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <span className="text-primary font-bold text-[13px] shrink-0">✓</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
