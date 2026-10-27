import { useEffect, useRef, useState } from 'react'
import { usePatients } from '../hooks/usePatients'
import { useToast } from '../hooks/useToast'
import { formatPhone, isValidPhone, PHONE_ERROR } from '../lib/format'
import { PILL, PRIMARY_BTN, FORM_LABEL, FORM_FIELD, FORM_ROW } from '../lib/ui'
import InlineSpinner from './Spinner'
import CourseSelect from './CourseSelect'

export default function AddPatientModal({ onClose, onCreated }) {
  const { addPatient } = usePatients()
  const { showToast } = useToast()
  const dialogRef = useRef(null)
  const savingRef = useRef(false)
  const [addingPatient, setAddingPatient] = useState(false)
  // Add Patient Form State
  const [patId, setPatId] = useState('')
  const [patName, setPatName] = useState('')
  const [patAge, setPatAge] = useState('')
  const [patSex, setPatSex] = useState('')
  const [patDept, setPatDept] = useState('')
  const [patContact, setPatContact] = useState('')
  const [patEmergency, setPatEmergency] = useState('')
  const [patAllergies, setPatAllergies] = useState('')
  const [patHistory, setPatHistory] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      previousFocus?.focus()
    }
  }, [])

  // Patient Actions
  const handleAddPatient = async (e) => {
    e.preventDefault()
    if (savingRef.current || !patId.trim() || !patName.trim()) return
    if (!isValidPhone(patContact)) {
      showToast(PHONE_ERROR, 'error')
      return
    }
    savingRef.current = true
    setAddingPatient(true)
    try {
      const created = await addPatient({
        id: patId.trim(),
        name: patName.trim(),
        type: 'Student',
        age: patAge.trim() || null,
        sex: patSex || null,
        courseDept: patDept,
        contact: patContact,
        emergencyContact: patEmergency,
        allergies: patAllergies || 'None',
        history: patHistory || 'None',
      })
      showToast(`Patient profile created for ${patName}.`)
      onCreated?.(created)
      onClose()
    } catch (err) {
      showToast(err?.message || 'Failed to create the patient profile.', 'error')
    } finally {
      savingRef.current = false
      setAddingPatient(false)
    }
  }


  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="add-patient-title"
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100vw_-_2rem)] max-w-[700px] overflow-hidden rounded-xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
      onCancel={(event) => { event.preventDefault(); if (!savingRef.current) onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || savingRef.current) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}
    >
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 id="add-patient-title" className="m-0 text-[18px]">Add Patient</h3>
          <button type="button" className={PILL} aria-label="Close Add Patient" disabled={addingPatient} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleAddPatient} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <fieldset disabled={addingPatient} className="m-0 grid min-h-0 gap-4 overflow-y-auto border-0 p-5">
            <div className={FORM_ROW}>
              <label className={FORM_LABEL}>
                Patient ID
                <input
                  type="text"
                  placeholder="e.g. 24-012345"
                  pattern="[0-9]{2}-[0-9]{6}"
                  title="Enter the existing TMC Student ID in 00-000000 format."
                  value={patId}
                  onChange={(e) => setPatId(e.target.value)}
                  required
                  className={FORM_FIELD}
                />
              </label>
              <label className={FORM_LABEL}>
                Full Name
                <input
                  type="text"
                  placeholder="Full Name"
                  value={patName}
                  onChange={(e) => setPatName(e.target.value)}
                  required
                  className={FORM_FIELD}
                />
              </label>
            </div>

            <div className={FORM_ROW}>
              <label className={FORM_LABEL}>
                Age
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="(?:[1-9]|[1-9][0-9]|1[01][0-9]|120)"
                  title="Enter a whole-number age from 1 to 120."
                  placeholder="e.g. 20"
                  value={patAge}
                  onChange={(e) => setPatAge(e.target.value)}
                  className={FORM_FIELD}
                />
              </label>
            </div>
            <div className={FORM_ROW}>
              <label className={FORM_LABEL}>
                Sex
                <select value={patSex} onChange={(e) => setPatSex(e.target.value)} className={FORM_FIELD}>
                  <option value="">Select sex</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className={FORM_LABEL}>
                Course/Dept
                <CourseSelect value={patDept} onChange={setPatDept} required />
              </label>
            </div>

            <label className={FORM_LABEL}>
              Contact Number
              <input
                type="tel"
                placeholder="0917-123-4567"
                value={patContact}
                onChange={(e) => setPatContact(formatPhone(e.target.value))}
                maxLength={13}
                className={FORM_FIELD}
              />
            </label>

            <label className={FORM_LABEL}>
              Emergency Contact (Name & Phone)
              <input
                type="text"
                placeholder="Guardian Name - 09xx..."
                value={patEmergency}
                onChange={(e) => setPatEmergency(e.target.value)}
                required
                className={FORM_FIELD}
              />
            </label>

            <label className={FORM_LABEL}>
              Known Allergies
              <input
                type="text"
                placeholder="e.g. Penicillin, Nuts, None"
                value={patAllergies}
                onChange={(e) => setPatAllergies(e.target.value)}
                className={FORM_FIELD}
              />
            </label>

            <label className={FORM_LABEL}>
              Medical History
              <textarea
                placeholder="e.g. Hypertension, Asthma, None"
                value={patHistory}
                onChange={(e) => setPatHistory(e.target.value)}
                className={`${FORM_FIELD} min-h-20 resize-y`}
              />
            </label>

          </fieldset>
          <div className="flex justify-end gap-2 border-t border-line p-4">
            <button type="button" className={PILL} disabled={addingPatient} onClick={onClose}>Cancel</button>
            <button type="submit" className={PRIMARY_BTN} disabled={addingPatient}>
              {addingPatient ? (
                <>
                  <InlineSpinner />Adding...
                </>
              ) : (
                'Save Patient'
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
