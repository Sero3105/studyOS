import { useState } from 'react'
import { Check, ListPlus } from 'lucide-react'
import SittingChecklist from './SittingChecklist'
import Figures from '../ui/Figures'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Field, FieldDescription, FieldLabel } from '../ui/field'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'
import { DistractionList } from './Distractions'
import { useTimer } from '../../context/useTimer'
import { useLanguage } from '../../i18n/useLanguage'
import { createTask } from '../../services/taskService'
import { addDays, formatMinutes, todayIso } from '../../utils/dates'
import { sittingSummary } from '../../utils/sitting'

/**
 * Riepilogo a fine seduta: quanto, come (focus), cosa è stato fatto blocco per blocco,
 * cosa resta della checklist (diventa task per domani) e da dove ripartire la prossima volta.
 * "Chiudi" salva la seduta e torna al modulo.
 */
function SittingRecap() {
  const { t } = useLanguage()
  const { config, sitting, setResume, clear } = useTimer()
  const [tasks, setTasks] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  // Voci già diventate task: un nuovo tentativo dopo un errore riparte dalle altre.
  const [created, setCreated] = useState(0)
  if (!config || !sitting) return null
  const summary = sittingSummary(sitting)
  const left = sitting.checklist.filter((item) => !item.done)

  const leftToTasks = async () => {
    setTasks('busy')
    try {
      for (const [i, item] of left.entries()) {
        if (i < created) continue
        await createTask({
          title: item.text, priority: 'medium', due_date: addDays(todayIso(), 1),
          subject_id: config.subjectId ?? undefined, topic_id: config.topicId ?? undefined,
        })
        setCreated(i + 1)
      }
      setTasks('done')
    } catch { setTasks('error') }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Figures label={t('sitting.recapTitle')} items={[
          { label: t('sitting.studied'), value: formatMinutes(summary.minutes) },
          { label: t('sitting.blocks'), value: summary.blocks, sub: summary.partial > 0 ? t('sitting.partialCount', { count: summary.partial }) : undefined },
          { label: t('session.focus'), value: summary.focus === null ? '—' : t(`session.focus.${Math.round(summary.focus) as 1 | 2 | 3}`) },
          { label: t('sitting.checklist'), value: summary.total ? `${summary.done}/${summary.total}` : '—' },
        ]} />

        <Card>
          <CardHeader>
            <CardTitle><h2 id="recap-blocks-title">{t('sitting.whatYouDid')}</h2></CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col divide-y" aria-labelledby="recap-blocks-title">
              {sitting.blocks.map((block, index) => (
                <li className="flex items-center gap-4 py-3 first:pt-0 last:pb-0" key={index}>
                  <span className="w-14 shrink-0 font-mono text-sm text-primary tabular-nums">{formatMinutes(block.minutes)}</span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium break-words">{block.note || t('sitting.blockN', { n: index + 1 })}</span>
                    <span className="text-xs text-muted-foreground">
                      {[block.partial && t('sitting.partial'), block.focus && t(`session.focus.${block.focus}`)].filter(Boolean).join(' · ') || t('sitting.notRated')}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="recap-resume">{t('sitting.resume')} <span className="font-normal text-muted-foreground">{t('common.optional')}</span></FieldLabel>
              <Textarea id="recap-resume" rows={2} maxLength={1000} value={sitting.resume} onChange={(e) => setResume(e.target.value)} placeholder={t('sitting.resumePlaceholder')} />
              <FieldDescription>{t('sitting.resumeHint')}</FieldDescription>
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <SittingChecklist />
        {left.length > 0 && (
          <div className="flex flex-col gap-2" aria-live="polite">
            {tasks === 'done' ? (
              <p className="flex items-center gap-2 text-sm text-success" role="status"><Check className="size-4" aria-hidden="true" /> {t('sitting.tasksCreated', { count: left.length })}</p>
            ) : (
              <Button variant="secondary" onClick={() => void leftToTasks()} disabled={tasks === 'busy'}>
                {tasks === 'busy' ? <Spinner data-icon="inline-start" /> : <ListPlus data-icon="inline-start" aria-hidden="true" />} {t('sitting.leftToTasks', { count: left.length })}
              </Button>
            )}
            {tasks === 'error' && <p className="text-sm text-destructive" role="alert">{t('planner.saveError')}</p>}
          </div>
        )}
        <DistractionList />
        <Button size="lg" onClick={clear} className="w-full">
          <Check data-icon="inline-start" aria-hidden="true" /> {t('sitting.close')}
        </Button>
      </div>
    </div>
  )
}

export default SittingRecap
