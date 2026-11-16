import { cn } from '@/lib/utils'
import { subjectColor } from '../../services/subjectService'
import type { SubjectColor } from '../../services/subjectService'
import { SUBJECT_BG } from '@/lib/subjectColors'


/** Pallino del colore della materia; decorativo, il nome è sempre scritto accanto. */
function SubjectDot({ subject, className }: { subject?: { id: number; color: SubjectColor | null }; className?: string }) {
  if (!subject) return null
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', SUBJECT_BG[subjectColor(subject)], className)} aria-hidden="true" />
}

export default SubjectDot
