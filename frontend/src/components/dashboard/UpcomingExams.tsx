import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { EmptyState } from '../ui/Feedback'
import type { Exam } from '../../services/examService'
import { daysUntil, formatDay, urgencyClass } from '../../utils/dates'

/**
 * Prossimi esami con il conto alla rovescia in evidenza: il numero di giorni
 * è la prima cosa che si legge, colorato in base all'urgenza.
 */
function UpcomingExams({ exams }: { exams: Exam[] }) {
  return (
    <section className="panel" aria-labelledby="dash-exams-title">
      <div className="panel-head">
        <h2 id="dash-exams-title" className="panel-title">Prossimi esami</h2>
        <Link className="text-link" to="/exams">
          Tutti <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          compact
          title="Nessun esame in calendario"
          action={<Link className="text-link" to="/exams">Aggiungi un esame <ArrowRight aria-hidden="true" /></Link>}
        >
          Inserisci le prossime prove per vedere qui quanti giorni mancano.
        </EmptyState>
      ) : (
        <ul className="rows">
          {exams.map((exam) => {
            const days = daysUntil(exam.exam_date)
            return (
              <li className="row countdown-row" key={exam.id}>
                <span className={`countdown ${urgencyClass(days)}`}>
                  {days === 0 ? (
                    <span className="countdown-value">Oggi</span>
                  ) : (
                    <>
                      <span className="countdown-value num">{days}</span>
                      <span className="countdown-unit">{days === 1 ? 'giorno' : 'giorni'}</span>
                    </>
                  )}
                </span>
                <span className="row-main">
                  <span className="row-title">{exam.title}</span>
                  <span className="row-meta">
                    {exam.subject} · {formatDay(exam.exam_date)}
                    {exam.exam_time ? `, ${exam.exam_time.slice(0, 5)}` : ''}
                  </span>
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
