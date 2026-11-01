import { test } from 'node:test'
import assert from 'node:assert/strict'

import { toCsv } from '../src/utils/csv.ts'
import { focusBySubject, minutesByKind } from '../src/utils/studyStats.ts'

test('csv quotes separators, quotes and newlines', () => {
  assert.equal(toCsv([['a', 1, null], ['x;y', 'di "lui"', 'riga\nnuova']]), '\uFEFFa;1;\r\n"x;y";"di ""lui""";"riga\nnuova"\r\n')
})

test('minutes by kind and focus by subject', () => {
  const sessions = [
    { kind: 'study', duration_minutes: 30, subject_id: 1, focus: 3 },
    { kind: 'lesson', duration_minutes: 90, subject_id: 1, focus: 1 },
    { kind: 'study', duration_minutes: 25, subject_id: 2, focus: null },
    { kind: 'study', duration_minutes: 50, subject_id: null, focus: 3 },
  ]
  assert.deepEqual(minutesByKind(sessions), [{ kind: 'study', minutes: 105 }, { kind: 'lesson', minutes: 90 }])
  assert.deepEqual(focusBySubject(sessions), [{ subjectId: null, average: 3, count: 1 }, { subjectId: 1, average: 2, count: 2 }])
})
