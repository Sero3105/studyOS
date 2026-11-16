import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Layers, Plus } from 'lucide-react'
import DeleteButton from '../ui/DeleteButton'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Field, FieldGroup, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '../ui/native-select'
import { Textarea } from '../ui/textarea'
import SubjectDot from '../ui/SubjectDot'
import { EmptyState, ErrorNotice } from '../ui/Feedback'
import { createCard, createMistake, deleteMistake, getMistakes, linkMistakeCard } from '../../services/cardService'
import type { Card as FlashCard, Mistake } from '../../services/cardService'
import type { Subject } from '../../services/subjectService'
import { useUndo } from '../../context/undoContext'
import { errorMessage } from '../../utils/errors'
import { formatDay } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

/**
 * Quaderno degli errori: cosa hai sbagliato, la spiegazione giusta e da dove viene (esercizio, esame).
 * Un errore diventa una flashcard con un clic e torna nel ripasso adattivo.
 */
function MistakesPanel({ subjects, cards, onCardCreated }: { subjects: Subject[]; cards: FlashCard[]; onCardCreated: (card: FlashCard) => void }) {
  const { t, locale } = useLanguage()
  const { undoable } = useUndo()
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [topicId, setTopicId] = useState('')
  const [mistake, setMistake] = useState('')
  const [correction, setCorrection] = useState('')
  const [source, setSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { getMistakes().then(setMistakes).catch((e) => setError(errorMessage(e, t('mistakes.loadError')))) }, [t])

  const topics = subjects.flatMap((s) => s.topics.map((topic) => ({ ...topic, subject: s })))
  const groups = topics.map((topic) => ({ topic, items: mistakes.filter((m) => m.topic_id === topic.id) })).filter((g) => g.items.length)
  const hasCard = (m: Mistake) => m.card_id !== null && cards.some((c) => c.id === m.card_id)

  const add = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const created = await createMistake({ topic_id: Number(topicId), mistake, correction, source: source.trim() || undefined })
      setMistakes((list) => [created, ...list]); setMistake(''); setCorrection(''); setSource('')
    } catch (e) { setError(errorMessage(e, t('cards.saveError'))) }
    finally { setBusy(false) }
  }

  const toCard = async (m: Mistake) => {
    setError('')
    try {
      const card = await createCard({ topic_id: m.topic_id, front: m.mistake, back: m.correction })
      onCardCreated(card)
      const linked = await linkMistakeCard(m.id, card.id)
      setMistakes((list) => list.map((x) => (x.id === m.id ? linked : x)))
    } catch (e) { setError(errorMessage(e, t('cards.saveError'))) }
  }

  const remove = (m: Mistake) => {
    setMistakes((list) => list.filter((x) => x.id !== m.id))
    undoable(t('common.deleted', { title: m.mistake }), () => deleteMistake(m.id), () => setMistakes((list) => [m, ...list]))
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Card aria-labelledby="mistake-new-title">
        <CardHeader>
          <CardTitle><h2 id="mistake-new-title">{t('mistakes.newTitle')}</h2></CardTitle>
          <CardDescription>{t('mistakes.intro')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}
          <form onSubmit={(e) => void add(e)}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="mistake-topic">{t('timer.topic')}</FieldLabel>
                <NativeSelect id="mistake-topic" className="w-full" value={topicId} onChange={(e) => setTopicId(e.target.value)} required>
                  <NativeSelectOption value="">{t('cards.chooseTopic')}</NativeSelectOption>
                  {subjects.filter((s) => s.topics.length).map((s) => (
                    <NativeSelectOptGroup key={s.id} label={s.name}>
                      {s.topics.map((topic) => <NativeSelectOption key={topic.id} value={topic.id}>{topic.title}</NativeSelectOption>)}
                    </NativeSelectOptGroup>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="mistake-text">{t('mistakes.mistake')}</FieldLabel>
                <Textarea id="mistake-text" rows={2} maxLength={5000} required value={mistake} onChange={(e) => setMistake(e.target.value)} placeholder={t('mistakes.mistakePlaceholder')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="mistake-correction">{t('mistakes.correction')}</FieldLabel>
                <Textarea id="mistake-correction" rows={3} maxLength={5000} required value={correction} onChange={(e) => setCorrection(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="mistake-source">{t('mistakes.source')} <span className="font-normal text-muted-foreground">{t('common.optional')}</span></FieldLabel>
                <Input id="mistake-source" maxLength={200} value={source} onChange={(e) => setSource(e.target.value)} placeholder={t('mistakes.sourcePlaceholder')} />
              </Field>
              <Button type="submit" disabled={busy || !topicId || !mistake.trim() || !correction.trim()}>
                <Plus data-icon="inline-start" aria-hidden="true" /> {t('mistakes.add')}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card aria-labelledby="mistake-list-title" className="min-w-0">
        <CardHeader>
          <CardTitle><h2 id="mistake-list-title">{t('mistakes.listTitle', { count: mistakes.length })}</h2></CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <EmptyState compact title={t('mistakes.emptyTitle')}>{t('mistakes.emptyBody')}</EmptyState>
          ) : (
            <ol className="flex flex-col gap-6">
              {groups.map(({ topic, items }) => (
                <li className="flex flex-col gap-1" key={topic.id}>
                  <div className="flex items-center justify-between gap-2 border-b pb-2">
                    <h3 className="flex min-w-0 items-center gap-2 truncate text-xs font-medium text-muted-foreground"><SubjectDot subject={topic.subject} /> {topic.subject.name} / {topic.title}</h3>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{items.length}</span>
                  </div>
                  <ul className="flex flex-col divide-y">
                    {items.map((m) => (
                      <li className="group/mistake flex flex-wrap items-start gap-3 py-3 sm:flex-nowrap" key={m.id}>
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="text-sm break-words text-destructive line-through decoration-destructive/40">{m.mistake}</span>
                          <span className="text-sm break-words text-success">{m.correction}</span>
                          <span className="text-xs text-muted-foreground">{[m.source, formatDay(m.created_at.slice(0, 10), 'long', locale)].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          {hasCard(m)
                            ? <Badge variant="success">{t('mistakes.inCards')}</Badge>
                            : <Button variant="outline" size="xs" onClick={() => void toCard(m)}><Layers data-icon="inline-start" aria-hidden="true" /> {t('mistakes.toCard')}</Button>}
                          <span className="md:opacity-0 md:transition-opacity md:group-focus-within/mistake:opacity-100 md:group-hover/mistake:opacity-100"><DeleteButton label={t('mistakes.delete')} onDelete={() => remove(m)} /></span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MistakesPanel
