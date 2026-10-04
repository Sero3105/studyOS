import { Outlet } from 'react-router-dom'

/**
 * App root component.
 *
 * Questo componente funge da "contenitore radice" dell'applicazione frontend.
 * L'uso di `Outlet` è tipico di React Router v6: permette al router di
 * renderizzare il componente figlio corretto in base al percorso attuale.
 *
 * In pratica, questo componente non mostra direttamente contenuti grafici, ma
 * lascia la renderizzazione ai componenti figli definiti nella configurazione
 * del router nel file `main.tsx`.
 */
function App() {
  return <Outlet />
}

export default App