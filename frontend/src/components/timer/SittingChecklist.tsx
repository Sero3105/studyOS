import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { useTimer } from '../../context/useTimer'
import { useLanguage } from '../../i18n/useLanguage'
import { CHECKLIST_MAX, ITEM_MAX } from '../../utils/sitting'

/**
 * Obiettivo e checklist della seduta: si spunta mentre si studia, si aggiunge una voce
 * quando salta fuori. Resta uguale nel riepilogo, dove le voci rimaste diventano task.
 */
function SittingChecklist() {
  const { t } = useLanguage()
  const { config, sitting, toggleItem, addItem } = useTimer()
  const [draft, setDraft] = useState('')
  if (!config || !sitting) return null
  const done = sitting.checklist.filter((item) => item.done).length

  const add = (event: FormEvent) => {
    event.preventDefault()
    addItem(draft)
    setDraft('')
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle><h2 id="sitting-checklist-title">{config.goal || t('sitting.checklist')}</h2></CardTitle>
        {sitting.checklist.length > 0 && <CardAction className="font-mono text-xs text-muted-foreground tabular-nums">{t('sitting.progress', { done, total: sitting.checklist.length })}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sitting.checklist.length > 0 && (
          <ul className="flex flex-col gap-1" aria-labelledby="sitting-checklist-title">
            {sitting.checklist.map((item, index) => (
              <li key={index}>
                <label className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50">
                  <Checkbox className="mt-0.5" checked={item.done} onCheckedChange={() => toggleItem(index)} />
                  <span className={cn('break-words', item.done && 'text-muted-foreground line-through')}>{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {sitting.checklist.length < CHECKLIST_MAX && (
          <form className="flex gap-2" onSubmit={add}>
            <label className="sr-only" htmlFor="sitting-add-item">{t('sitting.addItem')}</label>
            <Input id="sitting-add-item" value={draft} maxLength={ITEM_MAX}
              onChange={(e) => setDraft(e.target.value)} placeholder={t('sitting.addItemPlaceholder')} />
            <Button type="submit" variant="secondary" disabled={!draft.trim()}>
              <Plus data-icon="inline-start" aria-hidden="true" /> {t('sitting.add')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default SittingChecklist
