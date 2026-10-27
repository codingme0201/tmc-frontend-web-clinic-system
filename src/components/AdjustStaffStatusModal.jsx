import { useEffect, useRef } from 'react'
import { PILL, TABLE, SELECT_INPUT } from '../lib/ui'
import { EmptyState, ErrorState } from './AsyncState'
import TableSkeleton from './skeletons/TableSkeleton'

export default function AdjustStaffStatusModal({ staff, loading, error, onRetry, updating, onUpdate, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      previousFocus?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="adjust-shift-title"
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100vw_-_2rem)] max-w-[700px] overflow-hidden rounded-xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
      onCancel={(event) => { event.preventDefault(); if (!updating) onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || updating) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}
    >
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 id="adjust-shift-title" className="m-0 text-[18px]">Adjust Shift</h3>
            <p className="mb-0 mt-1 text-[12px] text-muted">Update staff status for today.</p>
          </div>
          <button type="button" className={PILL} aria-label="Close Adjust Shift" disabled={Boolean(updating)} onClick={onClose}>Close</button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
          {error ? <ErrorState message={error} onRetry={onRetry} /> : (
            <div className="overflow-x-auto rounded-lg border border-line">
              {loading ? <TableSkeleton columns={2} /> : (
              <table className={TABLE}>
                <thead><tr><th>Staff Member</th><th>Status</th></tr></thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr><td colSpan="2"><EmptyState message="No active doctors or nurses found." /></td></tr>
                  ) : staff.map((member) => (
                    <tr key={member.userId}>
                      <td><strong className="font-bold text-ink">{member.name}</strong><span className="block text-[12px] text-muted">{member.role}</span></td>
                      <td>
                        <select aria-label={`Status for ${member.name}`} className={SELECT_INPUT} value={member.status} disabled={Boolean(updating)} onChange={(event) => onUpdate(member, event.target.value)}>
                          <option value="On duty">On Duty</option>
                          <option value="Break">On Break</option>
                          <option value="Off duty">Off Duty</option>
                        </select>
                        {updating === member.userId && <span role="status" className="block text-[11px] text-muted">Saving status...</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
