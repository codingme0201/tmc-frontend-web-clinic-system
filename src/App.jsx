import './App.css'
import { useAppContext } from './context/AppContext'
import { AppProvider } from './context/AppProvider'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Consultations from './pages/Consultations'
import Login from './pages/Login'
import PlaceholderPage from './pages/PlaceholderPage'
import { pageContent } from './lib/navigation'

// Only pages with a built-out UI need an entry here; anything else
// falls back to PlaceholderPage automatically.
const pageComponents = {
  dashboard: Dashboard,
  appointments: Appointments,
  consultations: Consultations,
}

function AppContent() {
  const { activePage, isAuthenticated } = useAppContext()

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
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
