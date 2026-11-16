import { Area, Bar, CartesianGrid, Cell, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GradePoint } from '../../utils/grades'
import { formatDay } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

const SYNC = 'grade-trend'
const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'var(--font-mono)' }
// Colori: media in lime (accento), salita in ciano, discesa in rosso, lode in lime.
const UP = 'var(--info)'
const DOWN = 'var(--destructive)'

/** Nome breve per l'asse: prime parole, al massimo ~12 caratteri. */
function shortName(title: string): string {
  const clean = title.replace(/\s*\(C\.I\.\)$/, '').split(/\s+-\s+/)[0]
  return clean.length > 13 ? `${clean.slice(0, 12).trimEnd()}…` : clean
}

type Row = GradePoint & { label: string }

// Recharts clona l'elemento passato a `content` aggiungendo active/payload.
function TrendTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const { t, locale } = useLanguage()
  const row = payload?.[0]?.payload as Row | undefined
  if (!active || !row) return null
  const up = (row.delta ?? 0) > 0.005
  const down = (row.delta ?? 0) < -0.005
  return (
    <div className="grid min-w-48 gap-0.5 rounded-lg border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
      <strong className="text-sm font-semibold text-popover-foreground">{row.title}</strong>
      <span>{formatDay(row.date, 'long', locale)}</span>
      <span className="font-mono tabular-nums">{t('exams.trendTooltip', { grade: `${row.grade}${row.honors ? 'L' : ''}`, cfu: row.cfu ?? '—' })}</span>
      {row.average !== null && (
        <span className="flex items-center justify-between gap-3 font-mono tabular-nums">
          {t('exams.trendAverageAfter', { value: row.average.toFixed(2) })}
          {row.delta !== null && (
            <span className={cn('inline-flex items-center gap-0.5 font-semibold [&_svg]:size-3.5', up ? 'text-info' : down ? 'text-destructive' : 'text-muted-foreground')}>
              {up ? <TrendingUp aria-hidden="true" /> : down ? <TrendingDown aria-hidden="true" /> : null}
              {row.delta > 0 ? '+' : ''}{row.delta.toFixed(2)}
            </span>
          )}
        </span>
      )}
    </div>
  )
}

/**
 * Andamento della carriera: sopra la curva della media ponderata dopo ogni
 * esame (scala stretta, così si vede quando sale e quando scende), sotto il
 * voto di ciascun esame. Stesso asse x (esami in ordine di data), tooltip
 * sincronizzato tra i due grafici, tabella per chi non usa il grafico.
 */
function GradeTrendChart({ points }: { points: GradePoint[] }) {
  const { t, locale } = useLanguage()
  const data: Row[] = points.map((p) => ({ ...p, label: shortName(p.title) }))
  const averages = points.flatMap((p) => (p.average === null ? [] : [p.average]))
  // Scala stretta sulla media (interi), così si vede ogni salita e discesa.
  const low = Math.floor(Math.min(...averages) - 0.25)
  const high = Math.min(30, Math.ceil(Math.max(...averages) + 0.25))
  const last = averages[averages.length - 1]
  const ticks = Array.from({ length: high - low + 1 }, (_, i) => low + i)

  const dot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: Row }) => {
    if (cx === undefined || cy === undefined || !payload || payload.average === null) return <g key={`d-${payload?.id}`} />
    const tone = payload.delta === null ? 'flat' : payload.delta > 0.005 ? 'up' : payload.delta < -0.005 ? 'down' : 'flat'
    return <circle key={`d-${payload.id}`} cx={cx} cy={cy} r={4.5} stroke="var(--card)" strokeWidth={2} fill={tone === 'up' ? UP : tone === 'down' ? DOWN : 'var(--muted-foreground)'} />
  }

  return (
    <figure className="grid grid-cols-1 gap-3 border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <figcaption className="text-sm font-semibold">{t('exams.trendTitle')}</figcaption>
        <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground [&>li]:inline-flex [&>li]:items-center [&>li]:gap-2">
          <li><span className="size-2.5 rounded-full bg-info" aria-hidden="true" />{t('exams.trendUp')}</li>
          <li><span className="size-2.5 rounded-full bg-destructive" aria-hidden="true" />{t('exams.trendDown')}</li>
          <li><span className="size-2.5 rounded-xs bg-primary" aria-hidden="true" />{t('exams.formHonors')}</li>
        </ul>
      </div>

      <div className="grid min-w-0 gap-1" role="img" aria-label={t('exams.trendLabel', { count: points.length })}>
        <p className="mt-2 text-xs text-muted-foreground">{t('exams.weightedAverage')} <span className="ml-1 font-mono font-semibold text-foreground tabular-nums">{last?.toFixed(2)}</span></p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} syncId={SYNC} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="grade-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" hide />
            <YAxis domain={[low, high]} tick={axisTick} tickLine={false} axisLine={false} width={36} ticks={ticks} interval={0} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="average" stroke="var(--primary)" strokeWidth={2.5} fill="url(#grade-trend-fill)" dot={dot} activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }} connectNulls isAnimationActive />
          </ComposedChart>
        </ResponsiveContainer>

        <p className="mt-2 text-xs text-muted-foreground">{t('exams.trendGrade')}</p>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={data} syncId={SYNC} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" minTickGap={8} />
            <YAxis domain={[18, 30]} ticks={[18, 24, 30]} tick={axisTick} tickLine={false} axisLine={false} width={36} />
            {/* Il tooltip è uno solo (sopra): qui resta solo l'evidenziazione sincronizzata. */}
            <Tooltip content={() => null} cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }} />
            <Bar dataKey="grade" maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive>
              {data.map((row) => <Cell key={row.id} fill={row.honors ? 'var(--primary)' : 'var(--muted-foreground)'} fillOpacity={row.honors ? 1 : 0.55} />)}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{t('exams.trendTable')}</summary>
        <table className="mt-2 w-full text-sm [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_thead_th]:text-xs [&_thead_th]:text-muted-foreground [&_tr]:border-b">
          <thead><tr><th scope="col">{t('exams.formName')}</th><th scope="col">{t('exams.formDate')}</th><th scope="col">{t('exams.trendGrade')}</th><th scope="col">{t('exams.formCfu')}</th><th scope="col">{t('exams.weightedAverage')}</th></tr></thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id}>
                <th scope="row">{p.title}</th>
                <td>{formatDay(p.date, 'long', locale)}</td>
                <td className="font-mono tabular-nums">{p.grade}{p.honors ? 'L' : ''}</td>
                <td className="font-mono tabular-nums">{p.cfu ?? '—'}</td>
                <td className="font-mono tabular-nums">{p.average?.toFixed(2) ?? '—'}{p.delta ? ` (${p.delta > 0 ? '+' : ''}${p.delta.toFixed(2)})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export default GradeTrendChart
