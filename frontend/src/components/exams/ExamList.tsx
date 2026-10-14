import { CalendarDays, Clock3, MapPin } from 'lucide-react'
import type { Exam } from '../../services/examService'

const statusLabels = {
  planned: 'Da preparare',
  in_progress: 'In preparazione',
  passed: 'Superato',
  failed: 'Non superato',
}

function ExamList({ exams }: { exams: Exam[] }) {
  return (
    <div className="exam-list">
      {exams.map((exam) => (
        <article className="dashboard-card exam-card" key={exam.id}>
          <div className="exam-card-header">
            <div>
              <p className="section-kicker">{exam.subject}</p>
              <h2>{exam.title}</h2>
            </div>
            <span className={`exam-status exam-status-${exam.status}`}>
              {statusLabels[exam.status]}
            </span>
          </div>

          <div className="exam-card-details">
            <span>
              <CalendarDays size={15} aria-hidden="true" />
              {new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(
                new Date(`${exam.exam_date}T00:00:00`),
              )}
            </span>
            {exam.exam_time && (
              <span>
                <Clock3 size={15} aria-hidden="true" />
                {exam.exam_time.slice(0, 5)}
              </span>
            )}
            {exam.location && (
              <span>
                <MapPin size={15} aria-hidden="true" />
                {exam.location}
              </span>
            )}
          </div>

          {exam.notes && <p className="exam-card-notes">{exam.notes}</p>}
        </article>
      ))}
    </div>
  )
}

export default ExamList
