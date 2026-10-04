import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, makeWorkdays } from './demo-attendance.mjs';

const employees = Array.from({ length: 5 }, (_, index) => ({ id: `employee-${index + 1}` }));

test('creates only 41 weekdays after excluding the two August holidays', () => {
  const days = makeWorkdays();
  assert.equal(days.length, 41);
  assert.equal(days.filter((date) => date.startsWith('2026-08')).length, 19);
  assert.equal(days.filter((date) => date.startsWith('2026-09')).length, 22);
  assert.equal(days.some((date) => date === '2026-08-17' || date === '2026-08-25'), false);
  assert.equal(days.every((date) => ![0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay())), true);
});

test('creates varied demo records with two marked events and two absences per employee', () => {
  const plan = buildPlan(employees);
  assert.equal(plan.absences, 10);
  assert.equal(plan.records.length, 195);
  assert.equal(plan.records.reduce((total, row) => total + row.events.length, 0), 390);
  assert.equal(plan.records.every((row) => row.events.length === 2 && row.events[0].type === 'CHECK_IN' && row.events[1].type === 'CHECK_OUT'), true);
  assert.equal(plan.records.some((row) => row.isLate), true);
  assert.equal(plan.records.some((row) => row.isEarly), true);
  for (const row of plan.records) {
    const [checkIn, checkOut] = row.events;
    const checkInMinutes = checkIn.timeAt.getUTCHours() * 60 + checkIn.timeAt.getUTCMinutes();
    const checkOutMinutes = checkOut.timeAt.getUTCHours() * 60 + checkOut.timeAt.getUTCMinutes();
    assert.equal(row.isLate, checkInMinutes > 60);
    assert.equal(row.isEarly, checkOutMinutes < 10 * 60);
  }
});
