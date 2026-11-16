import Section from './Section'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { formatMinutes } from '../../utils/dates'
import type { ExamStatsRow } from '../../utils/planning'
import { useLanguage } from '../../i18n/useLanguage'

/** Esami in arrivo: tempo già dato, ore per CFU e argomenti ancora scoperti. */
function ExamStatsTable({ rows }: { rows: ExamStatsRow[] }) {
  const { t, locale } = useLanguage()
  return (
    <Section id="stats-exams-title" title={t('stats.examsTitle')} meta={t('stats.examsMeta')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t('stats.examsExam')}</TableHead>
            <TableHead scope="col" className="text-right">{t('stats.examsDays')}</TableHead>
            <TableHead scope="col" className="text-right">{t('stats.planStudied')}</TableHead>
            <TableHead scope="col" className="text-right">{t('stats.examsPerCfu')}</TableHead>
            <TableHead scope="col">{t('stats.examsToCatchUp')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.exam.id}>
              <TableHead scope="row" className="font-normal text-foreground">{row.exam.title}</TableHead>
              <TableCell className="text-right font-mono tabular-nums">{row.days === 0 ? t('common.today') : row.days}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{row.minutes ? formatMinutes(row.minutes) : '—'}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{row.hoursPerCfu === null ? '—' : `${row.hoursPerCfu.toLocaleString(locale, { maximumFractionDigits: 1 })} h`}</TableCell>
              <TableCell className="font-mono tabular-nums">
                {row.topics ? t('stats.examsTopics', { count: row.toCatchUp, total: row.topics }) : '—'}
                {row.untouched > 0 && <span className="text-warning"> · {t('stats.examsUntouched', { count: row.untouched })}</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  )
}

export default ExamStatsTable
