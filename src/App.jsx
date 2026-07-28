import './App.css'
import { AppProvider, useAppContext } from './context/AppContext'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import PlaceholderPage from './pages/PlaceholderPage'
import { pageContent } from './lib/mockData'

// Only pages with a built-out UI need an entry here; anything else
// falls back to PlaceholderPage automatically.
const pageComponents = {
  dashboard: Dashboard,
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
