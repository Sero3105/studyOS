import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { enUS, it } from 'react-day-picker/locale'
import { cn } from '@/lib/utils'
import { useLanguage } from '../../i18n/useLanguage'
import { isoDay, parseDay, todayIso } from '../../utils/dates'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DatePickerProps {
  value: string
  onChange: (isoDate: string) => void
  id?: string
  min?: string
  max?: string
  /** Senza `required` il calendario offre anche "Nessuna data". */
  required?: boolean
  placeholder?: string
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
}

/**
 * Campo data con calendario a tema (Popover + Calendar di shadcn) al posto di
 * `<input type="date">`. Settimana da lunedì; tastiera gestita da react-day-picker.
 */
function DatePicker({ value, onChange, id, min, max, required, placeholder, className, ...rest }: DatePickerProps) {
  const { t, locale, language } = useLanguage()
  const [open, setOpen] = useState(false)
  const today = todayIso()
  const selected = value ? parseDay(value) : undefined
  const fullLabel = (day: string) =>
    new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseDay(day))
  const shown = value
    ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(parseDay(value))
    : placeholder ?? t('date.choose')
  const outOfRange = (day: string) => (min !== undefined && day < min) || (max !== undefined && day > max)

  const pick = (day: string) => {
    if (outOfRange(day)) return
    onChange(day)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground', className)}
          aria-describedby={rest['aria-describedby']}
          aria-label={rest['aria-label'] ? `${rest['aria-label']}: ${value ? fullLabel(value) : t('date.clear')}` : undefined}
        >
          <CalendarDays data-icon="inline-start" aria-hidden="true" />
          <span className="truncate">{shown}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" aria-label={t('date.dialog')}>
        <Calendar
          mode="single"
          className="[--cell-size:--spacing(9)]"
          locale={language === 'it' ? it : enUS}
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected ?? (max && today > max ? parseDay(max) : undefined)}
          disabled={[
            ...(min ? [{ before: parseDay(min) }] : []),
            ...(max ? [{ after: parseDay(max) }] : []),
          ]}
          onSelect={(date) => { if (date) pick(isoDay(date)) }}
          autoFocus
        />
        <div className="flex gap-1 border-t p-2">
          <Button variant="ghost" size="sm" disabled={outOfRange(today)} onClick={() => pick(today)}>
            {t('common.today')}
          </Button>
          {!required && value && (
            <Button variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false) }}>
              {t('date.clear')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
