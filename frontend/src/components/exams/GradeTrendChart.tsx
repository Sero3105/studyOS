import { Area, Bar, CartesianGrid, Cell, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { GradePoint } from '../../utils/grades'
import { formatDay } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

const SYNC = 'grade-trend'
const axisTick = { fill: 'var(--text-muted)', fontSize: 11 }

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
    <div className="grade-trend-tooltip">
      <strong>{row.title}</strong>
      <span>{formatDay(row.date, 'long', locale)}</span>
      <span className="num">{t('exams.trendTooltip', { grade: `${row.grade}${row.honors ? 'L' : ''}`, cfu: row.cfu ?? '—' })}</span>
      {row.average !== null && (
        <span className="num grade-trend-tooltip-avg">
          {t('exams.trendAverageAfter', { value: row.average.toFixed(2) })}
          {row.delta !== null && (
            <span className={`grade-trend-delta${up ? ' is-up' : down ? ' is-down' : ''}`}>
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
    return <circle key={`d-${payload.id}`} className={`grade-trend-point is-${tone}`} cx={cx} cy={cy} r={4.5} />
  }

  return (
    <figure className="grade-trend">
      <div className="grade-trend-head">
        <figcaption className="grade-trend-title">{t('exams.trendTitle')}</figcaption>
        <ul className="grade-trend-legend">
          <li><span className="grade-trend-key is-up" aria-hidden="true" />{t('exams.trendUp')}</li>
          <li><span className="grade-trend-key is-down" aria-hidden="true" />{t('exams.trendDown')}</li>
          <li><span className="grade-trend-key is-honors" aria-hidden="true" />{t('exams.formHonors')}</li>
        </ul>
      </div>

      <div className="grade-trend-chart" role="img" aria-label={t('exams.trendLabel', { count: points.length })}>
        <p className="grade-trend-axis-title">{t('exams.weightedAverage')} <span className="num">{last?.toFixed(2)}</span></p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} syncId={SYNC} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="grade-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--surface-3)" />
            <XAxis dataKey="label" hide />
            <YAxis domain={[low, high]} tick={axisTick} tickLine={false} axisLine={false} width={36} ticks={ticks} interval={0} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--line)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="average" stroke="var(--accent)" strokeWidth={2.5} fill="url(#grade-trend-fill)" dot={dot} activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }} connectNulls isAnimationActive />
          </ComposedChart>
        </ResponsiveContainer>

        <p className="grade-trend-axis-title">{t('exams.trendGrade')}</p>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={data} syncId={SYNC} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--surface-3)" />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval="preserveStartEnd" minTickGap={8} />
            <YAxis domain={[18, 30]} ticks={[18, 24, 30]} tick={axisTick} tickLine={false} axisLine={false} width={36} />
            {/* Il tooltip è uno solo (sopra): qui resta solo l'evidenziazione sincronizzata. */}
            <Tooltip content={() => null} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="grade" maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive>
              {data.map((row) => <Cell key={row.id} fill={row.honors ? 'var(--accent)' : 'var(--text-muted)'} />)}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <details className="grade-trend-table">
        <summary>{t('exams.trendTable')}</summary>
        <table className="plan-table">
          <thead><tr><th scope="col">{t('exams.formName')}</th><th scope="col">{t('exams.formDate')}</th><th scope="col">{t('exams.trendGrade')}</th><th scope="col">{t('exams.formCfu')}</th><th scope="col">{t('exams.weightedAverage')}</th></tr></thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id}>
                <th scope="row">{p.title}</th>
                <td>{formatDay(p.date, 'long', locale)}</td>
                <td className="num">{p.grade}{p.honors ? 'L' : ''}</td>
                <td className="num">{p.cfu ?? '—'}</td>
                <td className="num">{p.average?.toFixed(2) ?? '—'}{p.delta ? ` (${p.delta > 0 ? '+' : ''}${p.delta.toFixed(2)})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export default GradeTrendChart
