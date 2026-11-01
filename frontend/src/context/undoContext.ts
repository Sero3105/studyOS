import { createContext, useContext } from 'react'

export interface UndoContextValue {
  /**
   * Toglie subito un elemento (lo fa il chiamante), mostra "Annulla" per qualche secondo e solo
   * dopo esegue `run` (la DELETE). Annulla, o un errore di `run`, chiama `restore`.
   */
  undoable: (message: string, run: () => Promise<unknown>, restore: () => void) => void
}

export const UndoContext = createContext<UndoContextValue | undefined>(undefined)

export function useUndo(): UndoContextValue {
  const context = useContext(UndoContext)
  if (context === undefined) throw new Error('useUndo deve essere utilizzato dentro UndoProvider')
  return context
}
