import { EmptyState } from '../ui/Feedback'
import Ranked from './Ranked'
import Section from './Section'
import ProgressBar from '../ui/ProgressBar'
import type { StudySession } from '../../services/sessionService'
import { studyQuality } from '../../utils/studyStats'
import type { FocusRow } from '../../utils/studyStats'
import type { TranslationKey } from '../../i18n/translations'
import { useLanguage } from '../../i18n/useLanguage'

/** Focus medio per gruppo, in ordine naturale; il migliore è l'unico in accento. */
function FocusList<K extends string>({ rows, label, name }: { rows: FocusRow<K>[]; label: string; name: (key: K) => string }) {
  const { t, locale } = useLanguage()
  const best = Math.max(...rows.map((r) => r.average))
  return (
    <ol className="flex flex-col gap-3" aria-label={label}>
      {rows.map((row) => (
        <Ranked
          key={row.key}
          highlight={rows.length > 1 && row.average === best}
          title={t('stats.focusDetail', { value: row.average.toLocaleString(locale, { maximumFractionDigits: 1 }), count: row.count })}
          name={name(row.key)}
          width={Math.max(4, ((row.average - 1) / 2) * 100)}
          value={t(`session.focus.${Math.round(row.average) as 1 | 2 | 3}`)}
        />
      ))}
    </ol>
  )
}

/**
 * Come studi, non solo quanto: blocchi finiti contro interrotti, distrazioni per blocco,
 * e con quale durata e in che momento del giorno il focus è più alto.
 */
function StudyQuality({ sessions }: { sessions: StudySession[] }) {
  const { t, locale } = useLanguage()
  const q = studyQuality(sessions)
  const number = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section id="stats-quality-title" title={t('stats.qualityTitle')}>
        <div className="flex flex-col gap-6">
          {q.completion === null ? (
            <EmptyState compact title={t('stats.qualityEmptyTitle')}>{t('stats.qualityEmptyBody')}</EmptyState>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{t('stats.completedBlocks')}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{t('stats.ofBlocks', { done: q.blocks - q.partial, total: q.blocks })}</span>
                </div>
                <ProgressBar percent={Math.round(q.completion * 100)} label={t('stats.completedBlocks')} />
              </div>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{t('stats.distractionsPerBlock')}</span>
                <span className="font-mono tabular-nums">{number(q.distractions ?? 0)}</span>
              </div>
            </>
          )}
          {q.byLength.length > 0 && (
            <div className="flex flex-col gap-3 border-t pt-5">
              <h3 className="text-sm font-medium">{t('stats.focusByLength')}</h3>
              <FocusList rows={q.byLength} label={t('stats.focusByLength')} name={(k) => t(`stats.length.${k}` as TranslationKey)} />
            </div>
          )}
        </div>
      </Section>

      <Section id="stats-band-title" title={t('stats.focusByBand')}>
        {q.byBand.length === 0 ? (
          <EmptyState compact title={t('stats.focusEmptyTitle')}>{t('stats.focusEmptyBody')}</EmptyState>
        ) : (
          <FocusList rows={q.byBand} label={t('stats.focusByBand')} name={(k) => t(`stats.band.${k}` as TranslationKey)} />
        )}
      </Section>
    </div>
  )
}

export default StudyQuality
