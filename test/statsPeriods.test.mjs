import test from 'node:test';
import assert from 'node:assert/strict';
import { statsPeriod, shiftStatsPeriod, statsRangeQuery } from '../src/lib/statsPeriods.mjs';

test('weeks run Monday through Sunday across the year boundary', () => {
  assert.deepEqual(statsPeriod('weekly', '2027-01-03'), {
    start: '2026-12-28', end: '2027-01-04', last: '2027-01-03',
  });
  assert.equal(shiftStatsPeriod('weekly', '2027-01-03', 1), '2027-01-04');
});

test('month navigation handles leap years and December', () => {
  assert.equal(statsPeriod('monthly', '2024-02').last, '2024-02-29');
  assert.equal(statsPeriod('monthly', '2025-02').last, '2025-02-28');
  assert.equal(statsPeriod('monthly', '2026-04').last, '2026-04-30');
  assert.equal(shiftStatsPeriod('monthly', '2026-12', 1), '2027-01');
  assert.equal(shiftStatsPeriod('monthly', '2027-01', -1), '2026-12');
});

test('requests use explicit Jakarta midnight with an exclusive end', () => {
  const query = new URLSearchParams(statsRangeQuery(statsPeriod('monthly', '2026-11')));
  assert.equal(new Date(query.get('startDate')).toISOString(), '2026-10-31T17:00:00.000Z');
  assert.equal(new Date(query.get('endDate')).toISOString(), '2026-11-30T17:00:00.000Z');
});
