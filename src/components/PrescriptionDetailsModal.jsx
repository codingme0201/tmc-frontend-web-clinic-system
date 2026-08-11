import { formatDate } from '../lib/format'
import { KICKER, PILL, TABLE, BTN_INFO } from '../lib/ui'

const MODAL_CARD = 'flex max-h-[90vh] w-[min(650px,100%)] animate-modal-scale flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(8,20,20,0.22)]'
const MODAL_CARD_WIDE = MODAL_CARD + ' w-[min(860px,100%)]'
const MODAL_BACKDROP = 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(8,20,20,0.45)] p-5 backdrop-blur-[4px]'
const MODAL_HEADER = 'flex items-center justify-between border-b border-line p-[16px_20px]'
const MODAL_CLOSE = 'cursor-pointer border-0 bg-transparent p-1 text-[16px] text-muted-soft'
const MODAL_BODY = 'flex-1 overflow-y-auto p-5'
const MODAL_FOOTER = 'flex justify-end border-t border-line bg-[#fafcfb] p-[14px_20px]'
const MODAL_FOOTER_ACTIONS = 'flex flex-wrap items-center justify-end gap-2'
const PROFILE_LBL = 'mb-0.5 block text-[11px] font-extrabold uppercase text-muted'
const PROFILE_VAL = 'm-0 text-[14px] font-bold text-ink'
const REASON_BOX = 'rounded-lg border border-[#cfe5df] bg-[#f4faf8] p-[12px_14px]'

/**
 * Read-only prescription details — the "View Prescription History" surface.
 * Presents the patient, prescription date, prescribing personnel, the
 * related consultation (when available), and every medication line with its
 * documented 6.2 fields.
 */
function PrescriptionDetailsModal({ prescription, canUpdate, onEdit, onClose }) {
  const { medications = [], consultation = null } = prescription

  return (
    <div
      className={MODAL_BACKDROP}
      role="dialog"
      aria-modal="true"
      aria-label={`Prescription ${prescription.reference} details`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={MODAL_CARD_WIDE}>
        <div className={MODAL_HEADER}>
          <h3 className="m-0 text-[18px] text-ink">Prescription — {prescription.reference}</h3>
          <button type="button" className={MODAL_CLOSE} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={MODAL_BODY}>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-[#f4faf8] p-[12px_14px]">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-[15px] font-extrabold text-primary">
              {prescription.patient.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong className="block text-[15px] text-ink">{prescription.patient}</strong>
              <span className="block text-[12px] text-muted">
                {prescription.patientId || '—'} · {formatDate(prescription.date)}
              </span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
            <div className="rounded-lg border border-line bg-white p-[10px_12px]">
              <span className={PROFILE_LBL}>Prescription Date</span>
              <p className={PROFILE_VAL}>{formatDate(prescription.date)}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-[10px_12px]">
              <span className={PROFILE_LBL}>Prescribed By</span>
              <p className={PROFILE_VAL}>{prescription.prescribedBy || '—'}</p>
            </div>
          </div>

          {consultation && (
            <div className={`${REASON_BOX} mb-4`}>
              <p className={KICKER}>Related Consultation</p>
              <h4 className="mb-1 mt-0 text-[13.5px] text-ink">
                {consultation.reference}
                <span className="ml-2 font-mono text-[11.5px] text-muted">
                  {formatDate(consultation.date)}
                </span>
              </h4>
              <p className="m-0 text-[13px]">
                <strong>Diagnosis:</strong> {consultation.diagnosis || '—'}
                {consultation.staff ? (
                  <>
                    {' '}
                    · <strong>Attending:</strong> {consultation.staff}
                  </>
                ) : null}
              </p>
            </div>
          )}

          <h4 className={`${KICKER} mb-2`}>Medications ({medications.length})</h4>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((med) => (
                  <tr key={med.id}>
                    <td>
                      <strong className="font-bold text-ink">{med.medicineName}</strong>
                    </td>
                    <td className="whitespace-nowrap">{med.dosage || '—'}</td>
                    <td className="whitespace-nowrap">{med.frequency || '—'}</td>
                    <td className="whitespace-nowrap">{med.duration || '—'}</td>
                    <td className="max-w-[280px]">{med.instructions || '—'}</td>
                  </tr>
                ))}
                {medications.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">
                      No medication lines recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={MODAL_FOOTER}>
          <div className={MODAL_FOOTER_ACTIONS}>
            {canUpdate && (
              <button type="button" className={BTN_INFO} onClick={onEdit}>
                Edit Prescription
              </button>
            )}
            <button type="button" className={PILL} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrescriptionDetailsModal
