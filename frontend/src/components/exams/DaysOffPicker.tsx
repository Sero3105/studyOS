import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { enUS, it } from 'react-day-picker/locale'
import { Button } from '../ui/button'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { useLanguage } from '../../i18n/useLanguage'
import { isoDay, parseDay } from '../../utils/dates'

interface DaysOffPickerProps {
  id: string
  value: string[]
  min: string
  max: string
  onChange: (days: string[]) => void
}

/**
 * Giorni liberi di un esame scelti in una volta sola: calendario a selezione multipla che resta aperto mentre si
 * cliccano le date. La scelta si salva con "Fatto" o chiudendo il calendario, non a ogni clic.
 */
function DaysOffPicker({ id, value, min, max, onChange }: DaysOffPickerProps) {
  const { t, language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(value)

  const toggle = (next: boolean) => {
    if (next) setDraft(value)
    else if (draft.join() !== value.join()) onChange(draft)
    setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className="w-full justify-start font-normal sm:w-64">
          <CalendarDays data-icon="inline-start" aria-hidden="true" />
          {value.length ? t(value.length === 1 ? 'plan.daysOffChosenOne' : 'plan.daysOffChosen', { count: value.length }) : t('plan.addDayOff')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" aria-label={t('plan.daysOffDialog')}>
        <Calendar
          mode="multiple"
          className="[--cell-size:--spacing(9)]"
          locale={language === 'it' ? it : enUS}
          weekStartsOn={1}
          selected={draft.map(parseDay)}
          defaultMonth={parseDay(draft[0] ?? min)}
          disabled={[{ before: parseDay(min) }, { after: parseDay(max) }]}
          onSelect={(dates) => setDraft((dates ?? []).map(isoDay).sort())}
          autoFocus
        />
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <span className="px-1 text-xs text-muted-foreground" aria-live="polite">{t(draft.length === 1 ? 'plan.daysOffSelectedOne' : 'plan.daysOffSelected', { count: draft.length })}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled={!draft.length} onClick={() => setDraft([])}>{t('plan.daysOffClear')}</Button>
            <Button size="sm" onClick={() => toggle(false)}>{t('plan.daysOffDone')}</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DaysOffPicker
