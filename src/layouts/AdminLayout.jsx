import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function AdminLayout({ children }) {
  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="admin-main">
        <Topbar />
        <main className="content-area">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout
