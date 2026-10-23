import { useEffect, useRef, useState } from 'react'
import type { GradePoint } from '../../utils/grades'
import { formatDay, parseDay } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

const HEIGHT = 220
const PAD = { top: 16, right: 56, bottom: 28, left: 32 }
const GRID = [18, 21, 24, 27, 30]

/**
 * Andamento dei voti: un punto grigio per esame (voto), una linea accento
 * per la media ponderata dopo ogni esame. Asse x proporzionale al tempo.
 * Tooltip al passaggio o al focus da tastiera; tabella per chi non vede il grafico.
 */
function GradeTrendChart({ points }: { points: GradePoint[] }) {
  const { t, locale } = useLanguage()
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  const times = points.map((p) => parseDay(p.date).getTime())
  const [t0, t1] = [Math.min(...times), Math.max(...times)]
  const innerW = width - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const x = (time: number) => PAD.left + (t1 === t0 ? innerW / 2 : ((time - t0) / (t1 - t0)) * innerW)
  const y = (grade: number) => PAD.top + ((30 - grade) / 12) * innerH
  const averaged = points.map((p, i) => ({ p, i })).filter(({ p }) => p.average !== null)
  const line = averaged.map(({ p, i }) => `${x(times[i]).toFixed(1)},${y(p.average!).toFixed(1)}`).join(' ')
  const last = averaged[averaged.length - 1]
  const grade = (p: GradePoint) => `${p.grade}${p.honors ? 'L' : ''}`
  const shown = active !== null ? points[active] : null

  return (
    <figure className="grade-trend">
      <figcaption className="grade-trend-legend">
        <span><span className="grade-trend-key is-dot" aria-hidden="true" />{t('exams.trendGrade')}</span>
        <span><span className="grade-trend-key is-line" aria-hidden="true" />{t('exams.weightedAverage')}</span>
      </figcaption>
      <div className="grade-trend-plot" ref={boxRef}>
        <svg width={width} height={HEIGHT} role="img" aria-label={t('exams.trendLabel', { count: points.length })}>
          {GRID.map((g) => (
            <g key={g}>
              <line className="grade-trend-grid" x1={PAD.left} x2={width - PAD.right} y1={y(g)} y2={y(g)} />
              <text className="grade-trend-axis" x={PAD.left - 8} y={y(g)} textAnchor="end" dominantBaseline="middle">{g}</text>
            </g>
          ))}
          <text className="grade-trend-axis" x={x(t0)} y={HEIGHT - 6} textAnchor={t1 === t0 ? 'middle' : 'start'}>{formatDay(points[0].date, 'short', locale)} {parseDay(points[0].date).getFullYear()}</text>
          {t1 !== t0 && <text className="grade-trend-axis" x={x(t1)} y={HEIGHT - 6} textAnchor="end">{formatDay(points[points.length - 1].date, 'short', locale)} {parseDay(points[points.length - 1].date).getFullYear()}</text>}
          {averaged.length > 1 && <polyline className="grade-trend-line" points={line} />}
          {last && (
            <text className="grade-trend-end" x={x(times[last.i]) + 10} y={y(last.p.average!)} dominantBaseline="middle">{last.p.average!.toFixed(2)}</text>
          )}
          {points.map((p, i) => (
            <circle key={p.id} className={`grade-trend-dot${active === i ? ' is-active' : ''}`} cx={x(times[i])} cy={y(p.grade)} r={active === i ? 6 : 4.5} />
          ))}
          {/* Il puntatore sceglie il punto più vicino in orizzontale: funziona anche con punti fitti su mobile. */}
          <rect
            className="grade-trend-track"
            x={PAD.left - 12}
            y={0}
            width={innerW + 24}
            height={HEIGHT}
            onPointerMove={(e) => {
              const px = e.clientX - e.currentTarget.getBoundingClientRect().left + PAD.left - 12
              setActive(times.reduce((best, time, i) => (Math.abs(x(time) - px) < Math.abs(x(times[best]) - px) ? i : best), 0))
            }}
            onPointerLeave={() => setActive(null)}
          />
          {points.map((p, i) => (
            <circle
              key={`hit-${p.id}`}
              className="grade-trend-hit"
              cx={x(times[i])}
              cy={y(p.grade)}
              r={12}
              tabIndex={0}
              aria-label={`${p.title}: ${grade(p)}, ${formatDay(p.date, 'long', locale)}`}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}
        </svg>
        {shown && (
          <div
            className="grade-trend-tooltip"
            role="status"
            style={{ left: Math.min(Math.max(x(times[active!]), 90), width - 90), top: y(shown.grade) - 12 }}
          >
            <strong>{shown.title}</strong>
            <span>{formatDay(shown.date, 'long', locale)}</span>
            <span className="num">{t('exams.trendTooltip', { grade: grade(shown), cfu: shown.cfu ?? '—' })}</span>
            {shown.average !== null && <span className="num">{t('exams.trendAverageAfter', { value: shown.average.toFixed(2) })}</span>}
          </div>
        )}
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
                <td className="num">{grade(p)}</td>
                <td className="num">{p.cfu ?? '—'}</td>
                <td className="num">{p.average?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export default GradeTrendChart
