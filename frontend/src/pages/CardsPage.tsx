import { useCallback, useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileUp, Layers, NotebookPen, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import DeleteButton from '../components/ui/DeleteButton'
import { useUndo } from '../context/undoContext'
import ProgressBar from '../components/ui/ProgressBar'
import SubjectDot from '../components/ui/SubjectDot'
import ReviewRating from '../components/ReviewRating'
import Segmented from '../components/ui/Segmented'
import MistakesPanel from '../components/cards/MistakesPanel'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createCard, createCards, deleteCard, getCards, reviewCard } from '../services/cardService'
import type { Card } from '../services/cardService'
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
  const [cards, setCards] = useState<Card[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [topicId, setTopicId] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [busy, setBusy] = useState(false)
  // Ripasso in corso: carte fissate all'avvio, così una carta "difficile" (domani) non riappare subito.
  const [quiz, setQuiz] = useState<Card[] | null>(null)
  const [quizTotal, setQuizTotal] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [tab, setTab] = useState<'cards' | 'mistakes'>('cards')
  const [notice, setNotice] = useState('')

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
  const topicOf = (card: Card) => topics.find((x) => x.id === card.topic_id)
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

  const remove = (card: Card) => {
    setCards((c) => c.filter((x) => x.id !== card.id))
    undoable(t('common.deleted', { title: card.front }), () => deleteCard(card.id), () => setCards((c) => [...c, card]))
  }

  const rate = useCallback(async (card: Card, rating: Rating) => {
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
    <div className="page cards-page">
      <PageHeader
        title={t('cards.title')}
        description={loading ? undefined : t('cards.description', { due: due.length, total: cards.length })}
        actions={cards.length > 0 && (
          <button className="btn btn-secondary" type="button" onClick={exportAnki} title={t('cards.exportHint')}>
            <Download aria-hidden="true" /> {t('cards.export')}
          </button>
        )}
      />

      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}

      {!loading && topics.length > 0 && (
        <div className="toolbar">
          <Segmented
            label={t('cards.tabs')}
            value={tab}
            onChange={(value) => { setTab(value); setNotice('') }}
            options={[{ value: 'cards', label: t('cards.title'), count: cards.length }, { value: 'mistakes', label: t('mistakes.title') }]}
          />
        </div>
      )}

      {loading ? (
        <LoadingRows rows={4} label={t('cards.loading')} />
      ) : topics.length === 0 ? (
        <section className="panel">
          <EmptyState title={t('cards.noTopicsTitle')} action={<Link className="btn btn-primary" to="/subjects">{t('nav.subjects')}</Link>}>
            {t('cards.noTopicsBody')}
          </EmptyState>
        </section>
      ) : tab === 'mistakes' ? (
        <MistakesPanel subjects={subjects} cards={cards} onCardCreated={(card) => setCards((c) => [...c, card])} />
      ) : (
        <>
          {current ? (
            <section className="panel card-quiz" aria-labelledby="card-quiz-title">
              <div className="card-quiz-head">
                <h2 id="card-quiz-title" className="panel-meta">
                  {currentTopic && <><SubjectDot subject={currentTopic.subject} /> {currentTopic.subject.name} / {currentTopic.title}</>}
                </h2>
                <span className="panel-meta num">{t('cards.progress', { done: done + 1, total: quizTotal })}</span>
              </div>
              <ProgressBar percent={(done / quizTotal) * 100} label={t('cards.quizLabel')} />
              <p className="card-face" aria-live="polite">{current.front}</p>
              {revealed ? (
                <>
                  <p className="card-face card-back">{current.back}</p>
                  <div className="card-quiz-actions">
                    <span className="panel-meta">{t('review.howDidItGo')}</span>
                    <ReviewRating size="lg" disabled={busy} onRate={(rating) => void rate(current, rating)} />
                  </div>
                </>
              ) : (
                <div className="card-quiz-actions">
                  <button className="btn btn-ghost" type="button" onClick={() => setQuiz(null)}>{t('cards.stop')}</button>
                  <button className="btn btn-primary" type="button" onClick={() => setRevealed(true)} autoFocus>{t('cards.reveal')}</button>
                </div>
              )}
              <p className="card-quiz-keys">{t(revealed ? 'cards.keysRate' : 'cards.keysReveal')}</p>
            </section>
          ) : (
            <section className="panel card-today" aria-labelledby="card-today-title">
              <div>
                <h2 id="card-today-title" className="panel-meta">{t('cards.todayTitle')}</h2>
                <p className="card-today-count num">{due.length}</p>
                <p className="panel-meta">
                  {due.length ? t('cards.todayDue') : cards.length ? (nextDue ? t('cards.todayNone', { when: relativeDay(nextDue, locale).toLowerCase() }) : t('cards.allDone')) : t('cards.todayEmpty')}
                </p>
              </div>
              <button className="btn btn-primary btn-lg" type="button" disabled={due.length === 0} onClick={startQuiz}>
                <Layers aria-hidden="true" /> {t('cards.start')}
              </button>
            </section>
          )}

          <div className="cards-layout">
            <section className="panel" aria-labelledby="card-new-title">
              <h2 id="card-new-title" className="panel-title">{t('cards.newTitle')}</h2>
              <form className="card-form" onSubmit={(e) => void add(e)}>
                <label className="field">
                  <span className="field-label">{t('timer.topic')}</span>
                  <select value={topicId} onChange={(e) => setTopicId(e.target.value)} required>
                    <option value="">{t('cards.chooseTopic')}</option>
                    {subjects.filter((s) => s.topics.length).map((s) => (
                      <optgroup key={s.id} label={s.name}>
                        {s.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t('cards.front')}</span>
                  <textarea rows={2} maxLength={2000} required value={front} onChange={(e) => setFront(e.target.value)} placeholder={t('cards.frontPlaceholder')} />
                </label>
                <label className="field">
                  <span className="field-label">{t('cards.back')}</span>
                  <textarea rows={3} maxLength={5000} required value={back} onChange={(e) => setBack(e.target.value)} />
                </label>
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit" disabled={busy || !topicId || !front.trim() || !back.trim()}>
                    <Plus aria-hidden="true" /> {t('cards.add')}
                  </button>
                </div>
              </form>
              <div className="card-tools">
                <h3 className="settings-subtitle">{t('cards.moreWays')}</h3>
                <div className="settings-actions">
                  <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void fromNotes()} title={t('cards.fromNotesHint')}>
                    <NotebookPen aria-hidden="true" /> {t('cards.fromNotes')}
                  </button>
                  <label className={`btn btn-secondary${busy || !topicId ? ' is-disabled' : ''}`} title={topicId ? t('cards.importHint') : t('cards.importNeedsTopic')}>
                    <FileUp aria-hidden="true" /> {t('cards.import')}
                    <input className="visually-hidden" type="file" accept=".txt,.csv,.tsv,text/plain,text/csv" disabled={busy || !topicId} onChange={(e) => void importFile(e)} />
                  </label>
                </div>
                <p className="panel-meta">{topicId ? t('cards.toolsHint') : t('cards.importNeedsTopic')}</p>
              </div>
            </section>

            <section className="panel" aria-labelledby="card-list-title">
              <h2 id="card-list-title" className="panel-title">{t('cards.manageTitle')}</h2>
              {groups.length === 0 ? (
                <EmptyState compact title={t('cards.emptyTitle')}>{t('cards.emptyBody')}</EmptyState>
              ) : (
                <ol className="grouped-list">
                  {groups.map(({ topic, cards: list }) => (
                    <li className="list-group" key={topic.id}>
                      <div className="list-group-head">
                        <h3 className="list-group-title"><SubjectDot subject={topic.subject} /> {topic.subject.name} / {topic.title}</h3>
                        <span className="panel-meta num">{list.length}</span>
                      </div>
                      <ul className="rows">
                        {list.map((card) => (
                          <li className="row" key={card.id}>
                            <span className="row-main">
                              <span className="row-title">{card.front}</span>
                              <span className="row-meta card-answer">{card.back}</span>
                            </span>
                            {card.due_date <= todayIso()
                              ? <span className="tag tag-accent">{t('cards.dueNow')}</span>
                              : <span className="row-meta num">{relativeDay(card.due_date, locale)}</span>}
                            <span className="row-reveal">
                              <DeleteButton label={t('cards.delete')} onDelete={() => remove(card)} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default CardsPage
