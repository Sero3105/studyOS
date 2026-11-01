import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarClock, GraduationCap, Layers, Play, RotateCw, SquareCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SubjectDot from '../ui/SubjectDot'
import { EmptyState } from '../ui/Feedback'
import { getTasks } from '../../services/taskService'
import { getCards } from '../../services/cardService'
import { getSubjects } from '../../services/subjectService'
import { getExams } from '../../services/examService'
import { getSessions } from '../../services/sessionService'
import { todaySuggestions } from '../../utils/planning'
import type { Suggestion } from '../../utils/planning'
import { sessionFor } from '../../utils/pomodoro'
import { daysUntil, relativeDay, todayIso } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

const ICONS: Record<Suggestion['kind'], LucideIcon> = { block: CalendarClock, review: RotateCw, cards: Layers, task: SquareCheck, exam: GraduationCap }

/**
 * "Cosa studio oggi?": blocchi orari, ripassi, flashcard, task in scadenza e l'argomento più
 * indietro dell'esame vicino, in un posto solo. Ogni proposta parte con un clic, timer già impostato.
 */
function TodayPlan() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const [items, setItems] = useState<Suggestion[] | null>(null)

  useEffect(() => {
    Promise.all([getTasks(), getCards(), getSubjects(), getExams(), getSessions()])
      .then(([tasks, cards, subjects, exams, sessions]) => setItems(todaySuggestions({ tasks, cards, subjects, exams, sessions }, todayIso())))
      // Di contorno: se fallisce la dashboard resta utilizzabile.
      .catch(() => setItems([]))
  }, [])

  if (items === null) return <div className="skeleton today-plan-skeleton" aria-hidden="true" />

  const label = (s: Suggestion) => {
    switch (s.kind) {
      case 'block': return { title: s.task.title, meta: t('today.block', { time: s.task.scheduled_time!.slice(0, 5), minutes: s.task.planned_minutes ?? 25 }) }
      case 'review': return { title: s.task.title.replace(/^↻\s*/, ''), meta: t('today.review') }
      case 'cards': return { title: t('today.cards', { count: s.count }), meta: t('today.cardsMeta') }
      case 'task': return { title: s.task.title, meta: s.task.due_date && daysUntil(s.task.due_date) < 0 ? t('today.late', { when: relativeDay(s.task.due_date, locale).toLowerCase() }) : t('today.dueToday') }
      case 'exam': return { title: s.topic.title, meta: t('today.exam', { exam: s.exam.title, days: s.days }) }
    }
  }

  const start = (s: Suggestion) => {
    if (s.kind === 'cards') navigate('/cards')
    else if (s.kind === 'exam') navigate('/timer', { state: sessionFor(s.subject, s.topic) })
    else navigate('/timer', { state: sessionFor(s.subject, s.topic, s.task) })
  }

  return (
    <section className="panel today-plan" aria-labelledby="dash-today-title">
      <div className="panel-head">
        <h2 id="dash-today-title" className="panel-title">{t('today.title')}</h2>
        <Link className="text-link" to="/calendar">{t('nav.calendar')} <ArrowRight aria-hidden="true" /></Link>
      </div>
      {items.length === 0 ? (
        <EmptyState compact title={t('today.emptyTitle')}>{t('today.emptyBody')}</EmptyState>
      ) : (
        <ol className="rows today-plan-list">
          {items.map((s, index) => {
            const Icon = ICONS[s.kind]
            const { title, meta } = label(s)
            const subject = s.kind === 'cards' ? undefined : s.subject
            const late = s.kind === 'task' && s.task.due_date !== null && daysUntil(s.task.due_date) < 0
            return (
              <li className="row today-plan-row" key={s.kind === 'cards' ? 'cards' : s.kind === 'exam' ? `exam-${s.topic.id}` : `task-${s.task.id}`}>
                <span className={`today-plan-icon is-${s.kind}`} aria-hidden="true"><Icon /></span>
                <span className="row-main">
                  <span className="row-title">{title}</span>
                  <span className={`row-meta${late ? ' text-danger' : ''}`}>
                    {subject && <SubjectDot subject={subject} />}
                    <span>{subject ? `${subject.name} · ${meta}` : meta}</span>
                  </span>
                </span>
                <button className={`btn ${index === 0 ? 'btn-primary' : 'btn-secondary'} today-plan-go`} type="button" onClick={() => start(s)}
                  aria-label={s.kind === 'cards' ? t('today.openCards') : t('today.startOn', { title })}>
                  {s.kind === 'cards' ? <Layers aria-hidden="true" /> : <Play aria-hidden="true" />}
                  <span className="today-plan-go-label">{s.kind === 'cards' ? t('today.review_') : t('today.start')}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default TodayPlan
