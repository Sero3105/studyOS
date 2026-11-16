import { Trash2 } from 'lucide-react'
import { Button } from './button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

/** Elimina con un clic: la sicurezza è il toast "Annulla" (vedi UndoProvider), non una doppia conferma. */
function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onDelete} aria-label={label}>
          <Trash2 aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default DeleteButton
