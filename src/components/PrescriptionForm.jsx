import { useMemo } from 'react'
import { useForm } from '../hooks/useForm'
import { todayISO } from '../lib/format'
import { FORM_LABEL, FORM_FIELD, FORM_ROW, PILL, PRIMARY_BTN } from '../lib/ui'
import InlineSpinner from './Spinner'

const MODAL_CARD = 'flex max-h-[90vh] w-[min(650px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_CARD_WIDE = MODAL_CARD + ' w-[min(860px,100%)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'
const FIELD_ERROR = 'text-[12px] font-bold text-danger'
const INFO_BOX = 'rounded-lg border border-[#cfe5df] bg-[#f4faf8] p-[12px_14px]'
const MED_GRID = 'grid grid-cols-[1.4fr_1fr_1.2fr_1fr] gap-[10px] max-[760px]:grid-cols-2'

const emptyMedication = () => ({ medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '' })

/**
 * One medication line of the prescription form.
 */
function MedicationRow({ index, medication, errors, onChange, onRemove, canRemove, busy }) {
  const fieldError = (name) => errors[`medications.${index}.${name}`]

  return (
    <div className="rounded-lg border border-line-strong bg-[#fafcfb] p-[12px_14px]">
      <div className="mb-[10px] flex items-center justify-between gap-2">
        <span className="text-[12px] font-extrabold uppercase tracking-[0.02em] text-muted">
          Medication {index + 1}
        </span>
        <button
          type="button"
          className="cursor-pointer rounded-md bg-[#ffebe0] px-2 py-1 text-[11px] font-extrabold text-[#a33c12] transition-all duration-200 hover:bg-[#f8d7c6] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onRemove}
          disabled={!canRemove || busy}
        >
          Remove
        </button>
      </div>

      <div className={MED_GRID}>
        <label className={FORM_LABEL}>
          <span>Medicine Name *</span>
          <input
            type="text"
            className={FORM_FIELD}
            placeholder="e.g. Paracetamol"
            value={medication.medicine_name}
            onChange={(e) => onChange('medicine_name', e.target.value)}
            disabled={busy}
          />
          {fieldError('medicine_name') && <span className={FIELD_ERROR}>{fieldError('medicine_name')}</span>}
        </label>
        <label className={FORM_LABEL}>
          <span>Dosage *</span>
          <input
            type="text"
            className={FORM_FIELD}
            placeholder="e.g. 500 mg"
            value={medication.dosage}
            onChange={(e) => onChange('dosage', e.target.value)}
            disabled={busy}
          />
          {fieldError('dosage') && <span className={FIELD_ERROR}>{fieldError('dosage')}</span>}
        </label>
        <label className={FORM_LABEL}>
          <span>Frequency *</span>
          <input
            type="text"
            className={FORM_FIELD}
            placeholder="e.g. Every 6 hours as needed"
            value={medication.frequency}
            onChange={(e) => onChange('frequency', e.target.value)}
            disabled={busy}
          />
          {fieldError('frequency') && <span className={FIELD_ERROR}>{fieldError('frequency')}</span>}
        </label>
        <label className={FORM_LABEL}>
          <span>Duration</span>
          <input
            type="text"
            className={FORM_FIELD}
            placeholder="e.g. 7 days"
            value={medication.duration}
            onChange={(e) => onChange('duration', e.target.value)}
            disabled={busy}
          />
        </label>
      </div>

      <label className={`${FORM_LABEL} mt-[10px]`}>
        <span>Instructions</span>
        <textarea
          className={`${FORM_FIELD} min-h-[52px] resize-y`}
          placeholder="e.g. Take with food if stomach upset occurs."
          value={medication.instructions}
          onChange={(e) => onChange('instructions', e.target.value)}
          disabled={busy}
        />
      </label>
    </div>
  )
}

/**
 * Create / edit prescription form modal.
 *
 * Owns the form state (via the shared `useForm` hook), validates the
 * documented 6.1/6.2 fields, and submits the payload using the backend's
 * field names so the Laravel Form Requests receive the data. The parent
 * remounts this component per open (`key={...}`) with fresh `initialValues`,
 * so create and edit start from exactly the right state.
 */
function PrescriptionForm({
  title,
  initialValues,
  patients,
  consultations,
  staff,
  busy,
  submitLabel,
  onSubmit,
  onInvalid,
  onClose,
}) {
  const form = useForm(initialValues, {
    validate: (values) => {
      const errors = {}
      if (!values.patient) errors.patient = 'Select a patient'
      if (!values.date) errors.date = 'Prescription date is required'

      const medications = values.medications ?? []
      if (medications.length === 0) {
        errors.medications = 'Add at least one medication'
      }
      medications.forEach((med, i) => {
        if (!med.medicine_name.trim()) errors[`medications.${i}.medicine_name`] = 'Medicine name is required'
        if (!med.dosage.trim()) errors[`medications.${i}.dosage`] = 'Dosage is required'
        if (!med.frequency.trim()) errors[`medications.${i}.frequency`] = 'Frequency is required'
      })
      return errors
    },
  })

  // Consultations the prescription may be written during or after — only
  // visits that have actually started (In Progress / Completed) qualify.
  const patientConsults = useMemo(
    () =>
      consultations.filter(
        (c) =>
          c.patient === form.values.patient &&
          (c.status === 'In Progress' || c.status === 'Completed'),
      ),
    [consultations, form.values.patient],
  )

  const handlePatientChange = (patientId) => {
    const patient = patients.find((p) => p.id === patientId)
    form.setValues({
      ...form.values,
      patient: patient?.name || '',
      patient_id: patient?.id || '',
      consultation_id: '',
    })
  }

  const handleConsultationChange = (consultationId) => {
    const consultation = patientConsults.find((c) => String(c.id) === String(consultationId))
    form.setValues({
      ...form.values,
      consultation_id: consultation ? consultation.id : '',
      // Prefill the prescriber from the consultation's attending staff when
      // none has been chosen yet.
      prescribed_by: consultation?.staff || form.values.prescribed_by,
    })
  }

  const setMedication = (index, field, value) => {
    form.setValue(
      'medications',
      form.values.medications.map((med, i) => (i === index ? { ...med, [field]: value } : med)),
    )
  }

  const addMedication = () => {
    form.setValue('medications', [...form.values.medications, emptyMedication()])
  }

  const removeMedication = (index) => {
    form.setValue('medications', form.values.medications.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (busy) return
    const errors = form.runValidation()
    if (Object.keys(errors).length > 0) {
      onInvalid?.()
      return
    }

    onSubmit({
      patient: form.values.patient,
      patient_id: form.values.patient_id,
      consultation_id: form.values.consultation_id || null,
      prescribed_by: form.values.prescribed_by,
      date: form.values.date || todayISO(),
      medications: form.values.medications.map((med) => ({
        medicine_name: med.medicine_name.trim(),
        dosage: med.dosage.trim(),
        frequency: med.frequency.trim(),
        duration: (med.duration || '').trim(),
        instructions: (med.instructions || '').trim(),
      })),
    })
  }

  const medications = form.values.medications ?? []

  return (
    <div
      className={MODAL_BACKDROP}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div className={MODAL_CARD_WIDE}>
        <div className={MODAL_HEADER}>
          <h3 className="m-0 text-[18px] text-ink">{title}</h3>
          <button
            type="button"
            className={MODAL_CLOSE}
            onClick={() => {
              if (!busy) onClose()
            }}
          >
            ✕
          </button>
        </div>

        <div className={MODAL_BODY}>
          <div className={`${INFO_BOX} mb-4`}>
            <p className="m-0 text-[13px]">
              Records a prescription <strong>during or after a consultation</strong> — select the
              patient, optionally link the consultation it was written for, and list each medication
              with its dosage, frequency, duration, and instructions.
            </p>
          </div>

          <div className="grid gap-[14px]">
            <div className={FORM_ROW}>
              <label className={FORM_LABEL}>
                <span>Patient *</span>
                <select
                  className={FORM_FIELD}
                  value={form.values.patient_id}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  disabled={busy}
                >
                  <option value="">— Select patient —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.id} {p.type ? `(${p.type})` : ''}
                    </option>
                  ))}
                </select>
                {form.errors.patient && <span className={FIELD_ERROR}>{form.errors.patient}</span>}
              </label>
              <label className={FORM_LABEL}>
                <span>Source Consultation (optional)</span>
                <select
                  className={FORM_FIELD}
                  value={form.values.consultation_id}
                  onChange={(e) => handleConsultationChange(e.target.value)}
                  disabled={busy || !form.values.patient}
                >
                  <option value="">— No consultation —</option>
                  {patientConsults.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.reference} · {c.date} · {c.diagnosis || c.chiefComplaint || c.status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={FORM_ROW}>
              <label className={FORM_LABEL}>
                <span>Prescribed By</span>
                <select
                  className={FORM_FIELD}
                  value={form.values.prescribed_by}
                  onChange={(e) => form.setValue('prescribed_by', e.target.value)}
                  disabled={busy}
                >
                  <option value="">— Select medical personnel —</option>
                  {staff.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} — {m.role}
                    </option>
                  ))}
                </select>
              </label>
              <label className={FORM_LABEL}>
                <span>Prescription Date *</span>
                <input
                  type="date"
                  className={FORM_FIELD}
                  value={form.values.date}
                  onChange={(e) => form.setValue('date', e.target.value)}
                  disabled={busy}
                />
                {form.errors.date && <span className={FIELD_ERROR}>{form.errors.date}</span>}
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-ink">Medication Details</span>
                <button
                  type="button"
                  className={PILL}
                  onClick={addMedication}
                  disabled={busy}
                >
                  + Add Medication
                </button>
              </div>
              {form.errors.medications && <p className={`${FIELD_ERROR} mt-0 mb-2`}>{form.errors.medications}</p>}

              <div className="flex flex-col gap-3">
                {medications.map((med, index) => (
                  <MedicationRow
                    key={index}
                    index={index}
                    medication={med}
                    errors={form.errors}
                    onChange={(field, value) => setMedication(index, field, value)}
                    onRemove={() => removeMedication(index)}
                    canRemove={medications.length > 1}
                    busy={busy}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={MODAL_FOOTER}>
          <div className={MODAL_FOOTER_ACTIONS}>
            <button
              type="button"
              className={PILL}
              onClick={() => {
                if (!busy) onClose()
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${PRIMARY_BTN} min-h-10 px-[14px] text-[13px]`}
              onClick={handleSubmit}
              disabled={busy}
            >
              {busy ? (
                <>
                  <InlineSpinner /> Saving...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrescriptionForm
