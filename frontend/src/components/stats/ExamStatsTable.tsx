import { formatMinutes } from '../../utils/dates'
import type { ExamStatsRow } from '../../utils/planning'
import { useLanguage } from '../../i18n/useLanguage'

/** Esami in arrivo: tempo già dato, ore per CFU e argomenti ancora scoperti. */
function ExamStatsTable({ rows }: { rows: ExamStatsRow[] }) {
  const { t, locale } = useLanguage()
  return (
    <section className="panel" aria-labelledby="stats-exams-title">
      <div className="panel-head">
        <h2 id="stats-exams-title" className="panel-title">{t('stats.examsTitle')}</h2>
        <span className="panel-meta">{t('stats.examsMeta')}</span>
      </div>
      <div className="table-scroll">
        <table className="plan-table exam-stats-table">
          <thead>
            <tr>
              <th scope="col">{t('stats.examsExam')}</th>
              <th scope="col">{t('stats.examsDays')}</th>
              <th scope="col">{t('stats.planStudied')}</th>
              <th scope="col">{t('stats.examsPerCfu')}</th>
              <th scope="col">{t('stats.examsToCatchUp')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.exam.id}>
                <th scope="row">{row.exam.title}</th>
                <td className="num">{row.days === 0 ? t('common.today') : row.days}</td>
                <td className="num">{row.minutes ? formatMinutes(row.minutes) : '—'}</td>
                <td className="num">{row.hoursPerCfu === null ? '—' : `${row.hoursPerCfu.toLocaleString(locale, { maximumFractionDigits: 1 })} h`}</td>
                <td className="num">
                  {row.topics ? t('stats.examsTopics', { count: row.toCatchUp, total: row.topics }) : '—'}
                  {row.untouched > 0 && <span className="exam-stats-untouched"> · {t('stats.examsUntouched', { count: row.untouched })}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ExamStatsTable
