import { useEffect, useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckSquare, GraduationCap, Play, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Modal from './ui/Modal'
import { navItems } from './navigation'
import { getTasks } from '../services/taskService'
import { getExams } from '../services/examService'
import { getSubjects } from '../services/subjectService'
import { formatDay } from '../utils/dates'
import { useLanguage } from '../i18n/useLanguage'

interface Command {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  run: () => void
}

/** Confronto senza maiuscole né accenti: "perche" trova "Perché". */
const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Palette dei comandi (⌘K, Ctrl+K o /): pagine, azioni rapide e ricerca in
 * task, esami, materie e argomenti. Frecce per scegliere, Invio per aprire.
 */
function CommandPalette({ onClose }: { onClose: () => void }) {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [data, setData] = useState<Command[]>([])

  const go = (to: string, state?: unknown) => () => { onClose(); navigate(to, { state }) }

  useEffect(() => {
    Promise.all([getTasks(), getExams(), getSubjects()]).then(([tasks, exams, subjects]) => setData([
      ...tasks.map((task) => ({ id: `task-${task.id}`, label: task.title, hint: task.due_date ? formatDay(task.due_date, 'short', locale) : t('palette.task'), icon: CheckSquare, run: go('/planner') })),
      ...exams.map((exam) => ({ id: `exam-${exam.id}`, label: exam.title, hint: exam.exam_date ? formatDay(exam.exam_date, 'short', locale) : t('exams.noDate'), icon: GraduationCap, run: go('/exams') })),
      ...subjects.flatMap((subject) => [
        { id: `subject-${subject.id}`, label: subject.name, hint: t('palette.subject'), icon: BookOpen, run: go('/subjects', { subjectId: subject.id }) },
        ...subject.topics.map((topic) => ({ id: `topic-${topic.id}`, label: topic.title, hint: subject.name, icon: BookOpen, run: go('/subjects', { subjectId: subject.id }) })),
      ]),
    ])).catch(() => {})
    // Caricato una volta all'apertura: la palette vive pochi secondi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const base: Command[] = [
    { id: 'new-task', label: t('palette.newTask'), hint: 'N', icon: Plus, run: go('/planner', { focusNewTask: true }) },
    { id: 'start', label: t('nav.newSession'), icon: Play, run: go('/timer') },
    ...navItems.map((item) => ({ id: item.to, label: t(item.labelKey), hint: `G ${item.key.toUpperCase()}`, icon: item.icon, run: go(item.to) })),
  ]
  const q = normalize(query.trim())
  const results = q
    ? [...base, ...data].filter((c) => normalize(c.label).includes(q)).slice(0, 12)
    : base
  const selected = Math.min(active, results.length - 1)

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((selected + step + results.length) % results.length)
    } else if (event.key === 'Enter' && results[selected]) {
      event.preventDefault()
      results[selected].run()
    }
  }

  return (
    <Modal title={t('palette.title')} description={t('palette.description')} onClose={onClose}>
      <div className="palette">
        <input
          className="input palette-input"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[selected] ? `${listId}-${results[selected].id}` : undefined}
          aria-label={t('palette.search')}
          placeholder={t('palette.placeholder')}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0) }}
          onKeyDown={onKeyDown}
        />
        <ul className="palette-list" id={listId} role="listbox" aria-label={t('palette.results')}>
          {results.length === 0 && <li className="palette-empty">{t('palette.noResults')}</li>}
          {results.map((command, index) => {
            const Icon = command.icon
            return (
              <li
                key={command.id}
                id={`${listId}-${command.id}`}
                role="option"
                aria-selected={index === selected}
                className={`palette-item${index === selected ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={command.run}
              >
                <Icon aria-hidden="true" />
                <span className="palette-label">{command.label}</span>
                {command.hint && <kbd className="palette-hint">{command.hint}</kbd>}
              </li>
            )
          })}
        </ul>
        <p className="palette-footer">{t('palette.footer')}</p>
      </div>
    </Modal>
  )
}

export default CommandPalette
