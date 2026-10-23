import { getTasks } from '../services/taskService'
import { getExams } from '../services/examService'
import { daysUntil, relativeDay, todayIso } from './dates'
import type { Translate, TranslationKey } from '../i18n/translations'

const ENABLED_KEY = 'studyos.reminders'
const LAST_KEY = 'studyos.reminders.last'
/** Esami notificati solo a queste distanze: abbastanza per prepararsi, senza un avviso al giorno. */
const EXAM_MILESTONES = [0, 1, 3, 7]

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

export function remindersEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) === '1' && notificationsSupported() && Notification.permission === 'granted' }
  catch { return false }
}

export function setRemindersEnabled(enabled: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0')
    localStorage.removeItem(LAST_KEY)
  } catch { /* storage bloccato: i promemoria restano spenti */ }
}

/** Al massimo una notifica al giorno con task in ritardo/oggi/domani e gli esami vicini. */
export async function runDeadlineReminders(t: Translate, locale: string): Promise<void> {
  if (!remindersEnabled() || localStorage.getItem(LAST_KEY) === todayIso()) return
  const [tasks, exams] = await Promise.all([getTasks(), getExams()])
  const open = tasks.filter((task) => task.status !== 'done' && task.due_date).map((task) => daysUntil(task.due_date!))
  const counts: [number, TranslationKey][] = [
    [open.filter((d) => d < 0).length, 'reminders.overdue'],
    [open.filter((d) => d === 0).length, 'reminders.dueToday'],
    [open.filter((d) => d === 1).length, 'reminders.dueTomorrow'],
  ]
  const lines = counts.filter(([count]) => count > 0).map(([count, key]) => t(key, { count }))
  for (const exam of exams) {
    if ((exam.status === 'planned' || exam.status === 'in_progress') && EXAM_MILESTONES.includes(daysUntil(exam.exam_date))) {
      lines.push(t('reminders.exam', { title: exam.title, when: relativeDay(exam.exam_date, locale).toLowerCase() }))
    }
  }
  localStorage.setItem(LAST_KEY, todayIso())
  if (lines.length) new Notification(t('reminders.title'), { body: lines.join('\n'), tag: 'studyos-deadlines', icon: '/favicon.svg' })
}
