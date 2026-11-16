import { useCallback, useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileUp, Layers, NotebookPen, Plus } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '../components/ui/PageHeader'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Field, FieldGroup, FieldLabel } from '../components/ui/field'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '../components/ui/native-select'
import { Textarea } from '../components/ui/textarea'
import DeleteButton from '../components/ui/DeleteButton'
import { useUndo } from '../context/undoContext'
import ProgressBar from '../components/ui/ProgressBar'
import SubjectDot from '../components/ui/SubjectDot'
import ReviewRating from '../components/ReviewRating'
import Segmented from '../components/ui/Segmented'
import MistakesPanel from '../components/cards/MistakesPanel'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createCard, createCards, deleteCard, getCards, reviewCard } from '../services/cardService'
import type { Card as FlashCard } from '../services/cardService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import type { ReviewRating as Rating } from '../services/taskService'
import { relativeDay, todayIso } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { saveBlob } from '../utils/download'
import { ankiExport, cardsFromNotes, parseCardFile } from '../utils/anki'
import { useLanguage } from '../i18n/useLanguage'

const KEY_RATINGS: Record<string, Rating> = { 1: 'hard', 2: 'ok', 3: 'easy' }

/**
 * Flashcard: domande e risposte per argomento, ripassate con la stessa
 * ripetizione dilazionata dei ripassi (difficile → domani, facile → molto più avanti).
 * In alto il ripasso di oggi, sotto una carta nuova e tutte le carte per argomento.
 */
