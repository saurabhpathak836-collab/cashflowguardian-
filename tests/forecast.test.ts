import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateForecast,
  formatINR,
  resolvePaymentDelay,
  type WeekInput,
} from "../lib/forecast";

const baseWeeks: WeekInput[] = [
  { week: "Week 1", inflows: 520000, outflows: 410000, note: "Customer collections and payroll" },
  { week: "Week 2", inflows: 310000, outflows: 390000, note: "Supplier payments" },
  { week: "Week 3", inflows: 250000, outflows: 460000, note: "Cloud renewal and payroll" },
  { week: "Week 4", inflows: 600000, outflows: 430000, note: "Major customer invoice due" },
  { week: "Week 5", inflows: 220000, outflows: 400000, note: "Regular operating expenses" },
  { week: "Week 6", inflows: 280000, outflows: 450000, note: "Supplier and tax payments" },
  { week: "Week 7", inflows: 700000, outflows: 440000, note: "Quarterly customer collection" },
  { week: "Week 8", inflows: 260000, outflows: 420000, note: "Payroll and software tools" },
  { week: "Week 9", inflows: 340000, outflows: 470000, note: "Vendor settlement" },
  { week: "Week 10", inflows: 520000, outflows: 450000, note: "Customer collections" },
  { week: "Week 11", inflows: 290000, outflows: 410000, note: "Operating expenses" },
  { week: "Week 12", inflows: 610000, outflows: 480000, note: "Project milestone payment" },
  { week: "Week 13", inflows: 360000, outflows: 430000, note: "Payroll and supplier payments" },
];

const OPENING_CASH = 1200000;
const MINIMUM_CASH = 800000;

function freshWeeks(): WeekInput[] {
  return baseWeeks.map((week) => ({ ...week }));
}

test("README example: no scenario, week 1 closing cash is 13,10,000", () => {
  const forecast = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH);

  assert.equal(forecast.length, 13);
  assert.equal(forecast[0].openingCash, 1200000);
  assert.equal(forecast[0].inflows, 520000);
  assert.equal(forecast[0].closingCash, 1310000);
});

test("no scenario: closing cash cascades opening -> closing week over week", () => {
  const forecast = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH);

  for (let i = 1; i < forecast.length; i++) {
    assert.equal(forecast[i].openingCash, forecast[i - 1].closingCash);
    assert.equal(
      forecast[i].closingCash,
      forecast[i].openingCash + forecast[i].inflows - forecast[i].outflows
    );
  }
});

test("payment delay: amount removed from source week and added to next week", () => {
  const withoutDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH);
  const withDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH, 3, 300000);

  // Source week: 600,000 - 300,000 = 300,000
  assert.equal(withDelay[3].inflows, 300000);
  // Next week: 220,000 + 300,000 = 520,000
  assert.equal(withDelay[4].inflows, 520000);
  // All other weeks unchanged
  assert.deepEqual(
    withDelay.filter((_, i) => i !== 3 && i !== 4).map((row) => row.inflows),
    withoutDelay.filter((_, i) => i !== 3 && i !== 4).map((row) => row.inflows)
  );
});

test("payment delay: total inflows are conserved across the horizon", () => {
  const withoutDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH);
  const withDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH, 3, 300000);

  assert.equal(
    withDelay.reduce((sum, row) => sum + row.inflows, 0),
    withoutDelay.reduce((sum, row) => sum + row.inflows, 0)
  );
});

test("payment delay: closing cash cascade still holds in every week", () => {
  const withDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH, 3, 300000);

  assert.equal(withDelay[0].openingCash, OPENING_CASH);
  for (let i = 1; i < withDelay.length; i++) {
    assert.equal(withDelay[i].openingCash, withDelay[i - 1].closingCash);
    assert.equal(
      withDelay[i].closingCash,
      withDelay[i].openingCash + withDelay[i].inflows - withDelay[i].outflows
    );
  }
});

