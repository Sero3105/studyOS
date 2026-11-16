import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../ui/button'
import { Field, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import { useTimer } from '../../context/useTimer'
import { useLanguage } from '../../i18n/useLanguage'
import type { Focus } from '../../services/sessionService'

const FOCUS: Focus[] = [1, 2, 3]

/**
 * A fine blocco: com'era il focus e cosa hai fatto, in una riga. Va nella nota del blocco
 * (storico) e nel riepilogo della seduta. Tutto facoltativo: "Salta" chiude senza salvare.
 */
function BlockPrompt() {
  const { t } = useLanguage()
  const { rateBlock } = useTimer()
  const [focus, setFocus] = useState<Focus | null>(null)
  const [note, setNote] = useState('')

  const save = (event: FormEvent) => {
    event.preventDefault()
    rateBlock(focus, note)
  }

  return (
    <form className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4" onSubmit={save}>
      <p className="text-sm font-medium">{t('timer.focusQuestion')}</p>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        value={focus === null ? '' : String(focus)}
        onValueChange={(value) => setFocus(value ? (Number(value) as Focus) : null)}
        aria-label={t('session.focus')}
        className="w-full [&>*]:flex-1"
      >
        {FOCUS.map((value) => (
          <ToggleGroupItem key={value} value={String(value)} className="data-[state=on]:bg-accent">{t(`session.focus.${value}`)}</ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Field>
        <FieldLabel htmlFor="block-note">{t('sitting.blockNote')} <span className="font-normal text-muted-foreground">{t('common.optional')}</span></FieldLabel>
        <Input id="block-note" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder={t('sitting.blockNotePlaceholder')} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => rateBlock(null, '')}>{t('timer.skip')}</Button>
        <Button type="submit" variant="secondary" disabled={focus === null && !note.trim()}>{t('sitting.saveBlock')}</Button>
      </div>
    </form>
  )
}

export default BlockPrompt
