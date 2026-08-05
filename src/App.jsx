import './App.css'
import { useAppContext, AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Consultations from './pages/Consultations'
import MedicalRecords from './pages/MedicalRecords'
import RolesPermissions from './pages/RolesPermissions'
import Login from './pages/Login'
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
  rolesPermissions: RolesPermissions,
}

function AppContent() {
  const { activePage } = useAppContext()
  const { isAuthenticated, authLoading } = useAuth()

  // While the persisted token is validated against the API, show an
  // app-shell skeleton instead of flashing the login page or the app.
  if (authLoading) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return <Login />
  }

  const page = pageContent[activePage] ?? pageContent.dashboard
  const PageComponent = pageComponents[activePage] ?? PlaceholderPage

  return (
    <AdminLayout>
      <PageComponent page={page} />
    </AdminLayout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}

export default App
