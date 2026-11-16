/** Marchio StudyOS: tre barre a gradino, come un grafico che sale. */
function BrandMark({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <rect x="6" y="13" width="3" height="5" rx="1" className="fill-primary-foreground" />
      <rect x="10.5" y="9.5" width="3" height="8.5" rx="1" className="fill-primary-foreground" />
      <rect x="15" y="6" width="3" height="12" rx="1" className="fill-primary-foreground" />
    </svg>
  )
}

export default BrandMark
