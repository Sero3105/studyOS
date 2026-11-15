import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage'
import { addDays, parseDay, todayIso } from '../../utils/dates'

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
}

const POP_WIDTH = 304
const POP_HEIGHT = 360

function monthOf(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`
}

function addMonths(monthIso: string, months: number): string {
  const d = parseDay(monthIso)
  d.setMonth(d.getMonth() + months, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Campo data con calendario proprio, al posto di `<input type="date">`: il
 * calendario nativo non segue il tema e cambia da browser a browser.
 * Settimana da lunedì, oggi segnato, giorno scelto pieno in accento.
 * Tastiera: frecce per i giorni, PagSu/PagGiù per i mesi, Invio per
 * scegliere, Esc per chiudere.
 */
function DatePicker({ value, onChange, id, min, max, required, placeholder, ...rest }: DatePickerProps) {
  const { t, locale } = useLanguage()
  const [open, setOpen] = useState(false)
  const [focusDay, setFocusDay] = useState(value || todayIso())
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  // Il fuoco va sulla griglia solo all'apertura e con le frecce, mai dopo un clic su ‹ ›.
  const focusGrid = useRef(false)
  const today = todayIso()

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const below = rect.bottom + 6 + POP_HEIGHT <= window.innerHeight
    setPosition({
      top: below ? rect.bottom + 6 : Math.max(8, rect.top - 6 - POP_HEIGHT),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - POP_WIDTH - 8)),
    })
  }

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    const onMove = () => place()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!popRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Il fuoco segue il giorno attivo, così le frecce funzionano subito.
  useEffect(() => {
    if (!open || !focusGrid.current) return
    focusGrid.current = false
    popRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus()
  }, [open, focusDay])

  const outOfRange = (day: string) => (min !== undefined && day < min) || (max !== undefined && day > max)

  const pick = (day: string) => {
    if (outOfRange(day)) return
    onChange(day)
    close()
  }

  const toggle = () => {
    if (!open) {
      setFocusDay(value || (max && today > max ? max : today))
      focusGrid.current = true
    }
    setOpen((o) => !o)
  }

  const month = monthOf(focusDay)
  const firstCell = addDays(month, -((parseDay(month).getDay() + 6) % 7))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(firstCell, i))
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(parseDay(addDays(firstCell, i))))
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(parseDay(month))
  const fullLabel = (day: string) =>
    new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseDay(day))
  const shown = value
    ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(parseDay(value))
    : placeholder ?? t('date.choose')

  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      PageUp: () => addMonths(focusDay, -1).slice(0, 8) + focusDay.slice(8),
      PageDown: () => addMonths(focusDay, 1).slice(0, 8) + focusDay.slice(8),
      Home: () => addDays(focusDay, -((parseDay(focusDay).getDay() + 6) % 7)),
      End: () => addDays(focusDay, 6 - ((parseDay(focusDay).getDay() + 6) % 7)),
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    // Tab gira dentro il calendario: mesi, giorno attivo, Oggi, Nessuna data.
    if (event.key === 'Tab') {
      const items = Array.from(popRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled]):not([tabindex="-1"])') ?? [])
      const index = items.indexOf(document.activeElement as HTMLButtonElement)
      event.preventDefault()
      event.stopPropagation()
      items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus()
      return
    }
    if (!(event.target as HTMLElement).dataset.day) return
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    const next = move()
    // PagSu/PagGiù su un 31 cadono nel mese giusto, all'ultimo giorno valido.
    const first = next.slice(0, 8) + '01'
    const fixed = parseDay(next).getMonth() === parseDay(first).getMonth() ? next : addDays(addMonths(first, 1), -1)
    if (outOfRange(fixed)) return
    focusGrid.current = true
    setFocusDay(fixed)
  }

  return (
    <div className="datepicker">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`datepicker-trigger${value ? '' : ' is-empty'}`}
        aria-haspopup="dialog"
        aria-describedby={rest['aria-describedby']}
        aria-expanded={open}
        aria-label={rest['aria-label'] ? `${rest['aria-label']}: ${value ? fullLabel(value) : t('date.clear')}` : undefined}
        onClick={toggle}
      >
        <CalendarDays aria-hidden="true" />
        <span>{shown}</span>
      </button>
      {open && createPortal(
        <div
          ref={popRef}
          className="datepicker-pop"
          role="dialog"
          aria-label={t('date.dialog')}
          style={{ top: position.top, left: position.left }}
          onKeyDown={onGridKey}
        >
          <div className="datepicker-head">
            <span className="datepicker-month">{monthLabel}</span>
            <div className="datepicker-nav">
              <button type="button" className="icon-btn" aria-label={t('calendar.prevMonth')} onClick={() => setFocusDay(addMonths(month, -1))}>
                <ChevronLeft aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" aria-label={t('calendar.nextMonth')} onClick={() => setFocusDay(addMonths(month, 1))}>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="datepicker-grid" role="grid">
            {weekdays.map((d, i) => <span key={i} className="datepicker-weekday" aria-hidden="true">{d}</span>)}
            {cells.map((day) => (
              <button
                key={day}
                type="button"
                data-day={day}
                tabIndex={day === focusDay ? 0 : -1}
                className={[
                  'datepicker-day',
                  day.slice(0, 7) !== month.slice(0, 7) && 'is-outside',
                  day === today && 'is-today',
                  day === value && 'is-selected',
                ].filter(Boolean).join(' ')}
                aria-label={fullLabel(day)}
                aria-pressed={day === value}
                aria-current={day === today ? 'date' : undefined}
                disabled={outOfRange(day)}
                onClick={() => pick(day)}
              >
                {Number(day.slice(8))}
              </button>
            ))}
          </div>
          <div className="datepicker-foot">
            <button type="button" className="btn btn-ghost" disabled={outOfRange(today)} onClick={() => pick(today)}>
              {t('common.today')}
            </button>
            {!required && value && (
              <button type="button" className="btn btn-ghost" onClick={() => { onChange(''); close() }}>
                {t('date.clear')}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

export default DatePicker
