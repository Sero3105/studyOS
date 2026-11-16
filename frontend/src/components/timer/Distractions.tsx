import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ListPlus, Plus, X } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Field, FieldDescription, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { useTimer } from '../../context/useTimer'
import { useLanguage } from '../../i18n/useLanguage'
import { createTask } from '../../services/taskService'
import { DISTRACTION_MAX } from '../../utils/sitting'

/**
 * Durante il blocco: un pensiero che distrae si scrive qui e si torna a studiare.
 * Il timer non si ferma; il numero di distrazioni finisce sul blocco.
 */
export function DistractionCapture() {
  const { t } = useLanguage()
  const { sitting, addDistraction } = useTimer()
  const [draft, setDraft] = useState('')
  const [noted, setNoted] = useState(false)
  if (!sitting) return null

  const add = (event: FormEvent) => {
    event.preventDefault()
    addDistraction(draft)
    setDraft('')
    setNoted(true)
  }

  return (
    <Card size="sm">
      <CardContent>
        <form onSubmit={add}>
          <Field>
            <FieldLabel htmlFor="distraction-input">{t('sitting.distractionLabel')}</FieldLabel>
            <div className="flex gap-2">
              <Input id="distraction-input" value={draft} maxLength={DISTRACTION_MAX}
                onChange={(e) => { setDraft(e.target.value); setNoted(false) }} placeholder={t('sitting.distractionPlaceholder')} />
              <Button type="submit" variant="secondary" disabled={!draft.trim()}>
                <Plus data-icon="inline-start" aria-hidden="true" /> {t('sitting.note')}
              </Button>
            </div>
            <FieldDescription role="status" className="min-h-4">{noted ? t('sitting.distractionNoted') : ''}</FieldDescription>
          </Field>
        </form>
      </CardContent>
    </Card>
  )
}

/** Le distrazioni annotate: in pausa e nel riepilogo, ognuna può diventare un task del Planner. */
export function DistractionList() {
  const { t } = useLanguage()
  const { sitting, removeDistraction } = useTimer()
  const [created, setCreated] = useState<string[]>([])
  const [error, setError] = useState(false)
  if (!sitting?.distractions.length) return null

  const toTask = (text: string) => {
    setError(false)
    createTask({ title: text.slice(0, 200), priority: 'medium' })
      .then(() => setCreated((c) => [...c, text]))
      .catch(() => setError(true))
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle><h2 id="distractions-title">{t('sitting.distractionsTitle')}</h2></CardTitle>
        <CardAction className="font-mono text-xs text-muted-foreground tabular-nums">{sitting.distractions.length}</CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <ul className="flex flex-col divide-y" aria-labelledby="distractions-title">
          {sitting.distractions.map((d, index) => (
            <li className="flex items-center gap-2 py-2 first:pt-0 last:pb-0" key={`${index}-${d.text}`}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm break-words">{d.text}</span>
                <span className="text-xs text-muted-foreground">{t('sitting.duringBlock', { block: d.block })}</span>
              </span>
              {created.includes(d.text) ? (
                <Badge variant="success"><Check data-icon="inline-start" aria-hidden="true" /> {t('sitting.taskCreated')}</Badge>
              ) : (
                <Button variant="ghost" size="icon-sm" onClick={() => toTask(d.text)} aria-label={t('sitting.toTask', { title: d.text })} title={t('sitting.toTaskShort')}>
                  <ListPlus aria-hidden="true" />
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" onClick={() => removeDistraction(index)} aria-label={t('sitting.removeDistraction')} title={t('sitting.removeDistraction')}>
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        {error && <p className="text-sm text-destructive" role="alert">{t('planner.saveError')}</p>}
      </CardContent>
    </Card>
  )
}
