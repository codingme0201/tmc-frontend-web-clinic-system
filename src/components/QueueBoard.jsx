import { useMemo, useState } from 'react'
import { formatDate } from '../lib/format'
import { roleLabel } from '../lib/clinic'
import { KICKER, SELECT_INPUT, BTN_SUCCESS, BTN_INFO, BTN_NEUTRAL, BTN_DANGER, BTN_PRIMARY } from '../lib/ui'
import StatusBadge from './StatusBadge'
import VisitTypeBadge from './VisitTypeBadge'
import RefreshingBadge from './RefreshingBadge'
import { EmptyState, ErrorState } from './AsyncState'
import ListSkeleton from './skeletons/ListSkeleton'

const SECTION = 'rounded-xl border border-line-strong/80 bg-white/70 p-3 sm:p-4'
const SECTION_TITLE = 'm-0 mb-2.5 flex items-center justify-between gap-2 text-[12px] font-extrabold uppercase tracking-wider text-muted-soft'
const ROW = 'flex flex-col sm:grid sm:grid-cols-[64px_minmax(0,1fr)_auto] items-start sm:items-center gap-2 sm:gap-3 rounded-lg border border-line bg-white p-2.5 sm:p-3'

/**
 * Today's patient queue, served first in, first out.
 *
 * Checked-in patients wait in their assigned doctor's line (unassigned
 * patients share one line) ordered by scheduled time slot, then check-in
 * order. Only the head of each line can be called in; the API enforces the
 * same rule.
 */
