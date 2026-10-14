import { ArrowRight, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardCardHeading from './DashboardCardHeading'
import type { Exam } from '../../services/examService'

function daysLabel(examDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((new Date(`${examDate}T00:00:00`).getTime() - today.getTime()) / 86400000)
  if (days <= 0) return 'Oggi'
  if (days === 1) return 'Domani'
  return `Tra ${days} giorni`
}

function UpcomingExamsCard({ exams }: { exams: Exam[] }) {
  return (
    <article className="dashboard-card">
      <DashboardCardHeading icon={<GraduationCap />} eyebrow="Scadenze" title="Prossimi esami" />
      {exams.length === 0 ? (
        <p className="muted-note">Nessun esame pianificato.</p>
      ) : (
        <ul className="topic-list">
          {exams.map((exam) => (
            <li key={exam.id}>
              <span>{exam.title} · {exam.subject}</span>
              <span>{daysLabel(exam.exam_date)}</span>
            </li>
          ))}
        </ul>
      )}
      <Link className="text-action" to="/exams">
        Apri Exams <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}

export default UpcomingExamsCard
