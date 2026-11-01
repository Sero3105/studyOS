import { test } from 'node:test'
import assert from 'node:assert/strict'

import { examReadiness, todaySuggestions } from '../src/utils/planning.ts'

const topic = (id: number, completed = false) => ({ id, subject_id: 1, title: `T${id}`, completed, notes: null, difficulty: 2 as const, created_at: '' })
const subject = { id: 1, user_id: 1, name: 'Analisi', color: null, created_at: '', topics: [topic(1, true), topic(2), topic(3)] }
const task = (id: number, extra: object) => ({
  id, user_id: 1, title: `task ${id}`, description: null, due_date: '2026-11-01', priority: 'medium' as const, status: 'todo' as const,
  subject_id: 1, topic_id: null, recurrence: null, review_interval: null, scheduled_time: null, planned_minutes: null, created_at: '', updated_at: '', ...extra,
})
const exam = { id: 9, user_id: 1, title: 'Scritto', subject: 'Analisi', subject_id: 1, exam_date: '2026-11-10', exam_time: null, location: null, notes: null,
  status: 'planned' as const, cfu: 9, grade: null, honors: false, created_at: '', updated_at: '', attempts: [] }

test('today suggestions order and exam topic', () => {
  const tasks = [
    task(1, { priority: 'low', due_date: '2026-10-30' }),
    task(2, { priority: 'high' }),
    task(3, { review_interval: 3, topic_id: 1 }),
    task(4, { scheduled_time: '15:00:00' }),
    task(5, { scheduled_time: '09:00:00' }),
    task(6, { due_date: '2026-11-05' }),
    task(7, { status: 'done' }),
  ]
  const sessions = [{ topic_id: 2, duration_minutes: 60 }]
  const out = todaySuggestions({ tasks, cards: [{ due_date: '2026-11-01' }, { due_date: '2026-12-01' }], subjects: [subject], exams: [exam], sessions }, '2026-11-01', 10)
  assert.deepEqual(out.map((s) => s.kind === 'cards' ? `cards:${s.count}` : s.kind === 'exam' ? `exam:${s.topic.id}:${s.days}` : `${s.kind}:${s.task.id}`),
    ['block:5', 'block:4', 'review:3', 'cards:1', 'task:2', 'task:1', 'exam:3:9'])
  assert.equal(todaySuggestions({ tasks, cards: [], subjects: [subject], exams: [exam], sessions }, '2026-11-01').length, 5)
})

test('exam readiness weights topics, cards and plan', () => {
  const r = examReadiness(exam, {
    subjects: [subject],
    cards: [{ topic_id: 2, interval: 10 }, { topic_id: 3, interval: 1 }, { topic_id: 99, interval: 30 }],
    tasks: [task(1, { due_date: '2026-10-30' }), task(2, { due_date: '2026-11-03' })],
    sessions: [{ subject_id: 1, duration_minutes: 50 }, { subject_id: 2, duration_minutes: 99 }],
  }, '2026-11-01')
  // argomenti 1/3 (peso 2), carte 1/2 (peso 1), piano 1 in ritardo su 2 (peso 1)
  assert.equal(Math.round(r.score! * 1000), Math.round(((2 / 3) + 0.5 + 0.5) / 4 * 1000))
  assert.deepEqual([r.topics, r.cards, r.plan, r.minutes], [{ done: 1, total: 3 }, { mastered: 1, total: 2 }, { late: 1, total: 2 }, 50])
  assert.equal(examReadiness({ subject_id: null }, { subjects: [], cards: [], tasks: [], sessions: [] }, '2026-11-01').score, null)
})
