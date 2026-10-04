import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

/**
 * Layout principale dell'applicazione.
 *
 * Questo componente definisce la struttura grafica comune a tutte le pagine:
 * - una sidebar di navigazione a sinistra,
 * - un'area centrale dove viene renderizzato il contenuto della route corrente
 *   tramite `Outlet`.
 *
 * In React Router v6, `Outlet` è il punto di inserimento per i componenti figli
 * di una route. È il modo più pulito per costruire layout annidati.
 */
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