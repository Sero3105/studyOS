import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckSquare, GraduationCap, Play, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Command as CommandRoot, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut,
} from './ui/command'
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
function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const [data, setData] = useState<{ title: string; items: Command[] }[]>([])

  const go = (to: string, state?: unknown) => () => { onOpenChange(false); navigate(to, { state }) }

  useEffect(() => {
    if (!open) return
    Promise.all([getTasks(), getExams(), getSubjects()]).then(([tasks, exams, subjects]) => setData([
      { title: t('palette.task'), items: tasks.map((task) => ({ id: `task-${task.id}`, label: task.title, hint: task.due_date ? formatDay(task.due_date, 'short', locale) : undefined, icon: CheckSquare, run: go('/planner') })) },
      { title: t('nav.exams'), items: exams.map((exam) => ({ id: `exam-${exam.id}`, label: exam.title, hint: exam.exam_date ? formatDay(exam.exam_date, 'short', locale) : t('exams.noDate'), icon: GraduationCap, run: go('/subjects', { subjectId: exam.subject_id }) })) },
      { title: t('nav.subjects'), items: subjects.flatMap((subject) => [
        { id: `subject-${subject.id}`, label: subject.name, hint: t('palette.subject'), icon: BookOpen, run: go('/subjects', { subjectId: subject.id }) },
        ...subject.topics.map((topic) => ({ id: `topic-${topic.id}`, label: topic.title, hint: subject.name, icon: BookOpen, run: go('/subjects', { subjectId: subject.id }) })),
      ]) },
    ])).catch(() => {})
    // Ricaricato a ogni apertura: la palette vive pochi secondi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const actions: Command[] = [
    { id: 'new-task', label: t('palette.newTask'), hint: 'N', icon: Plus, run: go('/planner', { focusNewTask: true }) },
    { id: 'start', label: t('nav.newSession'), icon: Play, run: go('/timer') },
  ]
  const pages: Command[] = navItems.map((item) => ({ id: item.to, label: t(item.labelKey), hint: `G ${item.key.toUpperCase()}`, icon: item.icon, run: go(item.to) }))
  const groups = [{ title: t('palette.actions'), items: actions }, { title: t('palette.pages'), items: pages }, ...data]

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('palette.title')}
      description={t('palette.description')}
    >
      <CommandRoot filter={(value, search) => (normalize(value).includes(normalize(search.trim())) ? 1 : 0)}>
      <CommandInput placeholder={t('palette.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('palette.noResults')}</CommandEmpty>
        {groups.filter((group) => group.items.length).map((group) => (
          <CommandGroup key={group.title} heading={group.title}>
            {group.items.map((command) => (
              <CommandItem key={command.id} value={`${command.label} ${command.id}`} onSelect={command.run}>
                <command.icon aria-hidden="true" />
                <span className="truncate">{command.label}</span>
                {command.hint && <CommandShortcut>{command.hint}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      </CommandRoot>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">{t('palette.footer')}</p>
    </CommandDialog>
  )
}

export default CommandPalette
