import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildHeatmap, heatLevel, planVsActual } from '../src/utils/studyStats.ts'

test('heat levels', () => {
  assert.deepEqual([0, 10, 25, 26, 60, 61, 121].map(heatLevel), [0, 1, 1, 2, 2, 3, 4])
})

test('heatmap is Monday-aligned, sums the same day and stops at today', () => {
  // 2026-10-23 è un venerdì.
  const weeks = buildHeatmap([
    { studied_on: '2026-10-23', duration_minutes: 30, subject_id: null },
    { studied_on: '2026-10-23', duration_minutes: 40, subject_id: null },
  ], '2026-10-23', 2)
  assert.equal(weeks.length, 2)
  assert.equal(weeks[0][0].date, '2026-10-12')
  assert.equal(weeks[1].length, 5)
  assert.deepEqual(weeks[1][4], { date: '2026-10-23', minutes: 70, level: 3 })
})

test('plan vs actual counts only the window and the subject', () => {
  const rows = planVsActual(
    [{ id: 1, name: 'Analisi' }, { id: 2, name: 'Reti' }, { id: 3, name: 'Vuota' }],
    [
      { due_date: '2026-10-20', status: 'done', subject_id: 1 },
      { due_date: '2026-10-22', status: 'todo', subject_id: 1 },
      { due_date: '2026-11-30', status: 'todo', subject_id: 1 },
      { due_date: '2026-08-01', status: 'done', subject_id: 2 },
    ],
    [{ studied_on: '2026-10-21', duration_minutes: 50, subject_id: 2 }],
    '2026-10-23',
  )
  assert.deepEqual(rows, [
    { subjectId: 2, name: 'Reti', planned: 0, done: 0, minutes: 50 },
    { subjectId: 1, name: 'Analisi', planned: 2, done: 1, minutes: 0 },
  ])
})
