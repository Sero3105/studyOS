import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Configurazione di Vite per il frontend React.
 *
 * Vite è lo strumento di build e dev server usato dal progetto. In questa
 * configurazione si attiva il plugin ufficiale per React (`@vitejs/plugin-react`),
 * che abilita supporto per JSX/TSX, Fast Refresh e ottimizzazioni del bundling.
 *
 * In un progetto reale qui possono essere aggiunte configurazioni come:
 * - alias dei path,
 * - proxy verso il backend,
 * - configurazioni di build per produzione,
 * - impostazioni di preview e port del dev server.
 */
export default defineConfig({
  plugins: [react()],
})
