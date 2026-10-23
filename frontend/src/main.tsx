import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import App from './App'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TimerPage from './pages/TimerPage'
import ExamsPage from './pages/ExamsPage'
import SubjectsPage from './pages/SubjectsPage'
import PlannerPage from './pages/PlannerPage'
import HistoryPage from './pages/HistoryPage'
import GoalsPage from './pages/GoalsPage'
import StatisticsPage from './pages/StatisticsPage'
import SettingsPage from './pages/SettingsPage'
import CalendarPage from './pages/CalendarPage'
import SharedPlanPage from './pages/SharedPlanPage'
import { LanguageProvider } from './i18n/LanguageProvider'
import { AuthProvider } from './context/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/index.css'

/**
 * Configurazione delle route dell'applicazione.
 *
 * `createBrowserRouter` crea un router basato sulla history del browser.
 * La struttura annidata permette di avere un layout globale (`AppLayout`)
 * condiviso da tutte le pagine dentro una root route (`App`).
 *
 * Esempio di flusso:
 * - `/dashboard` -> DashboardPage
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
        path: '/',
        element: <Navigate to="/login" replace />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      { path: '/shared/:token', element: <SharedPlanPage /> },
      {
        element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/timer',
            element: <TimerPage />,
          },
          { path: '/exams', element: <ExamsPage /> },
          { path: '/subjects', element: <SubjectsPage /> },
          { path: '/planner', element: <PlannerPage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/history', element: <HistoryPage /> },
          { path: '/goals', element: <GoalsPage /> },
          { path: '/statistics', element: <StatisticsPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
])

// Inizializzazione dell'applicazione React nel DOM.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)
