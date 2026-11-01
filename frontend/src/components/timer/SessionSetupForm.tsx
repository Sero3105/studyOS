import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Play } from 'lucide-react'
import type { StudySessionConfig } from './types'
import { getSubjects } from '../../services/subjectService'
import type { Subject } from '../../services/subjectService'
import { useLanguage } from '../../i18n/useLanguage'
import type { TranslationKey } from '../../i18n/translations'
import { LONG_BREAK_DEFAULTS } from '../../utils/pomodoro'
import { SESSION_KINDS } from '../../services/sessionService'
import type { SessionKind } from '../../services/sessionService'

interface SessionSetupFormProps {
  onSubmit: (config: StudySessionConfig) => void
  onCancel?: () => void
  showCancel?: boolean
}

/**
 * Durate rapide: scorciatoie per i ritmi di studio più comuni.
 * Restano modificabili nei campi sotto; "Personalizzata" lascia scrivere.
 */
const presets: { id: string; labelKey: TranslationKey; focus: number; rest: number }[] = [
  { id: '25-5', labelKey: 'timer.preset.pomodoro', focus: 25, rest: 5 },
  { id: '50-10', labelKey: 'timer.preset.long', focus: 50, rest: 10 },
  { id: '90-15', labelKey: 'timer.preset.deep', focus: 90, rest: 15 },
]

function SessionSetupForm({
  onSubmit,
  onCancel,
  showCancel = false,
}: SessionSetupFormProps) {
  const { t } = useLanguage()
  const [focusMinutes, setFocusMinutes] = useState('25')
  const [breakMinutes, setBreakMinutes] = useState('5')
  const [longBreakMinutes, setLongBreakMinutes] = useState(String(LONG_BREAK_DEFAULTS.longBreakMinutes))
  const [blocksBeforeLongBreak, setBlocksBeforeLongBreak] = useState(String(LONG_BREAK_DEFAULTS.blocksBeforeLongBreak))
  const [notes, setNotes] = useState('')
  const [kind, setKind] = useState<SessionKind>('study')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => setSubjects([]))
  }, [])

  const selectedSubject = subjects.find((s) => s.id === Number(subjectId))
  const selectedTopic = selectedSubject?.topics.find((t) => t.id === Number(topicId))
  const activePreset = presets.find(
    (preset) => String(preset.focus) === focusMinutes && String(preset.rest) === breakMinutes,
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const durations = [focusMinutes, breakMinutes, longBreakMinutes, blocksBeforeLongBreak].map(Number)
    if (durations.some((value) => !Number.isInteger(value) || value <= 0)) {
      setError(t('timer.durationError'))
      return
    }
    const [focusDuration, breakDuration, longBreakDuration, everyBlocks] = durations

    onSubmit({
      focusMinutes: focusDuration,
      breakMinutes: breakDuration,
      longBreakMinutes: longBreakDuration,
      blocksBeforeLongBreak: everyBlocks,
      notes: notes.trim(),
      subjectId: subjectId ? Number(subjectId) : null,
      topicId: topicId ? Number(topicId) : null,
      subject: selectedSubject?.name ?? '',
      topic: selectedTopic?.title ?? '',
      kind,
    })
  }

  return (
    <form className="session-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="session-form-block">
        <legend className="field-label">{t('timer.duration')}</legend>
        <div className="preset-list">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className="preset"
              type="button"
              aria-pressed={activePreset?.id === preset.id}
              onClick={() => {
                setFocusMinutes(String(preset.focus))
                setBreakMinutes(String(preset.rest))
                setError('')
              }}
            >
              <span className="preset-name">{t(preset.labelKey)}</span>
              <span className="preset-time num">{preset.focus} + {preset.rest} min</span>
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t('timer.focusMinutes')}</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={focusMinutes}
              onChange={(event) => { setFocusMinutes(event.target.value); setError('') }}
              required
              aria-invalid={Boolean(error)}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('timer.breakMinutes')}</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={breakMinutes}
              onChange={(event) => { setBreakMinutes(event.target.value); setError('') }}
              required
              aria-invalid={Boolean(error)}
            />
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t('timer.longBreakMinutes')}</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={longBreakMinutes}
              onChange={(event) => { setLongBreakMinutes(event.target.value); setError('') }}
              required
              aria-invalid={Boolean(error)}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('timer.blocksBeforeLongBreak')}</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={blocksBeforeLongBreak}
              onChange={(event) => { setBlocksBeforeLongBreak(event.target.value); setError('') }}
              required
              aria-invalid={Boolean(error)}
            />
          </label>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
      </fieldset>

      <fieldset className="session-form-block">
        <legend className="field-label">{t('timer.whatYouStudy')}</legend>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t('timer.subject')} <em>{t('common.optional')}</em></span>
            <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId('') }}>
              <option value="">{t('common.noneFeminine')}</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('timer.topic')} <em>{t('common.optional')}</em></span>
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={!selectedSubject || selectedSubject.topics.length === 0}>
              <option value="">{t('common.noneMasculine')}</option>
              {selectedSubject?.topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="field-label">{t('session.kind')}</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as SessionKind)}>
            {SESSION_KINDS.map((value) => <option key={value} value={value}>{t(`session.kind.${value}`)}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('timer.note')} <em>{t('common.optional')}</em></span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('timer.notePlaceholder')}
            rows={2}
          />
        </label>
      </fieldset>

      <div className="form-actions">
        {showCancel && onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
        <button className="btn btn-primary btn-lg" type="submit">
          <Play aria-hidden="true" />
          {t('timer.startSession')}
        </button>
      </div>
    </form>
  )
}

export default SessionSetupForm
