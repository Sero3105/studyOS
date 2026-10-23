import { CalendarDays, CalendarPlus, Clock3, MapPin, Pencil } from 'lucide-react'
import ConfirmButton from '../ui/ConfirmButton'
import Meta from '../ui/Meta'
import { isDated } from '../../services/examService'
import type { DatedExam, Exam, ExamStatus } from '../../services/examService'
import { daysUntil, formatDay, monthShort, parseDay, relativeDay, urgencyClass } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'
import type { TranslationKey } from '../../i18n/translations'

const statusKeys: Record<ExamStatus, TranslationKey> = {
  planned: 'exams.status.planned',
  in_progress: 'exams.status.in_progress',
  passed: 'exams.status.passed',
  failed: 'exams.status.failed',
}

const statusTone: Record<ExamStatus, string> = {
  planned: '',
  in_progress: 'tag-accent',
  passed: 'tag-success',
  failed: 'tag-danger',
}

interface ExamActionsProps {
  exam: Exam
  onEdit: (exam: Exam) => void
  onDelete: (exam: Exam) => Promise<void>
  onPlan?: (exam: Exam) => void
}

function ExamActions({ exam, onEdit, onDelete, onPlan }: ExamActionsProps) {
  const { t } = useLanguage()
  const canPlan = onPlan && isDated(exam) && (exam.status === 'planned' || exam.status === 'in_progress') && daysUntil(exam.exam_date) > 1
  return (
    <div className="row-actions">
      {canPlan && (
        <button className="icon-btn" type="button" onClick={() => onPlan(exam)} aria-label={t('exams.planLabel', { title: exam.title })} title={t('exams.planTitle')}>
          <CalendarPlus aria-hidden="true" />
        </button>
      )}
      <button className="icon-btn" type="button" onClick={() => onEdit(exam)} aria-label={t('exams.editLabel', { title: exam.title })} title={t('exams.editTitle')}>
        <Pencil aria-hidden="true" />
      </button>
      <ConfirmButton label={t('exams.deleteLabel', { title: exam.title })} onConfirm={() => onDelete(exam)} />
    </div>
  )
}

function StatusTag({ exam }: { exam: Exam }) {
  const { t } = useLanguage()
  const grade = exam.status === 'passed' && exam.grade ? ` · ${exam.grade}${exam.honors ? 'L' : ''}` : ''
  return <span className={`tag ${statusTone[exam.status]}`}>{t(statusKeys[exam.status])}{grade}</span>
}

/**
 * Il prossimo esame, in grande: il numero di giorni mancanti è l'elemento
 * dominante, i dettagli pratici (data, ora, luogo) stanno in una riga sola.
 */
export function NextExam({ exam, onEdit, onDelete, onPlan }: ExamActionsProps & { exam: DatedExam }) {
  const { t, locale } = useLanguage()
  const days = daysUntil(exam.exam_date)
  return (
    <article className={`panel next-exam ${urgencyClass(days)}`} aria-labelledby={`next-exam-${exam.id}`}>
      <div className="next-exam-count">
        <span className="next-exam-days num">{days === 0 ? t('common.today') : days}</span>
        {days > 0 && <span className="next-exam-unit">{days === 1 ? t('dashboard.day') : t('dashboard.days')}</span>}
      </div>
      <div className="next-exam-body">
        <div className="next-exam-head">
          <div>
            <p className="next-exam-subject">{exam.subject}</p>
            <h2 id={`next-exam-${exam.id}`}>{exam.title}</h2>
          </div>
          <ExamActions exam={exam} onEdit={onEdit} onDelete={onDelete} onPlan={onPlan} />
        </div>
        <ul className="exam-facts">
          <li><CalendarDays aria-hidden="true" />{formatDay(exam.exam_date, 'full', locale)}</li>
          {exam.exam_time && <li><Clock3 aria-hidden="true" />{exam.exam_time.slice(0, 5)}</li>}
          {exam.location && <li><MapPin aria-hidden="true" />{exam.location}</li>}
          <li><StatusTag exam={exam} /></li>
        </ul>
        {exam.notes && <p className="next-exam-notes">{exam.notes}</p>}
      </div>
    </article>
  )
}

interface ExamListProps {
  exams: Exam[]
  onEdit: (exam: Exam) => void
  onDelete: (exam: Exam) => Promise<void>
  onPlan?: (exam: Exam) => void
}

/** Elenco compatto: blocco data a sinistra, dettagli al centro, azioni a destra. */
function ExamList({ exams, onEdit, onDelete, onPlan }: ExamListProps) {
  const { t, locale } = useLanguage()
  return (
    <ul className="panel rows exam-rows">
      {exams.map((exam) => {
        const date = exam.exam_date
        const days = date ? daysUntil(date) : null
        return (
          <li className="row exam-row" key={exam.id}>
            <span className="date-block" aria-hidden="true">
              {date ? (
                <>
                  <span className="date-block-day num">{parseDay(date).getDate()}</span>
                  <span className="date-block-month">{monthShort(date, locale)}</span>
                </>
              ) : <span className="date-block-day">?</span>}
            </span>
            <span className="row-main">
              <span className="row-title">{exam.title}</span>
              <Meta
                items={[
                  <>
                    {exam.subject !== exam.title && exam.subject}
                    <span className="visually-hidden">, {date ? formatDay(date, 'long', locale) : t('exams.noDate')}</span>
                  </>,
                  exam.exam_time?.slice(0, 5),
                  exam.location,
                ]}
              />
            </span>
            <span className="exam-row-status">
              {date === null ? <span className="exam-row-days">{t('exams.noDate')}</span>
                : days! >= 0 && <span className={`exam-row-days num ${urgencyClass(days!)}`}>{relativeDay(date, locale)}</span>}
              <StatusTag exam={exam} />
            </span>
            <ExamActions exam={exam} onEdit={onEdit} onDelete={onDelete} onPlan={onPlan} />
          </li>
        )
      })}
    </ul>
  )
}

export default ExamList
