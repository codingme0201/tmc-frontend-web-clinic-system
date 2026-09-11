import { HashRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Consultations from './pages/Consultations'
import MedicalRecords from './pages/MedicalRecords'
import MedicalCertificates from './pages/MedicalCertificates'
import Prescriptions from './pages/Prescriptions'
import Patients from './pages/Patients'
import RolesPermissions from './pages/RolesPermissions'
import UserManagement from './pages/UserManagement'
import Login from './pages/Login'
import StaffSchedule from './pages/StaffSchedule'
import ClinicCalendar from './pages/ClinicCalendar'
import Notifications from './pages/Notifications'
import Reports from './pages/Reports'
import SettingsAudit from './pages/SettingsAudit'
import PlaceholderPage from './pages/PlaceholderPage'
import AuthLoadingScreen from './components/AuthLoadingScreen'
import { pageContent } from './lib/navigation'

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
  clinicCalendar: ClinicCalendar,
  notifications: Notifications,
  reports: Reports,
  rolesPermissions: RolesPermissions,
  users: UserManagement,
  settingsAudit: SettingsAudit,
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
  return <Login />
}

/** Renders the page matching the current route segment (e.g. /#/appointments). */
function ModulePage() {
  const { pageId } = useParams()
  const page = pageContent[pageId] ?? pageContent.dashboard
  const PageComponent = pageComponents[pageId] ?? PlaceholderPage
  return <PageComponent page={page} />
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
