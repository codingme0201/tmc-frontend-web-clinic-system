import { useEffect, useRef } from 'react'
import { PILL, TABLE } from '../lib/ui'
import { EmptyState, ErrorState } from './AsyncState'
import TableSkeleton from './skeletons/TableSkeleton'

export default function OnDutyStaffModal({ staff, loading, error, onRetry, onClose }) {
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
    <dialog ref={dialogRef} aria-labelledby="on-duty-title"
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100vw_-_2rem)] max-w-[700px] overflow-hidden rounded-xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}>
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 id="on-duty-title" className="m-0 text-[18px]">Currently On Duty</h3>
          <button type="button" className={PILL} aria-label="Close On-Duty Staff" onClick={onClose}>Close</button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
          {error ? <ErrorState message={error} onRetry={onRetry} /> : loading ? <TableSkeleton columns={3} /> : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className={TABLE}>
                <thead><tr><th>Staff Member</th><th>Role / Department</th><th>Today's Shift</th></tr></thead>
                <tbody>
                  {staff.length === 0 ? <tr><td colSpan="3"><EmptyState message="No staff are currently on duty." /></td></tr> : staff.map((member) => (
                    <tr key={member.userId}>
                      <td className="font-bold text-ink">{member.name}</td>
                      <td>{member.role}<span className="block text-[12px] text-muted">{member.department}</span></td>
                      <td className="text-[12px] text-primary">{member.shift}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
