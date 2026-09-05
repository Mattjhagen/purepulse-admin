import assert from 'node:assert/strict'
import test from 'node:test'
import { generateCentralInterviewSlots } from '../lib/google-calendar'

test('generates fourteen 30-minute weekday slots from noon through 7 PM Central', () => {
  const slots = generateCentralInterviewSlots('2026-09-08', [])
  assert.equal(slots.length, 14)
  assert.equal(slots[0].displayTime, '12:00 PM CT')
  assert.equal(slots[0].startISO, '2026-09-08T17:00:00.000Z')
  assert.equal(slots[13].displayTime, '6:30 PM CT')
  assert.equal(slots[13].endISO, '2026-09-09T00:00:00.000Z')
})

test('respects Central Standard Time after daylight saving time ends', () => {
  const slots = generateCentralInterviewSlots('2026-12-08', [])
  assert.equal(slots[0].startISO, '2026-12-08T18:00:00.000Z')
})

test('marks overlapping Google Calendar ranges unavailable', () => {
  const busy = [{ start: new Date('2026-09-08T17:15:00.000Z'), end: new Date('2026-09-08T18:15:00.000Z') }]
  const slots = generateCentralInterviewSlots('2026-09-08', busy)
  assert.deepEqual(slots.slice(0, 3).map(slot => slot.available), [false, false, false])
  assert.equal(slots[3].available, true)
})

test('does not offer weekend appointments', () => {
  assert.deepEqual(generateCentralInterviewSlots('2026-09-12', []), [])
})