export default function QueueBoard({
  queue,
  canCheckIn = false,
  canServe = false,
  canApprove = false,
  busyId = null,
  onCheckIn,
  onUndoCheckIn,
  onServe,
  onApprove,
  onNoShow,
  onOpenConsultations,
}) {
  const { entries, meta, isLoading, error, refetch, isRefetching } = queue
  const [lineFilter, setLineFilter] = useState('All')

  const lines = useMemo(() => {
    const map = new Map()
    entries.forEach((e) => map.set(e.staffId ? String(e.staffId) : 'none', e.staffId ? e.staff : 'Unassigned'))
    return [...map.entries()]
  }, [entries])

  const visible = useMemo(
    () =>
      lineFilter === 'All'
        ? entries
        : entries.filter((e) => (e.staffId ? String(e.staffId) : 'none') === lineFilter),
    [entries, lineFilter],
  )

  const group = (status) => visible.filter((e) => e.queueStatus === status)
  const inConsultation = group('In Consultation')
  const waiting = group('Waiting')
  const expected = group('Expected')
  const awaiting = group('Awaiting Approval')

  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (isLoading) return <ListSkeleton rows={4} />

  const doctorLine = (e) => (
    <span className="block text-[12px] text-muted">
      {e.staffId ? `${e.staff} · ${roleLabel(e.staffRole)}` : <span className="font-bold text-[#a33c12]">Unassigned doctor</span>}
    </span>
  )

  const patientLine = (e) => (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <strong className="truncate text-[13.5px] font-bold text-ink">{e.patient}</strong>
        <VisitTypeBadge visitType={e.visitType} compact />
      </div>
      <span className="block text-[12px] text-muted">
        {e.reference} · {e.type}
        {e.isFollowUp && e.previousConsultation ? ` · follow-up of ${e.previousConsultation.reference}` : ''}
      </span>
      {doctorLine(e)}
    </div>
  )

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 text-[11.5px] font-extrabold">
          <span className="rounded-full bg-[#fff3d6] px-2.5 py-1 text-[#8a5a00]">{meta?.waiting ?? 0} waiting</span>
          <span className="rounded-full bg-[#d8f5e3] px-2.5 py-1 text-[#157347]">{meta?.inConsultation ?? 0} in consultation</span>
          <span className="rounded-full bg-[#e8f0fe] px-2.5 py-1 text-[#1a56c4]">{meta?.expected ?? 0} expected</span>
          <span className="rounded-full bg-[#fff2d5] px-2.5 py-1 text-[#815400]">{meta?.awaitingApproval ?? 0} awaiting approval</span>
          <span className="rounded-full bg-[#e1f5fe] px-2.5 py-1 text-[#0d47a1]">{meta?.served ?? 0} served</span>
        </div>
        <div className="flex items-center gap-2">
          <RefreshingBadge refreshing={isRefetching && !isLoading} />
          <select className={SELECT_INPUT} value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} aria-label="Filter by doctor line">
            <option value="All">All doctor lines</option>
            {lines.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Now serving */}
      <section className={SECTION}>
        <h4 className={SECTION_TITLE}>Now in consultation</h4>
        {inConsultation.length === 0 ? (
          <p className="m-0 text-[12.5px] text-muted">No patient is currently being seen.</p>
        ) : (
          <div className="grid gap-2">
            {inConsultation.map((e) => (
              <div key={e.appointmentId} className={ROW}>
                <span className="inline-flex items-center justify-center rounded-md bg-[#d8f5e3] px-2 py-0.5 text-[12px] font-extrabold text-[#157347]">
                  {e.time}
                </span>
                {patientLine(e)}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] font-bold text-muted">{e.consultation?.reference}</span>
                  {onOpenConsultations && (
                    <button type="button" className={BTN_INFO} onClick={onOpenConsultations}>
                      Open
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Waiting line (FIFO) */}
      <section className={SECTION}>
        <h4 className={SECTION_TITLE}>
          <span>Waiting line — first in, first out</span>
          <span className="normal-case tracking-normal text-muted">earliest time slot, then arrival order</span>
        </h4>
        {waiting.length === 0 ? (
          <EmptyState message="No checked-in patients are waiting." />
        ) : (
          <div className="grid gap-2">
            {waiting.map((e) => {
              const isNext = e.linePosition === 1
              return (
                <div key={e.appointmentId} className={`${ROW} ${isNext ? 'border-primary/50 bg-primary/5' : ''}`}>
                  <div className="flex flex-col items-center">
                    <span className="text-[20px] font-extrabold leading-none text-ink">#{e.position}</span>
                    <span className="text-[10.5px] font-bold text-muted">Q-{e.queueNumber} · {e.time}</span>
                  </div>
                  {patientLine(e)}
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isNext ? (
                      <span className="rounded-md bg-primary px-2 py-0.5 text-[10.5px] font-extrabold uppercase text-white">Next</span>
                    ) : (
                      <span className="text-[11px] font-bold text-muted">{e.linePosition - 1} ahead</span>
                    )}
                    {canServe && (
                      <button
                        type="button"
                        className={BTN_SUCCESS}
                        disabled={!isNext || busyId === e.appointmentId}
                        title={isNext ? 'Start this patient’s consultation' : 'Patients ahead in this line must be served first'}
                        onClick={() => onServe?.(e)}
                      >
                        Call In
                      </button>
                    )}
                    {canCheckIn && (
                      <button type="button" className={BTN_NEUTRAL} disabled={busyId === e.appointmentId} onClick={() => onUndoCheckIn?.(e)}>
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Expected (approved, not yet arrived) */}
      <section className={SECTION}>
        <h4 className={SECTION_TITLE}>Expected today (not yet checked in)</h4>
        {expected.length === 0 ? (
          <p className="m-0 text-[12.5px] text-muted">Everyone scheduled today has arrived.</p>
        ) : (
          <div className="grid gap-2">
            {expected.map((e) => (
              <div key={e.appointmentId} className={ROW}>
                <span className="inline-flex items-center justify-center rounded-md bg-primary/10 px-2 py-0.5 text-[12px] font-extrabold text-primary">
                  {e.time}
                </span>
                {patientLine(e)}
                {canCheckIn && (
                  <div className="flex items-center gap-1.5">
                    <button type="button" className={BTN_PRIMARY} disabled={busyId === e.appointmentId} onClick={() => onCheckIn?.(e)}>
                      Check In
                    </button>
                    <button type="button" className={BTN_DANGER} disabled={busyId === e.appointmentId} onClick={() => onNoShow?.(e)}>
                      No-Show
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Awaiting approval */}
      {awaiting.length > 0 && (
        <section className={SECTION}>
          <h4 className={SECTION_TITLE}>Awaiting approval (today)</h4>
          <div className="grid gap-2">
            {awaiting.map((e) => (
              <div key={e.appointmentId} className={ROW}>
                <span className="inline-flex items-center justify-center rounded-md bg-[#fff2d5] px-2 py-0.5 text-[12px] font-extrabold text-[#815400]">
                  {e.time}
                </span>
                {patientLine(e)}
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={e.appointmentStatus} />
                  {canApprove && (
                    <button type="button" className={BTN_SUCCESS} disabled={busyId === e.appointmentId} onClick={() => onApprove?.(e)}>
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {meta?.date && <p className={`${KICKER} m-0`}>Queue for {formatDate(meta.date)} · refreshes automatically</p>}
    </div>
  )
}
