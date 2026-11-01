import { test } from 'node:test'
import assert from 'node:assert/strict'

import { breakMinutes } from '../src/utils/pomodoro.ts'

const base = { focusMinutes: 25, breakMinutes: 5, notes: '', subjectId: null, topicId: null, subject: '', topic: '' }

test('long break every N blocks', () => {
  const config = { ...base, longBreakMinutes: 20, blocksBeforeLongBreak: 3 }
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((block) => breakMinutes(config, block)), [5, 5, 20, 5, 5, 20])
})

test('configs without long break fields use pomodoro defaults', () => {
  assert.deepEqual([3, 4, 8].map((block) => breakMinutes(base, block)), [5, 15, 15])
})
