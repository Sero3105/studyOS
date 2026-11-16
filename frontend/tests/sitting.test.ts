import { test } from 'node:test'
import assert from 'node:assert/strict'

import { interruptionsIn, lastResume, newSitting, parseChecklist, sittingId, sittingPayload, sittingSummary } from '../src/utils/sitting.ts'
import type { SavedSitting } from '../src/utils/sitting.ts'

const config = { focusMinutes: 25, breakMinutes: 5, goal: ' Cap. 3 ', subjectId: 1, topicId: 7, subject: 'Fisica', topic: 'Onde', checklist: ['es. 1-10', 'teoria'] }

test('checklist: one item per line, blanks dropped, capped', () => {
  assert.deepEqual(parseChecklist(' es. 1-10 \n\n  teoria\n'), ['es. 1-10', 'teoria'])
  assert.equal(parseChecklist(Array.from({ length: 60 }, (_, i) => `v${i}`).join('\n')).length, 50)
  assert.equal(parseChecklist('x'.repeat(300))[0].length, 200)
})

test('sitting id matches the backend pattern', () => {
  assert.match(sittingId(), /^[A-Za-z0-9-]{1,36}$/)
  assert.notEqual(sittingId(), sittingId())
})

test('summary counts minutes, partial blocks, average focus and checklist', () => {
  const sitting = newSitting(config, '2026-11-16', 'abc')
  sitting.checklist[0].done = true
  sitting.blocks = [
    { minutes: 25, partial: false, focus: 3, note: '' },
    { minutes: 25, partial: false, focus: 2, note: 'es. 1-4' },
    { minutes: 12, partial: true, focus: null, note: '' },
  ]
  assert.deepEqual(sittingSummary(sitting), { minutes: 62, blocks: 3, partial: 1, focus: 2.5, done: 1, total: 2 })
  assert.equal(sittingSummary(newSitting(config, '2026-11-16')).focus, null)
})

test('interruptions are counted per block', () => {
  const sitting = { ...newSitting(config, '2026-11-16'), distractions: [{ text: 'a', block: 1 }, { text: 'b', block: 1 }, { text: 'c', block: 2 }] }
  assert.deepEqual([1, 2, 3].map((b) => interruptionsIn(sitting, b)), [2, 1, 0])
})

test('payload trims goal and resume, empty becomes null', () => {
  const sitting = { ...newSitting(config, '2026-11-16'), resume: '  ' }
  const payload = sittingPayload(sitting, config)
  assert.equal(payload.goal, 'Cap. 3')
  assert.equal(payload.resume_note, null)
  assert.deepEqual(payload.checklist, [{ text: 'es. 1-10', done: false }, { text: 'teoria', done: false }])
})

test('last resume: same topic first, else same subject, never for free sessions', () => {
  const saved = (uid: string, subject: number | null, topic: number | null, note: string | null, at: string): SavedSitting => ({
    id: 0, uid, subject_id: subject, topic_id: topic, resume_note: note, updated_at: at, created_at: at,
    started_on: at.slice(0, 10), goal: null, checklist: [], distractions: [],
  })
  const list = [
    saved('a', 1, 7, 'teorema 4.2', '2026-11-10T10:00:00'),
    saved('b', 1, 8, 'cap. 5', '2026-11-12T10:00:00'),
    saved('c', 1, 7, null, '2026-11-14T10:00:00'),
    saved('cur', 1, 7, 'in corso', '2026-11-16T10:00:00'),
  ]
  assert.equal(lastResume(list, { subjectId: 1, topicId: 7 }, 'cur')?.uid, 'a')
  assert.equal(lastResume(list, { subjectId: 1, topicId: null }, 'cur')?.uid, 'b')
  assert.equal(lastResume(list, { subjectId: null, topicId: null }), null)
  assert.equal(lastResume(list, { subjectId: 2, topicId: null }), null)
})
