import type { ReactNode } from 'react'

interface HeaderNoteProps {
  children: ReactNode
}

function HeaderNote({ children }: HeaderNoteProps) {
  return <p className="header-note">{children}</p>
}

export default HeaderNote