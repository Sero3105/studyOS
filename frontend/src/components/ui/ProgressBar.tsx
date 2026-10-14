interface ProgressBarProps {
  percent: number
  label: string
}

/** Barra di progresso accessibile; diventa verde al raggiungimento. */
function ProgressBar({ percent, label }: ProgressBarProps) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div
      className={`progress${value >= 100 ? ' progress-complete' : ''}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  )
}

export default ProgressBar
