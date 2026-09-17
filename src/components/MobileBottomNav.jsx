import Icon from './Icon'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { useAppointments } from '../hooks/useAppointments'

const PRIMARY_TABS = [
  { id: 'dashboard', label: 'Home', icon: 'grid', permission: 'dashboard.view' },
  { id: 'appointments', label: 'Appts', icon: 'calendarCheck', permission: 'appointments.view' },
  { id: 'consultations', label: 'Consults', icon: 'stethoscope', permission: 'consultations.view' },
  { id: 'patients', label: 'Patients', icon: 'users', permission: 'patients.view' },
]

function MobileBottomNav({ onOpenMenu }) {
  const { activePage, navigate } = useAppContext()
  const { can } = useAuth()
  const { unreadCount } = useNotifications('bottomNav')
  const { data: appointments } = useAppointments('bottomNav')

  const pendingCount = (appointments || []).filter(
    (a) => a.status === 'Pending' || a.status === 'Under Review',
  ).length

  // Check if current page is in secondary menu
  const isSecondaryActive = !PRIMARY_TABS.some((tab) => tab.id === activePage)

  const handleTabClick = (tabId) => {
    navigate(tabId)
    // Smoothly scroll window / main area to top on mobile tab switch
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 desktop:hidden bg-white/92 backdrop-blur-2xl border-t border-[#d8e6e2]/80 shadow-[0_-8px_30px_rgba(18,57,59,0.08)] pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 px-2"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-[480px] mx-auto">
        {PRIMARY_TABS.map((tab) => {
          if (tab.permission && !can(tab.permission)) return null
          const isActive = activePage === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center min-w-[58px] py-1 px-2 rounded-xl transition-all duration-150 active:scale-90 ${
                isActive
                  ? 'text-primary font-extrabold'
                  : 'text-muted-soft hover:text-ink font-semibold'
              }`}
            >
              <div
                className={`relative grid size-8 place-items-center rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-primary/12 shadow-2xs scale-105' : 'bg-transparent'
                }`}
              >
                <Icon name={tab.icon} size={isActive ? 20 : 19} />
                {tab.id === 'appointments' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-accent text-[9.5px] font-extrabold text-white ring-2 ring-white">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] tracking-tight mt-0.5 leading-tight">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 size-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}

        {/* Menu / More button */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open clinic menu"
          className={`relative flex flex-col items-center justify-center min-w-[58px] py-1 px-2 rounded-xl transition-all duration-150 active:scale-90 ${
            isSecondaryActive
              ? 'text-primary font-extrabold'
              : 'text-muted-soft hover:text-ink font-semibold'
          }`}
        >
          <div
            className={`relative grid size-8 place-items-center rounded-xl transition-all duration-200 ${
              isSecondaryActive ? 'bg-primary/12 shadow-2xs scale-105' : 'bg-transparent'
            }`}
          >
            <Icon name="menu" size={isSecondaryActive ? 20 : 19} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-danger text-[9.5px] font-extrabold text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10.5px] tracking-tight mt-0.5 leading-tight">
            Menu
          </span>
          {isSecondaryActive && (
            <span className="absolute -bottom-0.5 size-1 rounded-full bg-primary" />
          )}
        </button>
      </div>
    </nav>
  )
}

export default MobileBottomNav
