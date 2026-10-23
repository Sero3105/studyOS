import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { EmptyState } from '../ui/Feedback'
import Meta from '../ui/Meta'
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
    <section className="panel" aria-labelledby="dash-exams-title">
      <div className="panel-head">
        <h2 id="dash-exams-title" className="panel-title">{t('dashboard.upcomingExams')}</h2>
        <Link className="text-link" to="/exams">
          {t('dashboard.all')} <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          compact
          title={t('dashboard.noExamScheduled')}
          action={<Link className="text-link" to="/exams">{t('dashboard.addExam')} <ArrowRight aria-hidden="true" /></Link>}
        >
          {t('dashboard.noExamBody')}
        </EmptyState>
      ) : (
        <ul className="rows">
          {exams.map((exam) => {
            const days = daysUntil(exam.exam_date)
            return (
              <li className="row countdown-row" key={exam.id}>
                <span className={`countdown ${urgencyClass(days)}`}>
                  {days === 0 ? (
                    <span className="countdown-value">{t('common.today')}</span>
                  ) : (
                    <>
                      <span className="countdown-value num">{days}</span>
                      <span className="countdown-unit">{days === 1 ? t('dashboard.day') : t('dashboard.days')}</span>
                    </>
                  )}
                </span>
                <span className="row-main">
                  <span className="row-title">{exam.title}</span>
                  <Meta items={[exam.subject, `${formatDay(exam.exam_date, 'short', locale)}${exam.exam_time ? `, ${exam.exam_time.slice(0, 5)}` : ''}`]} />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default UpcomingExams
