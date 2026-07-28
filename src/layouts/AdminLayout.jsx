const navSections = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'grid' }],
  },
  {
    label: 'Clinic',
    items: [
      { id: 'appointments', label: 'Appointments', icon: 'calendarCheck' },
      { id: 'consultations', label: 'Consultations', icon: 'stethoscope' },
      { id: 'medicalRecords', label: 'Medical Records', icon: 'folderHeart' },
      { id: 'medicalCertificates', label: 'Medical Certificates', icon: 'certificate' },
      { id: 'prescriptions', label: 'Prescriptions', icon: 'pill' },
    ],
  },
  {
    items: [{ id: 'patients', label: 'Patients', icon: 'users' }],
  },
  {
    label: 'Schedules',
    items: [
      { id: 'staffSchedule', label: 'Doctor/Nurse Schedule', icon: 'clipboardClock' },
      { id: 'clinicCalendar', label: 'Clinic Calendar', icon: 'calendarDays' },
    ],
  },
  {
    items: [
      { id: 'reports', label: 'Reports', icon: 'barChart' },
      { id: 'notifications', label: 'Notifications', icon: 'bell' },
      { id: 'users', label: 'User Management', icon: 'shieldUser' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settingsAudit', label: 'Settings Audit Logs', icon: 'settings' },
      { id: 'rolesPermissions', label: 'Roles & Permissions', icon: 'key' },
    ],
  },
]

function Icon({ name }) {
  return (
    <span className={`nav-icon nav-icon-${name}`} aria-hidden="true">
      <span />
    </span>
  )
}

function AdminLayout({ activePage, onNavigate, onLogout, children }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="brand-block">
          <div className="brand-mark">TC</div>
          <div>
            <strong>TMC CareLink</strong>
            <span>Clinic Administration</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section, sectionIndex) => (
            <div className="nav-section" key={section.label ?? sectionIndex}>
              {section.label ? <p className="nav-section-label">{section.label}</p> : null}
              {section.items.map((item) => (
                <button
                  type="button"
                  className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button type="button" className="logout-button" onClick={onLogout}>
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">Trinidad Municipal College</p>
            <h1>TMC CareLink Admin</h1>
          </div>
          <div className="topbar-actions">
            <button type="button" aria-label="Search">
              <Icon name="search" />
            </button>
            <button type="button" aria-label="Notifications">
              <Icon name="bell" />
            </button>
            <div className="admin-profile" aria-label="Signed in administrator">
              <span>AD</span>
            </div>
          </div>
        </header>

        <main className="content-area">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout
