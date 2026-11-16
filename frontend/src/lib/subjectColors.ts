import type { SubjectColor } from '../services/subjectService'

/** Classi Tailwind per colore materia (scritte per intero, così Tailwind le genera). */
export const SUBJECT_BG: Record<SubjectColor, string> = {
  yellow: 'bg-subject-yellow', green: 'bg-subject-green', teal: 'bg-subject-teal', blue: 'bg-subject-blue',
  violet: 'bg-subject-violet', pink: 'bg-subject-pink', red: 'bg-subject-red', orange: 'bg-subject-orange',
}
