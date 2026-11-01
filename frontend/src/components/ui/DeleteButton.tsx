import { Trash2 } from 'lucide-react'

/** Elimina con un clic: la sicurezza è il toast "Annulla" (vedi UndoProvider), non una doppia conferma. */
function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <button className="icon-btn icon-btn-danger" type="button" onClick={onDelete} aria-label={label} title={label}>
      <Trash2 aria-hidden="true" />
    </button>
  )
}

export default DeleteButton
