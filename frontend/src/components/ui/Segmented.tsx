import { ToggleGroup, ToggleGroupItem } from './toggle-group'

interface SegmentedOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
}

/** Filtro a segmenti: uno solo attivo, mai nessuno. */
function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value}
      onValueChange={(next) => { if (next) onChange(next as T) }}
      aria-label={label}
      className="max-w-full overflow-x-auto"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="data-[state=on]:bg-accent data-[state=on]:text-foreground">
          {option.label}
          {option.count !== undefined && <span className="font-mono text-xs text-muted-foreground tabular-nums">{option.count}</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export default Segmented
