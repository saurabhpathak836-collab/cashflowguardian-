# CashFlow Guardian — Skill Guide

## 1. Purpose

CashFlow Guardian is a 13-week liquidity early-warning system for a PGDM Finance portfolio project. It helps a user forecast weekly cash positions, flag weeks that breach a minimum cash buffer, and test what happens if a customer payment arrives late.

All figures are illustrative sample data (INR, whole rupees). This is a learning and demonstration tool, not financial advice.

## 2. 13-Week Forecasting Workflow

The single source of truth is `lib/forecast.ts`:

1. Start with inputs: `openingCash`, 13 `WeekInput` rows (`week`, `inflows`, `outflows`, `note`), and `minimumCash`.
2. Optionally apply one payment-delay scenario via `resolvePaymentDelay()` (see Section 4).
3. Run `calculateForecast()` to produce 13 `ForecastRow` objects with `openingCash`, `closingCash`, and `status`.
4. Display results in `app/page.tsx`: metric cards, bar chart with threshold line, scenario panel, weekly table, CSV export.
5. Validate with `npm.cmd test` (`tests/forecast.test.ts`, 15 tests).

Key code references:

- `lib/forecast.ts` — `calculateForecast()`, `resolvePaymentDelay()`, `formatINR()`
- `app/page.tsx` — sample data, dashboard state, CSV export
- `tests/forecast.test.ts` — verified calculation behaviour

## 3. Financial Formula

Apply per week, in order from Week 1 to Week 13:

```text
Closing Cash = Opening Cash + Cash Inflows − Cash Outflows
```

Cascade rule:

- Week 1 `openingCash` = user-defined opening balance (default ₹12,00,000).
- Week N `openingCash` (N > 1) = Week N−1 `closingCash`.
- Never re-enter the opening balance mid-forecast; always carry the prior closing forward.

Verified example: `12,00,000 + 5,20,000 − 4,10,000 = ₹13,10,000` (Week 1 closing).

## 4. Identifying Weeks Below the Minimum Cash Threshold

The minimum cash threshold (default ₹8,00,000) is the safety buffer. Status logic in `calculateForecast()`:

| Status | Rule |
|---|---|
| `At risk` | `closingCash < minimumCash` |
| `Watch` | `minimumCash <= closingCash < minimumCash * 1.2` |
| `Healthy` | `closingCash >= minimumCash * 1.2` |

To identify stressed weeks:

1. Read `closingCash` for each `ForecastRow` returned by the app's calculation.
2. Compare against `minimumCash` and `minimumCash * 1.2` using the table above.
3. Report `At risk` weeks first (actual breach), then `Watch` weeks (within 20% above the buffer).
4. Never reclassify weeks using a different rule or an assumed threshold — always use the threshold currently set in the app.

## 5. Payment-Delay Scenario Analysis

Question answered: "What if a receipt expected in Week N arrives one week late?"

Implemented mechanics (`resolvePaymentDelay()` + `calculateForecast()`):

1. Subtract the delay amount from the source week's inflows.
2. Add the same amount to the following week's inflows.
3. Recalculate the full forecast so downstream opening/closing balances update.
4. Week 13 exception: a delay on the final week removes cash with no in-horizon target (cash arrives beyond the horizon).

Verification checklist (how to confirm the correct weeks changed):

- Source week inflows = planned inflows − delay amount; target week inflows = planned inflows + delay amount.
- All other weeks' inflows are unchanged (compare against the baseline forecast with no scenario).
- Total in-horizon inflows are conserved, except for a Week 13 delay (total drops by the delayed amount).
- The cascade still holds: every week's opening equals the prior week's closing.
- The delay amount is capped at the source week's planned inflows; inflows never go negative.
- Zero amount or invalid week index is a no-op.

Verified reference case: delaying ₹3,00,000 from Week 4 (planned ₹6,00,000) moves Week 4 to ₹3,00,000 inflows / ₹8,90,000 closing (`Watch`) and Week 5 to ₹5,20,000 inflows, with all other weeks unchanged.

## 6. Validation Rules

Follow these before summarising or editing anything:

1. **Recompute, don't guess.** Every number must come from `calculateForecast()` output or the CSV export, never from memory or estimation.
2. **Check the cascade.** For each week after Week 1: `openingCash == previous closingCash` and `closingCash == openingCash + inflows − outflows`.
3. **Handle negative cash explicitly.** Negative closing balances are allowed arithmetically and must be reported as `At risk`. Do not floor them at zero or hide them.
4. **Avoid double-counting.** A delayed receipt appears once (subtracted from source, added to target). Never add it to both weeks or count it as new income.
5. **Respect caps and no-ops.** Delay amount `= min(max(0, requested), source inflows)`; invalid indexes change nothing.
6. **Do not mutate inputs.** `calculateForecast()` must not modify the input weeks array.
7. **Run tests after logic changes.** `npm.cmd test` must show 15 passed / 0 failed.

## 7. Summarising Results Without Inventing Numbers

When acting as an AI assistant on this project:

- Quote only numbers produced by the application's calculation (dashboard, table, CSV, or test output). Use `formatINR()` values as displayed.
- If a number is not available from the app, say so (e.g., "Run the forecast with these inputs to get the closing balance") instead of estimating.
- State the inputs used: opening cash, minimum threshold, delay week, and delay amount.
- Distinguish baseline vs. scenario figures explicitly.
- Flag assumptions and limits: sample data only, one single-week delay at a time, no interest/tax/seasonality modelling.
- Never present illustrative outputs as real company data or financial advice.

Good summary pattern: "With opening ₹X and threshold ₹Y, Week N closes at ₹Z (Status). Under a ₹D delay from Week N to Week N+1, Week N moves to ₹Z2 (Status) while Week N+1 moves to ₹Z3."

## 8. AI / LLM Note

- Development assistance for this project used **Musespark 1.3** (drafting code, tests, and docs). It is not embedded in, invoked by, or required to run the application.
- There is **no Claude API integration** in this project: no Anthropic SDK in `package.json`, no model call in `app/` or `lib/`, and the `app/api/forecast/` directory is empty. Do not claim one exists.
- No API keys, tokens, or secrets are used or needed.

## 9. Example Requests and Expected Workflows

| User request | Expected workflow |
|---|---|
| "What is our Week 1 closing balance?" | Read `calculateForecast()` output for Week 1; reply with opening + inflows − outflows = closing, citing inputs. |
| "Which weeks are at risk?" | List rows where `status == "At risk"` (closing < threshold), then `Watch` weeks; give closing value and threshold for each. |
| "What if the Week 4 ₹6,00,000 receipt is delayed by ₹3,00,000?" | Apply delay (source Week 4, target Week 5), recalculate, report changed inflows/closings/statuses per Section 5 checklist. |
| "What happens if the Week 13 payment is late?" | Explain the beyond-horizon rule; show Week 13 reduction with no in-horizon addition. |
| "Can I change the safety buffer?" | Update `minimumCash`, recalculate statuses per Section 4, and note which weeks change status. |
| "Export the forecast." | Use the dashboard **Export CSV** action (`cashflow-guardian-forecast.csv`); summarise only from exported rows. |
| "Add AI commentary to the app." | Treat as a future enhancement (not implemented). Propose a server-side route that keeps keys off the client; do not invent an existing integration. |

## 10. Practical Notes for a Finance Student

- Think like treasury: the threshold is policy (buffer), the Watch band is early warning, and the delay test is receivables risk.
- Change one input at a time so cause and effect stay clear.
- Always reconcile the table (Section 3 cascade) before drawing conclusions.
- Keep sample-data disclaimers on every summary shared outside this project.