function CardsPage() {
  const { t, locale } = useLanguage()
  const { undoable } = useUndo()
  const [cards, setCards] = useState<FlashCard[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [topicId, setTopicId] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [busy, setBusy] = useState(false)
  // Ripasso in corso: carte fissate all'avvio, così una carta "difficile" (domani) non riappare subito.
  const [quiz, setQuiz] = useState<FlashCard[] | null>(null)
  const [quizTotal, setQuizTotal] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [tab, setTab] = useState<'cards' | 'mistakes'>('cards')
  const setNotice = (message: string) => { if (message) toast.success(message) }

  const load = useCallback(async () => {
    try {
      setError('')
      const [cardList, subjectList] = await Promise.all([getCards(), getSubjects()])
      setCards(cardList); setSubjects(subjectList)
    } catch (e) { setError(errorMessage(e, t('cards.loadError'))) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  const topics = subjects.flatMap((s) => s.topics.map((topic) => ({ ...topic, subject: s })))
  const topicOf = (card: FlashCard) => topics.find((x) => x.id === card.topic_id)
  const due = cards.filter((c) => c.due_date <= todayIso())
  const nextDue = cards.map((c) => c.due_date).filter((d) => d > todayIso()).sort()[0]
  const groups = topics.map((topic) => ({ topic, cards: cards.filter((c) => c.topic_id === topic.id) })).filter((g) => g.cards.length)
  const current = quiz?.[0]

  const startQuiz = () => { setQuiz(due); setQuizTotal(due.length); setRevealed(false) }

  const add = async (event: FormEvent) => {
    event.preventDefault()
    if (!topicId || !front.trim() || !back.trim()) return
    setBusy(true); setError('')
    try {
      const card = await createCard({ topic_id: Number(topicId), front, back })
      setCards((c) => [...c, card]); setFront(''); setBack('')
    } catch (e) { setError(errorMessage(e, t('cards.saveError'))) }
    finally { setBusy(false) }
  }

  // Carte da righe "domanda :: risposta" di tutte le note; quelle già presenti vengono saltate dal server.
  const fromNotes = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      let created = 0
      let skipped = 0
      for (const topic of topics) {
        const faces = cardsFromNotes(topic.notes ?? '')
        if (!faces.length) continue
        const result = await createCards(topic.id, faces)
        created += result.created; skipped += result.skipped
      }
      setNotice(created + skipped ? t('cards.importDone', { created, skipped }) : t('cards.notesNone'))
      if (created) setCards(await getCards())
    } catch (e) { setError(errorMessage(e, t('cards.saveError'))) }
    finally { setBusy(false) }
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !topicId) return
    setBusy(true); setError(''); setNotice('')
    try {
      const faces = parseCardFile(await file.text())
      if (!faces.length) { setError(t('cards.importEmpty')); return }
      const result = await createCards(Number(topicId), faces.slice(0, 2000))
      setNotice(t('cards.importDone', result))
      if (result.created) setCards(await getCards())
    } catch (e) { setError(errorMessage(e, t('cards.importError'))) }
    finally { setBusy(false) }
  }

  const remove = (card: FlashCard) => {
    setCards((c) => c.filter((x) => x.id !== card.id))
    undoable(t('common.deleted', { title: card.front }), () => deleteCard(card.id), () => setCards((c) => [...c, card]))
  }

  const rate = useCallback(async (card: FlashCard, rating: Rating) => {
    setBusy(true)
    try {
      const updated = await reviewCard(card.id, rating)
      setCards((c) => c.map((x) => (x.id === updated.id ? updated : x)))
      setQuiz((q) => (q && q.length > 1 ? q.slice(1) : null)); setRevealed(false)
    } catch (e) { setError(errorMessage(e, t('cards.saveError'))) }
    finally { setBusy(false) }
  }, [t])

  // Tastiera durante il ripasso: spazio mostra la risposta, 1-2-3 la valutano, Esc interrompe.
  useEffect(() => {
    if (!current) return
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      if (event.key === 'Escape') setQuiz(null)
      else if (!revealed && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); setRevealed(true) }
      else if (revealed && !busy && KEY_RATINGS[event.key]) void rate(current, KEY_RATINGS[event.key])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, revealed, busy, rate])

  const exportAnki = () => {
    const rows = cards.map((c) => ({ front: c.front, back: c.back, tag: topicOf(c)?.subject.name ?? 'StudyOS' }))
    saveBlob(new Blob([ankiExport(rows)], { type: 'text/plain;charset=utf-8' }), 'studyos-flashcards.txt')
  }

  const currentTopic = current && topicOf(current)
  const done = quizTotal - (quiz?.length ?? 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('cards.title')}
        description={loading ? undefined : t('cards.description', { due: due.length, total: cards.length })}
        actions={cards.length > 0 && (
          <Button variant="outline" onClick={exportAnki} title={t('cards.exportHint')}>
            <Download data-icon="inline-start" aria-hidden="true" /> {t('cards.export')}
          </Button>
        )}
      />

      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}

      {!loading && topics.length > 0 && (
        <Segmented
          label={t('cards.tabs')}
          value={tab}
          onChange={setTab}
          options={[{ value: 'cards', label: t('cards.title'), count: cards.length }, { value: 'mistakes', label: t('mistakes.title') }]}
        />
      )}

      {loading ? (
        <LoadingRows rows={4} label={t('cards.loading')} />
      ) : topics.length === 0 ? (
        <EmptyState title={t('cards.noTopicsTitle')} action={<Button asChild><Link to="/subjects">{t('nav.subjects')}</Link></Button>}>
          {t('cards.noTopicsBody')}
        </EmptyState>
      ) : tab === 'mistakes' ? (
        <MistakesPanel subjects={subjects} cards={cards} onCardCreated={(card) => setCards((c) => [...c, card])} />
      ) : (
        <>
          {current ? (
            <Card aria-labelledby="card-quiz-title" className="mx-auto w-full max-w-3xl">
              <CardContent className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 id="card-quiz-title" className="flex min-w-0 items-center gap-2 truncate text-sm text-muted-foreground">
                    {currentTopic && <><SubjectDot subject={currentTopic.subject} /> {currentTopic.subject.name} / {currentTopic.title}</>}
                  </h2>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{t('cards.progress', { done: done + 1, total: quizTotal })}</span>
                </div>
                <ProgressBar percent={(done / quizTotal) * 100} label={t('cards.quizLabel')} className="h-1" />
                <p className="min-h-24 py-4 text-center text-xl font-medium text-balance whitespace-pre-line md:text-2xl" aria-live="polite">{current.front}</p>
                {revealed ? (
                  <>
                    <p className="rounded-lg border border-primary/25 bg-primary/5 p-5 text-center text-base whitespace-pre-line">{current.back}</p>
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t('review.howDidItGo')}</span>
                      <ReviewRating size="lg" disabled={busy} onRate={(rating) => void rate(current, rating)} />
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center gap-2">
                    <Button variant="ghost" size="lg" onClick={() => setQuiz(null)}>{t('cards.stop')}</Button>
                    <Button size="lg" className="min-w-40" onClick={() => setRevealed(true)} autoFocus>{t('cards.reveal')}</Button>
                  </div>
                )}
                <p className="hidden text-center text-xs text-muted-foreground md:block">{t(revealed ? 'cards.keysRate' : 'cards.keysReveal')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card aria-labelledby="card-today-title" className="relative">
              <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/8 blur-3xl" />
              <CardContent className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <h2 id="card-today-title" className="font-mono text-xs tracking-wider text-muted-foreground uppercase">{t('cards.todayTitle')}</h2>
                  <p className="font-mono text-6xl font-semibold tracking-tighter tabular-nums">{due.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {due.length ? t('cards.todayDue') : cards.length ? (nextDue ? t('cards.todayNone', { when: relativeDay(nextDue, locale).toLowerCase() }) : t('cards.allDone')) : t('cards.todayEmpty')}
                  </p>
                </div>
                <Button size="lg" disabled={due.length === 0} onClick={startQuiz}>
                  <Layers data-icon="inline-start" aria-hidden="true" /> {t('cards.start')}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <Card aria-labelledby="card-new-title">
              <CardHeader>
                <CardTitle><h2 id="card-new-title">{t('cards.newTitle')}</h2></CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <form onSubmit={(e) => void add(e)}>
                  <FieldGroup className="gap-4">
                    <Field>
                      <FieldLabel htmlFor="card-topic">{t('timer.topic')}</FieldLabel>
                      <NativeSelect id="card-topic" className="w-full" value={topicId} onChange={(e) => setTopicId(e.target.value)} required>
                        <NativeSelectOption value="">{t('cards.chooseTopic')}</NativeSelectOption>
                        {subjects.filter((s) => s.topics.length).map((s) => (
                          <NativeSelectOptGroup key={s.id} label={s.name}>
                            {s.topics.map((topic) => <NativeSelectOption key={topic.id} value={topic.id}>{topic.title}</NativeSelectOption>)}
                          </NativeSelectOptGroup>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="card-front">{t('cards.front')}</FieldLabel>
                      <Textarea id="card-front" rows={2} maxLength={2000} required value={front} onChange={(e) => setFront(e.target.value)} placeholder={t('cards.frontPlaceholder')} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="card-back">{t('cards.back')}</FieldLabel>
                      <Textarea id="card-back" rows={3} maxLength={5000} required value={back} onChange={(e) => setBack(e.target.value)} />
                    </Field>
                    <Button type="submit" disabled={busy || !topicId || !front.trim() || !back.trim()}>
                      <Plus data-icon="inline-start" aria-hidden="true" /> {t('cards.add')}
                    </Button>
                  </FieldGroup>
                </form>
                <div className="flex flex-col gap-3 border-t pt-5">
                  <h3 className="text-sm font-medium">{t('cards.moreWays')}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={busy} onClick={() => void fromNotes()} title={t('cards.fromNotesHint')}>
                      <NotebookPen data-icon="inline-start" aria-hidden="true" /> {t('cards.fromNotes')}
                    </Button>
                    <Button variant="outline" asChild>
                      <label aria-disabled={busy || !topicId} className="aria-disabled:pointer-events-none aria-disabled:opacity-50" title={topicId ? t('cards.importHint') : t('cards.importNeedsTopic')}>
                        <FileUp data-icon="inline-start" aria-hidden="true" /> {t('cards.import')}
                        <input className="sr-only" type="file" accept=".txt,.csv,.tsv,text/plain,text/csv" disabled={busy || !topicId} onChange={(e) => void importFile(e)} />
                      </label>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{topicId ? t('cards.toolsHint') : t('cards.importNeedsTopic')}</p>
                </div>
              </CardContent>
            </Card>

            <Card aria-labelledby="card-list-title" className="min-w-0">
              <CardHeader>
                <CardTitle><h2 id="card-list-title">{t('cards.manageTitle')}</h2></CardTitle>
              </CardHeader>
              <CardContent>
                {groups.length === 0 ? (
                  <EmptyState compact title={t('cards.emptyTitle')}>{t('cards.emptyBody')}</EmptyState>
                ) : (
                  <ol className="flex flex-col gap-6">
                    {groups.map(({ topic, cards: list }) => (
                      <li className="flex flex-col gap-1" key={topic.id}>
                        <div className="flex items-center justify-between gap-2 border-b pb-2">
                          <h3 className="flex min-w-0 items-center gap-2 truncate text-xs font-medium text-muted-foreground"><SubjectDot subject={topic.subject} /> {topic.subject.name} / {topic.title}</h3>
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">{list.length}</span>
                        </div>
                        <ul className="flex flex-col divide-y">
                          {list.map((card) => (
                            <li className="group/card flex items-center gap-3 py-2.5" key={card.id}>
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="text-sm font-medium break-words">{card.front}</span>
                                <span className="line-clamp-2 text-xs text-muted-foreground">{card.back}</span>
                              </span>
                              {card.due_date <= todayIso()
                                ? <Badge variant="accent">{t('cards.dueNow')}</Badge>
                                : <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{relativeDay(card.due_date, locale)}</span>}
                              <span className="md:opacity-0 md:transition-opacity md:group-focus-within/card:opacity-100 md:group-hover/card:opacity-100">
                                <DeleteButton label={t('cards.delete')} onDelete={() => remove(card)} />
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
        </>
      )}
    </div>
  )
}

export default CardsPage