test("payment delay: week 4 flips healthy -> watch and week 5 recovers", () => {
  const withoutDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH);
  const withDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH, 3, 300000);

  // Week 4: without delay closes at 1,020,000 + 600,000 - 430,000 = 1,190,000 (Healthy);
  // with delay 1,020,000 + 300,000 - 430,000 = 890,000 -> below 1.2x threshold (960,000) -> Watch
  assert.equal(withoutDelay[3].status, "Healthy");
  assert.equal(withDelay[3].status, "Watch");
  assert.equal(withDelay[3].closingCash, 890000);

  // Week 5 realigns: 890,000 + (220,000 + 300,000) - 400,000 = 1,010,000, same as without delay
  assert.equal(withDelay[4].status, "Healthy");
  assert.equal(withDelay[4].closingCash, withoutDelay[4].closingCash);
});

test("payment delay on final week: removed from week 13, not added back in-horizon", () => {
  const withoutDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH);
  const withDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH, 12, 300000);

  assert.equal(withDelay[12].inflows, 60000); // 360,000 - 300,000
  assert.equal(
    withDelay.reduce((sum, row) => sum + row.inflows, 0),
    withoutDelay.reduce((sum, row) => sum + row.inflows, 0) - 300000
  );
  // Earlier weeks untouched
  assert.deepEqual(withDelay.slice(0, 12).map((row) => row.inflows), withoutDelay.slice(0, 12).map((row) => row.inflows));
});

test("payment delay: amount is capped at the source week's inflows", () => {
  const withDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH, 4, 999999);

  assert.equal(withDelay[4].inflows, 0); // never negative
  assert.equal(withDelay[5].inflows, 280000 + 220000);
});

test("payment delay: zero amount is a no-op", () => {
  const withoutDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH);
  const withDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH, 3, 0);

  assert.deepEqual(withDelay, withoutDelay);
});

test("payment delay: invalid week indexes are no-ops", () => {
  const withoutDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH);

  for (const index of [-1, -5, 13, 99, 1.5, Number.NaN]) {
    const withDelay = calculateForecast(OPENING_CASH, freshWeeks(), MINIMUM_CASH, index, 300000);
    assert.deepEqual(withDelay, withoutDelay, `index ${index} should be ignored`);
  }
});

test("payment delay: empty weeks array returns empty forecast", () => {
  const forecast = calculateForecast(OPENING_CASH, [], MINIMUM_CASH, 0, 100);

  assert.deepEqual(forecast, []);
});

test("input weeks are not mutated by the calculation", () => {
  const weeks = freshWeeks();
  const snapshot = JSON.stringify(weeks);

  calculateForecast(OPENING_CASH, weeks, MINIMUM_CASH, 3, 300000);

  assert.equal(JSON.stringify(weeks), snapshot);
});

test("resolvePaymentDelay reports source, target and capped amount", () => {
  assert.deepEqual(resolvePaymentDelay(3, 300000, baseWeeks), {
    sourceWeekIndex: 3,
    targetWeekIndex: 4,
    amount: 300000,
  });

  // Capped at the week's inflows
  assert.deepEqual(resolvePaymentDelay(4, 999999, baseWeeks), {
    sourceWeekIndex: 4,
    targetWeekIndex: 5,
    amount: 220000,
  });

  // Final week has no in-horizon target
  assert.deepEqual(resolvePaymentDelay(12, 300000, baseWeeks), {
    sourceWeekIndex: 12,
    targetWeekIndex: -1,
    amount: 300000,
  });

  // Invalid index
  assert.deepEqual(resolvePaymentDelay(-1, 300000, baseWeeks), {
    sourceWeekIndex: -1,
    targetWeekIndex: -1,
    amount: 0,
  });
});

test("formatINR formats whole rupees in the Indian numbering system", () => {
  assert.equal(formatINR(1310000), "₹13,10,000");
  assert.equal(formatINR(0), "₹0");
});

test("statuses respect the watch band (closing below 120% of threshold)", () => {
  // Build a tiny forecast where closing lands between threshold and 120%
  const weeks: WeekInput[] = [
    { week: "Week 1", inflows: 50000, outflows: 30000, note: "" },
  ];

  // 1200000 + 50000 - 30000 = 1220000; threshold 1,050,000 -> 1220000 < 1260000 -> Watch
  const forecast = calculateForecast(1200000, weeks, 1050000);

  assert.equal(forecast[0].closingCash, 1220000);
  assert.equal(forecast[0].status, "Watch");
});
