import { CalendarDays, Clock3, MapPin } from 'lucide-react'
import type { Exam } from '../../services/examService'

const statusLabels = {
  planned: 'Da preparare',
  in_progress: 'In preparazione',
  passed: 'Superato',
  failed: 'Non superato',
}

interface ExamListProps {
  exams: Exam[]
  onEdit: (exam: Exam) => void
  onDelete: (exam: Exam) => void
}

function daysLabel(examDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(`${examDate}T00:00:00`)
  const days = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (days < 0) return 'Data passata'
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Domani'
  return `Tra ${days} giorni`
}

function ExamList({ exams, onEdit, onDelete }: ExamListProps) {
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
              {statusLabels[exam.status]} · {daysLabel(exam.exam_date)}
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

          <div className="exam-actions">
            <button className="button button-secondary" type="button" onClick={() => onEdit(exam)}>Modifica</button>
            <button className="button button-secondary" type="button" onClick={() => onDelete(exam)}>Elimina</button>
          </div>
        </article>
      ))}
    </div>
  )
}

export default ExamList
