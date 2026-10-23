import { test } from 'node:test'
import assert from 'node:assert/strict'

import { gradeSummary } from '../src/utils/grades.ts'

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
