export type WeekInput = {
  week: string;
  inflows: number;
  outflows: number;
  note: string;
};

export type ForecastRow = WeekInput & {
  openingCash: number;
  closingCash: number;
  status: "Healthy" | "Watch" | "At risk";
};

/**
 * Resolves a customer-payment-delay scenario against the forecast weeks.
 *
 * The delayed inflow is removed from its original week and re-added to the
 * following week, so total forecast inflows are conserved.
 *
 * Rules:
 * - An invalid week index (negative, non-integer, or out of range) is a no-op.
 * - The delayed amount can never exceed the source week's planned inflows and
 *   is floored at 0, so a week's inflows can never go negative.
 * - A delay on the final week still removes the cash from that week; it lands
 *   beyond the 13-week horizon, so nothing is added back inside the forecast.
 */
export function resolvePaymentDelay(
  delayedInflowWeekIndex: number,
  delayedInflowAmount: number,
  weeks: WeekInput[]
): { sourceWeekIndex: number; targetWeekIndex: number; amount: number } {
  const isValidIndex =
    Number.isInteger(delayedInflowWeekIndex) &&
    delayedInflowWeekIndex >= 0 &&
    delayedInflowWeekIndex < weeks.length;

  if (!isValidIndex) {
    return { sourceWeekIndex: -1, targetWeekIndex: -1, amount: 0 };
  }

  const amount = Math.min(
    Math.max(0, delayedInflowAmount),
    weeks[delayedInflowWeekIndex].inflows
  );

  const targetWeekIndex = delayedInflowWeekIndex + 1 < weeks.length
    ? delayedInflowWeekIndex + 1
    : -1;

  return { sourceWeekIndex: delayedInflowWeekIndex, targetWeekIndex, amount };
}

export function calculateForecast(
  openingCash: number,
  weeks: WeekInput[],
  minimumCash: number,
  delayedInflowWeekIndex = -1,
  delayedInflowAmount = 0
): ForecastRow[] {
  let balance = openingCash;

  const { sourceWeekIndex, targetWeekIndex, amount: actualDelayedAmount } =
    resolvePaymentDelay(delayedInflowWeekIndex, delayedInflowAmount, weeks);

  return weeks.map((week, index) => {
    const opening = balance;

    const adjustedInflows =
      week.inflows -
      (index === sourceWeekIndex ? actualDelayedAmount : 0) +
      (index === targetWeekIndex ? actualDelayedAmount : 0);

    const closing = opening + adjustedInflows - week.outflows;

    const status: ForecastRow["status"] =
      closing < minimumCash
        ? "At risk"
        : closing < minimumCash * 1.2
          ? "Watch"
          : "Healthy";

    balance = closing;

    return {
      ...week,
      inflows: adjustedInflows,
      openingCash: opening,
      closingCash: closing,
      status,
    };
  });
}

  
export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
