import './App.css'
import { useAppContext, AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Consultations from './pages/Consultations'
import MedicalRecords from './pages/MedicalRecords'
import Login from './pages/Login'
import PlaceholderPage from './pages/PlaceholderPage'
import { LoadingState } from './components/AsyncState'
import { pageContent } from './lib/navigation'

// Only pages with a built-out UI need an entry here; anything else
// falls back to PlaceholderPage automatically.
const pageComponents = {
  dashboard: Dashboard,
  appointments: Appointments,
  consultations: Consultations,
  medicalRecords: MedicalRecords,
}

function AppContent() {
  const { activePage } = useAppContext()
  const { isAuthenticated, authLoading } = useAuth()

  // While the persisted token is validated against the API, show a loading
  // state instead of flashing the login page.
  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <LoadingState label="Checking your session..." />
      </div>
    )
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
