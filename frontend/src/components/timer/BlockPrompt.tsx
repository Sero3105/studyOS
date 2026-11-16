import { useState } from 'react'
import type { FormEvent } from 'react'
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
    <form className="panel timer-prompt block-prompt" onSubmit={save}>
      <p>{t('timer.focusQuestion')}</p>
      <div className="segmented" role="group" aria-label={t('session.focus')}>
        {FOCUS.map((value) => (
          <button key={value} type="button" aria-pressed={focus === value} onClick={() => setFocus(focus === value ? null : value)}>
            {t(`session.focus.${value}`)}
          </button>
        ))}
      </div>
      <label className="field block-prompt-note">
        <span className="field-label">{t('sitting.blockNote')} <em>{t('common.optional')}</em></span>
        <input value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder={t('sitting.blockNotePlaceholder')} />
      </label>
      <div className="timer-prompt-actions">
        <button className="btn btn-ghost" type="button" onClick={() => rateBlock(null, '')}>{t('timer.skip')}</button>
        <button className="btn btn-secondary" type="submit" disabled={focus === null && !note.trim()}>{t('sitting.saveBlock')}</button>
      </div>
    </form>
  )
}

export default BlockPrompt
