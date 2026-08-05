import {
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  ClipboardClock,
  FileBadge,
  FolderHeart,
  Key,
  LayoutGrid,
  LogOut,
  Pill,
  Settings,
  ShieldUser,
  Stethoscope,
  Users,
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
}

/**
 * Renders a Lucide icon by name. Keeps the `nav-icon` class (fixed 20px slot)
 * so the sidebar layout is unchanged; the `.nav-icon-lucide` CSS override
 * neutralises the old CSS-drawn shapes.
 */
function Icon({ name, size = 18 }) {
  const LucideIcon = ICON_MAP[name] ?? LayoutGrid
  return (
    <span className="nav-icon nav-icon-lucide">
      <LucideIcon size={size} strokeWidth={1.9} aria-hidden="true" />
    </span>
  )
}

export default Icon
