import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import AdminLayout from './layouts/AdminLayout'
import AuthLoadingScreen from './components/AuthLoadingScreen'
import TableSkeleton from './components/skeletons/TableSkeleton'
import { ErrorState } from './components/AsyncState'
import { navSections, pageContent } from './lib/navigation'
import { PANEL } from './lib/ui'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Appointments = lazy(() => import('./pages/Appointments'))
const Consultations = lazy(() => import('./pages/Consultations'))
const MedicalRecords = lazy(() => import('./pages/MedicalRecords'))
const MedicalCertificates = lazy(() => import('./pages/MedicalCertificates'))
const Prescriptions = lazy(() => import('./pages/Prescriptions'))
const Patients = lazy(() => import('./pages/Patients'))
const RolesPermissions = lazy(() => import('./pages/RolesPermissions'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const Login = lazy(() => import('./pages/Login'))
const StaffSchedule = lazy(() => import('./pages/StaffSchedule'))
const ClinicStaff = lazy(() => import('./pages/ClinicStaff'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Reports = lazy(() => import('./pages/Reports'))
const SettingsAudit = lazy(() => import('./pages/SettingsAudit'))
const AuditLogs = lazy(() => import('./pages/AuditLogs'))
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'))

// Only pages with a built-out UI need an entry here; anything else
// falls back to PlaceholderPage automatically.
const pageComponents = {
  dashboard: Dashboard,
  appointments: Appointments,
  consultations: Consultations,
  medicalRecords: MedicalRecords,
  medicalCertificates: MedicalCertificates,
  prescriptions: Prescriptions,
  patients: Patients,
  staffSchedule: StaffSchedule,
  clinicStaff: ClinicStaff,
  notifications: Notifications,
  reports: Reports,
  rolesPermissions: RolesPermissions,
  users: UserManagement,
  settingsAudit: SettingsAudit,
  auditLogs: AuditLogs,
}

/**
 * Authenticated app shell (protected route).
 *
 * Waits for the persisted Sanctum session check before rendering anything,
 * redirects unauthenticated visitors to /login, then renders the admin
 * layout with the matched nested page route.
 */
function ProtectedLayout() {
  const { isAuthenticated, authLoading } = useAuth()

  if (authLoading) return <AuthLoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}

/** Sign-in route — authenticated users bounce straight to the dashboard. */
function LoginRoute() {
  const { isAuthenticated, authLoading } = useAuth()

  if (authLoading) return <AuthLoadingScreen />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <Login />
    </Suspense>
  )
}

/** Renders the page matching the current route segment (e.g. /#/appointments). */
function ModulePage() {
  const { pageId } = useParams()
  const { can, userRole } = useAuth()
  const page = pageContent[pageId] ?? pageContent.dashboard
  const PageComponent = pageComponents[pageId] ?? PlaceholderPage
  const navItem = navSections.flatMap((section) => section.items).find((item) => item.id === pageId)

  if ((navItem?.permission && !can(navItem.permission)) || (navItem?.adminOnly && userRole !== 'admin')) {
    return (
      <div className={PANEL}>
        <ErrorState message="You do not have access to this page." />
      </div>
    )
  }

  return (
    <Suspense fallback={<TableSkeleton columns={6} />}>
      <PageComponent page={page} />
    </Suspense>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <AppProvider>
            <Toaster richColors position="bottom-right" toastOptions={{ style: { fontWeight: 600 } }} />
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<ProtectedLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path=":pageId" element={<ModulePage />} />
              </Route>
            </Routes>
          </AppProvider>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App
