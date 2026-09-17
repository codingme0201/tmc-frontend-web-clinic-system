import {
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardClock,
  Download,
  FileBadge,
  FolderHeart,
  Key,
  LayoutGrid,
  LogOut,
  Menu,
  Pill,
  ScrollText,
  Search,
  Settings,
  ShieldUser,
  Sparkles,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'

// Icon names used by navigation config (lib/navigation.js) and the shell.
const ICON_MAP = {
  grid: LayoutGrid,
  calendarCheck: CalendarCheck,
  stethoscope: Stethoscope,
  folderHeart: FolderHeart,
  certificate: FileBadge,
  pill: Pill,
  users: Users,
  clipboardClock: ClipboardClock,
  calendarDays: CalendarDays,
  barChart: BarChart3,
  bell: Bell,
  shieldUser: ShieldUser,
  settings: Settings,
  key: Key,
  logout: LogOut,
  download: Download,
  scrollText: ScrollText,
  menu: Menu,
  close: X,
  x: X,
  chevronRight: ChevronRight,
  sparkles: Sparkles,
  check: Check,
  search: Search,
}

/**
 * Renders a Lucide icon by name. Fits into a fixed 20px slot (the same size
 * the old CSS-drawn nav icons occupied) so sidebar alignment is unchanged.
 */
function Icon({ name, size = 18 }) {
  const LucideIcon = ICON_MAP[name] ?? LayoutGrid
  return (
    <span className="inline-grid size-5 shrink-0 place-items-center">
      <LucideIcon size={size} strokeWidth={1.9} aria-hidden="true" />
    </span>
  )
}

export default Icon
