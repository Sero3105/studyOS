import { test } from 'node:test'
import assert from 'node:assert/strict'

import { gradeSummary, gradeTrend } from '../src/utils/grades.ts'

test('weighted average uses CFU, ignores ungraded and unpassed exams', () => {
  const s = gradeSummary([
    { status: 'passed', grade: 30, cfu: 12 },
    { status: 'passed', grade: 24, cfu: 6 },
    { status: 'passed', grade: 27, cfu: null },
    { status: 'failed', grade: null, cfu: 9 },
    { status: 'planned', grade: null, cfu: 6 },
  ])
  assert.equal(s.count, 3)
  assert.equal(s.cfu, 18)
  assert.equal(s.weightedAverage, 28)
  assert.equal(s.average, 27)
  assert.equal(Math.round(s.graduationBase * 10) / 10, 102.7)
})

test('empty record book', () => {
  assert.deepEqual(gradeSummary([]), { count: 0, cfu: 0, average: 0, weightedAverage: 0, graduationBase: 0 })
})

test('grade trend is chronological with a running weighted average', () => {
  const trend = gradeTrend([
    { id: 3, title: 'C', status: 'passed', grade: 24, honors: false, cfu: 6, exam_date: '2026-02-01' },
    { id: 1, title: 'A', status: 'passed', grade: 30, honors: true, cfu: 12, exam_date: '2025-01-10' },
    { id: 2, title: 'B', status: 'passed', grade: 27, honors: false, cfu: null, exam_date: '2025-06-01' },
    { id: 4, title: 'D', status: 'planned', grade: null, honors: false, cfu: 6, exam_date: '2026-06-01' },
    { id: 5, title: 'E', status: 'passed', grade: 26, honors: false, cfu: 6, exam_date: null },
  ])
  assert.deepEqual(trend.map((p) => p.title), ['A', 'B', 'C'])
  assert.deepEqual(trend.map((p) => p.average), [30, 30, 28])
  assert.deepEqual(trend.map((p) => p.delta), [null, 0, -2])
})
