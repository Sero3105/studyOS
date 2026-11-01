import type { StudySessionConfig } from '../components/timer/types'
import type { Subject, Topic } from '../services/subjectService'
import type { Task } from '../services/taskService'

/** Pomodoro classico: pausa lunga di 15 minuti ogni 4 blocchi. Vale anche per sessioni salvate prima che esistesse. */
export const LONG_BREAK_DEFAULTS = { longBreakMinutes: 15, blocksBeforeLongBreak: 4 }

export function longBreak(config: StudySessionConfig) {
  return { ...LONG_BREAK_DEFAULTS, ...config }
}

/** Minuti della pausa che segue il blocco numero `block` (da 1): lunga ogni `blocksBeforeLongBreak` blocchi. */
export function breakMinutes(config: StudySessionConfig, block: number): number {
  const { longBreakMinutes, blocksBeforeLongBreak } = longBreak(config)
  return block > 0 && block % blocksBeforeLongBreak === 0 ? longBreakMinutes : config.breakMinutes
}

/** Sessione Pomodoro classica su una materia/argomento, ed eventualmente un task da chiudere alla fine. */
export function sessionFor(subject?: Subject, topic?: Topic, task?: Task): StudySessionConfig {
  return {
    focusMinutes: 25, breakMinutes: 5, notes: '',
    subjectId: subject?.id ?? null, topicId: topic?.id ?? null,
    subject: subject?.name ?? '', topic: topic?.title ?? '',
    taskId: task?.id ?? null, taskTitle: task?.title,
    kind: task?.review_interval ? 'review' : 'study',
  }
}
