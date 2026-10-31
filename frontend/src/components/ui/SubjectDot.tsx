import type { CSSProperties } from 'react'
import { subjectColor } from '../../services/subjectService'
import type { SubjectColor } from '../../services/subjectService'

/** Pallino del colore della materia; decorativo, il nome è sempre scritto accanto. */
function SubjectDot({ subject }: { subject?: { id: number; color: SubjectColor | null } }) {
  if (!subject) return null
  return <span className="subject-dot" aria-hidden="true" style={{ '--subject-color': `var(--subject-${subjectColor(subject)})` } as CSSProperties} />
}

export default SubjectDot
