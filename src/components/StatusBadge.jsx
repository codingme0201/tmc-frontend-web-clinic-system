// Status -> Tailwind classes, replicating the original badge palette.
// Keys match the status values lowercased with spaces replaced by dashes.
const BADGE_CLASSES = {
  pending: 'bg-[#fff2d5] text-[#815400]',
  confirmed: 'bg-[#dff6dd] text-[#1e5a1b]',
  'on-duty': 'bg-[#dff6dd] text-[#1e5a1b]',
  'in-clinic': 'bg-[#dff6dd] text-[#1e5a1b]',
  active: 'bg-[#dff6dd] text-[#1e5a1b]',
  mild: 'bg-[#dff6dd] text-[#1e5a1b]',
  break: 'bg-[#ffebe0] text-[#a33c12]',
  'off-duty': 'bg-[#f0f3f2] text-[#5d6e6c]',
  cancelled: 'bg-[#f0f3f2] text-[#5d6e6c]',
  inactive: 'bg-[#f0f3f2] text-[#5d6e6c]',
  archived: 'bg-[#f0f3f2] text-[#5d6e6c]',
  completed: 'bg-[#e1f5fe] text-[#0d47a1]',
  resolved: 'bg-[#e1f5fe] text-[#0d47a1]',
  'under-review': 'bg-[#e8f0fe] text-[#1a56c4]',
  approved: 'bg-[#d8f5e3] text-[#157347]',
  rejected: 'bg-[#ffebe6] text-[#b3361f]',
  rescheduled: 'bg-[#efeafd] text-[#6b46c1]',
  scheduled: 'bg-[#e8f0fe] text-[#1a56c4]',
  issued: 'bg-[#dff6dd] text-[#1e5a1b]',
  void: 'bg-[#f0f3f2] text-[#5d6e6c]',
  'in-progress': 'bg-[#fff3d6] text-[#8a5a00]',
  moderate: 'bg-[#fff3d6] text-[#8a5a00]',
  severe: 'bg-[#ffebe0] text-[#a33c12]',
  discontinued: 'bg-[#ffebe0] text-[#a33c12]',
  'no-show': 'bg-[#ffebe6] text-[#b3361f]',
}

const DEFAULT_BADGE = 'bg-[#f0f3f2] text-[#5d6e6c]'

function StatusBadge({ status }) {
  const key = status ? status.toLowerCase().replace(/ /g, '-') : ''
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-current/20 px-2.5 py-0.5 text-[10.5px] sm:text-[11px] font-extrabold tracking-wide uppercase shadow-2xs ${BADGE_CLASSES[key] ?? DEFAULT_BADGE}`}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-75" />
      {status}
    </span>
  )
}

export default StatusBadge
