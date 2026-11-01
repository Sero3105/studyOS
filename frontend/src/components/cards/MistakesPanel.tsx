import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Layers, Plus } from 'lucide-react'
import DeleteButton from '../ui/DeleteButton'
import SubjectDot from '../ui/SubjectDot'
import { EmptyState, ErrorNotice } from '../ui/Feedback'
import { createCard, createMistake, deleteMistake, getMistakes, linkMistakeCard } from '../../services/cardService'
import type { Card, Mistake } from '../../services/cardService'
import type { Subject } from '../../services/subjectService'
import { useUndo } from '../../context/undoContext'
import { errorMessage } from '../../utils/errors'
import { formatDay } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

/**
 * Quaderno degli errori: cosa hai sbagliato, la spiegazione giusta e da dove viene (esercizio, esame).
 * Un errore diventa una flashcard con un clic e torna nel ripasso adattivo.
 */
function MistakesPanel({ subjects, cards, onCardCreated }: { subjects: Subject[]; cards: Card[]; onCardCreated: (card: Card) => void }) {
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
    <div className="cards-layout">
      <section className="panel" aria-labelledby="mistake-new-title">
        <h2 id="mistake-new-title" className="panel-title">{t('mistakes.newTitle')}</h2>
        <p className="panel-meta">{t('mistakes.intro')}</p>
        {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}
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
            <span className="field-label">{t('mistakes.mistake')}</span>
            <textarea rows={2} maxLength={5000} required value={mistake} onChange={(e) => setMistake(e.target.value)} placeholder={t('mistakes.mistakePlaceholder')} />
          </label>
          <label className="field">
            <span className="field-label">{t('mistakes.correction')}</span>
            <textarea rows={3} maxLength={5000} required value={correction} onChange={(e) => setCorrection(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">{t('mistakes.source')} <em>{t('common.optional')}</em></span>
            <input maxLength={200} value={source} onChange={(e) => setSource(e.target.value)} placeholder={t('mistakes.sourcePlaceholder')} />
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy || !topicId || !mistake.trim() || !correction.trim()}>
              <Plus aria-hidden="true" /> {t('mistakes.add')}
            </button>
          </div>
        </form>
      </section>

      <section className="panel" aria-labelledby="mistake-list-title">
        <h2 id="mistake-list-title" className="panel-title">{t('mistakes.listTitle', { count: mistakes.length })}</h2>
        {groups.length === 0 ? (
          <EmptyState compact title={t('mistakes.emptyTitle')}>{t('mistakes.emptyBody')}</EmptyState>
        ) : (
          <ol className="grouped-list">
            {groups.map(({ topic, items }) => (
              <li className="list-group" key={topic.id}>
                <div className="list-group-head">
                  <h3 className="list-group-title"><SubjectDot subject={topic.subject} /> {topic.subject.name} / {topic.title}</h3>
                  <span className="panel-meta num">{items.length}</span>
                </div>
                <ul className="rows">
                  {items.map((m) => (
                    <li className="row mistake-row" key={m.id}>
                      <span className="row-main">
                        <span className="row-title mistake-text">{m.mistake}</span>
                        <span className="mistake-correction">{m.correction}</span>
                        <span className="row-meta">{[m.source, formatDay(m.created_at.slice(0, 10), 'long', locale)].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className="row-actions">
                        {hasCard(m)
                          ? <span className="tag tag-success">{t('mistakes.inCards')}</span>
                          : <button className="tag tag-button" type="button" onClick={() => void toCard(m)}><Layers aria-hidden="true" /> {t('mistakes.toCard')}</button>}
                        <span className="row-reveal"><DeleteButton label={t('mistakes.delete')} onDelete={() => remove(m)} /></span>
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
  )
}

export default MistakesPanel
