import { cn } from '@/lib/utils'
import { EmptyState } from '../ui/Feedback'
import Meta from '../ui/Meta'
import MoreLink from '../ui/MoreLink'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../ui/card'
import type { DatedExam } from '../../services/examService'
import { daysUntil, formatDay, urgencyClass } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

/**
 * Prossimi esami con il conto alla rovescia in evidenza: il numero di giorni
 * è la prima cosa che si legge, colorato in base all'urgenza.
 */
function UpcomingExams({ exams }: { exams: DatedExam[] }) {
  const { t, locale } = useLanguage()
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2 id="dash-exams-title">{t('dashboard.upcomingExams')}</h2></CardTitle>
        <CardAction><MoreLink to="/subjects">{t('dashboard.all')}</MoreLink></CardAction>
      </CardHeader>
      <CardContent>
        {exams.length === 0 ? (
          <EmptyState
            compact
            title={t('dashboard.noExamScheduled')}
            action={<MoreLink to="/subjects">{t('dashboard.addExam')}</MoreLink>}
          >
            {t('dashboard.noExamBody')}
          </EmptyState>
        ) : (
          <ul className="flex flex-col divide-y" aria-labelledby="dash-exams-title">
            {exams.map((exam) => {
              const days = daysUntil(exam.exam_date)
              return (
                <li className="flex items-center gap-4 py-3 first:pt-0 last:pb-0" key={exam.id}>
                  <span className={cn('flex w-12 shrink-0 flex-col items-center rounded-lg bg-muted py-1.5', urgencyClass(days))}>
                    {days === 0 ? (
                      <span className="text-xs font-semibold">{t('common.today')}</span>
                    ) : (
                      <>
                        <span className="font-mono text-lg leading-none font-semibold tabular-nums">{days}</span>
                        <span className="text-[0.625rem] text-muted-foreground uppercase">{days === 1 ? t('dashboard.day') : t('dashboard.days')}</span>
                      </>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{exam.title}</span>
                    <Meta items={[exam.subject, `${formatDay(exam.exam_date, 'short', locale)}${exam.exam_time ? `, ${exam.exam_time.slice(0, 5)}` : ''}`]} />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default UpcomingExams
