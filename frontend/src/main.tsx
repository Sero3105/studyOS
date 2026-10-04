import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import App from './App'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import TimerPage from './pages/TimerPage'
import './styles/index.css'

/**
 * Configurazione delle route dell'applicazione.
 *
 * `createBrowserRouter` crea un router basato sulla history del browser.
 * La struttura annidata permette di avere un layout globale (`AppLayout`)
 * condiviso da tutte le pagine dentro una root route (`App`).
 *
 * Esempio di flusso:
 * - `/` -> DashboardPage
 * - `/timer` -> TimerPage
 *
 * Il layout `AppLayout` è usato per mostrare la sidebar e il contenuto principale,
 * mentre i singoli componenti di pagina cambiano in base al route.
 */
const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: <DashboardPage />,
          },
          {
            path: '/timer',
            element: <TimerPage />,
          },
        ],
      },
    ],
  },
])

// Inizializzazione dell'applicazione React nel DOM.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)