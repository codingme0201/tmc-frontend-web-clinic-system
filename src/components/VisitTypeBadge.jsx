import { VISIT_FOLLOW_UP } from '../lib/clinic'

/** "Follow-up" / "New" marker so the doctor sees returning patients at a glance. */
export default function VisitTypeBadge({ visitType, compact = false }) {
  const followUp = visitType === VISIT_FOLLOW_UP
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${
        followUp ? 'bg-[#efeafd] text-[#6b46c1]' : 'bg-[#e8f5e9] text-[#2e7d32]'
      }`}
      title={visitType}
    >
      {followUp ? '↺ ' : ''}
      {followUp ? (compact ? 'Follow-up' : 'Follow-up Visit') : compact ? 'New' : 'New Consultation'}
    </span>
  )
}
