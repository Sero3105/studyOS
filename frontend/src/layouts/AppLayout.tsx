import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout