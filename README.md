# CashFlow Guardian — 13-Week Liquidity Early Warning System

A finance-focused web application that forecasts weekly cash positions over a 13-week horizon, flags potential liquidity shortages against a minimum cash threshold, and lets users test the impact of a customer payment delay.

> **Portfolio context:** PGDM Finance project demonstrating financial analysis, liquidity monitoring, scenario planning, and practical software development.
>
> **Data disclaimer:** All financial figures in this project are illustrative sample data. They do not represent any real company. This tool is for learning and demonstration only — not financial advice. No production readiness or guaranteed financial accuracy is claimed.

---

## 1. Project Title and Overview

**CashFlow Guardian — 13-Week Liquidity Early Warning System** is a Next.js dashboard that answers a core treasury question:

> *"Will we have enough cash each week for the next 13 weeks, and what happens if a customer pays late?"*

The application:

- Starts from a user-defined opening cash balance.
- Projects 13 weeks of inflows and outflows from built-in sample data.
- Computes weekly closing cash positions.
- Classifies each week as **Healthy**, **Watch**, or **At risk** relative to a configurable minimum cash threshold.
- Simulates a single customer-payment delay (moving an expected receipt from one week to the next).
- Exports the resulting forecast as a CSV file.

The UI presents a liquidity command center with summary metric cards, a closing-balance bar chart with a threshold line, a scenario simulator panel, and a detailed weekly cash position table.

---

## 2. Business Problem and Motivation

Small and mid-sized businesses often manage cash on spreadsheets and discover shortfalls too late — when payroll, supplier payments, or tax dues are already due. A 13-week cash flow forecast is the standard treasury tool for short-term liquidity management because it covers roughly one quarter and is granular enough to catch weekly gaps.

CashFlow Guardian addresses this by:

- Making the weekly cash position visible before a crisis occurs.
- Quantifying a **minimum cash buffer** (the balance the business never wants to breach).
- Providing an early-warning classification so attention is directed to the weakest weeks.
- Allowing a basic **"what-if" test**: if a large customer receipt slips by one week, which weeks turn stressed?

---

## 3. Project Objectives

1. Build a 13-week cash flow forecast from opening cash, weekly inflows, and weekly outflows.
2. Implement a minimum cash threshold with clear liquidity status classification.
3. Enable payment-delay scenario analysis (shift one expected inflow to the following week).
4. Provide a dashboard suitable for both finance reviewers (table, statuses) and technical reviewers (typed calculation logic, automated tests).
5. Support CSV export of the forecast for offline review.
6. Keep all logic transparent, tested, and based on sample data only.

---

## 4. Key Features

Only features confirmed in the source code (`app/page.tsx`, `lib/forecast.ts`) are listed here.

| Area | Implemented feature |
|---|---|
| 13-week forecast | Fixed 13-row forecast computed week-by-week from sample inflows/outflows |
| Cash calculation | Opening cash, adjusted inflows, outflows, and closing cash per week |
| Configurable inputs | Editable opening cash balance and minimum cash threshold (₹ steppers) |
| Liquidity statuses | Each week classified as Healthy / Watch / At risk |
| Dashboard metrics | Opening cash, projected closing cash (Week 13), lowest projected balance, weeks-at-risk count + watch-week count |
| Bar chart | Weekly closing cash bars colour-coded by status, with a minimum-threshold reference line |
| Payment-delay simulator | Select delay week + amount, toggle simulation on/off, reset to baseline |
| Scenario messaging | On-screen explanation of which week was reduced and where the cash was moved |
| Weekly detail table | Period, opening cash, inflows, outflows, closing cash, status, and note per week |
| CSV export | `Export CSV` button downloads `cashflow-guardian-forecast.csv` with all forecast rows |
| Responsive layout | Sidebar + dashboard layout with breakpoints for tablet and mobile |
| INR formatting | All currency values formatted via `Intl.NumberFormat("en-IN", INR)` |

What is **not** implemented: user accounts, database persistence, CSV upload, multi-scenario comparison, or any AI-generated commentary (see Sections 8 and 15).

---

## 5. Financial Methodology

The calculation engine is `calculateForecast()` in `lib/forecast.ts`. All amounts are in INR (whole rupees).

### Opening Cash

The cash balance at the start of a week.

- Week 1 opening cash = the user-defined opening balance (default **₹12,00,000**).
- Every subsequent week's opening cash = the prior week's closing cash (rolling cascade).

### Cash Inflows

Expected customer collections and other receipts for the week (from sample data, adjusted for any active delay scenario). See Section 6.

### Cash Outflows

Planned payments for the week — e.g., payroll, supplier payments, tax, renewals (from sample data).

### Closing Cash

The core formula, applied independently each week:

```text
Closing Cash = Opening Cash + Cash Inflows − Cash Outflows
```

Verified example (also covered by an automated test): with opening cash ₹12,00,000, Week 1 inflows ₹5,20,000, and Week 1 outflows ₹4,10,000:

```text
Week 1 Closing = 12,00,000 + 5,20,000 − 4,10,000 = ₹13,10,000
```

### Minimum Cash Threshold

A user-defined safety buffer (default **₹8,00,000**). It represents the lowest acceptable cash balance. It is rendered as a reference line on the chart and drives the status classification below.

### Liquidity Status

Implemented exactly as coded in `lib/forecast.ts`:

| Status | Condition |
|---|---|
| **At risk** | `closingCash < minimumCash` |
| **Watch** | `minimumCash <= closingCash < minimumCash × 1.2` |
| **Healthy** | `closingCash >= minimumCash × 1.2` |

The 20% buffer above the threshold creates the Watch band — an early warning before a week actually breaches the minimum.

---

## 6. Payment-Delay Scenario Analysis

**Implemented.** The simulator answers: *"What if a customer receipt expected in Week N arrives one week late?"*

Mechanics (`resolvePaymentDelay()` + `calculateForecast()` in `lib/forecast.ts`):

1. The user selects a source week (default Week 4) and a delay amount (default ₹3,00,000), then clicks **Simulate payment delay**.
2. That amount is **subtracted** from the source week's inflows and **added** to the following week's inflows.
3. The entire 13-week forecast is recalculated from the adjusted inflows, so downstream opening/closing balances shift accordingly.
4. Clicking **Reset scenario** removes the adjustment and restores the baseline forecast.

Safeguards confirmed in code and tests:

- The delayed amount is capped at the source week's planned inflows — inflows can never go negative.
- A zero amount or an invalid week index is a no-op (forecast unchanged).
- Total inflows are conserved across the horizon (except for the Week 13 edge case below).
- Input data is never mutated by the calculation.

**Worked example (verified by test):** Delaying ₹3,00,000 from Week 4 (planned inflows ₹6,00,000) to Week 5:

- Week 4 inflows: 6,00,000 → 3,00,000; closing falls from ₹11,90,000 (Healthy) to ₹8,90,000 (Watch).
- Week 5 inflows: 2,20,000 → 5,20,000; Week 5 closing realigns with the baseline.
- All other weeks are unchanged.

**Week 13 edge case:** a delay on the final week removes the cash from Week 13 but has no in-horizon week to receive it. The amount is treated as arriving beyond the 13-week horizon, so total in-horizon inflows decrease by that amount. The UI states this explicitly when the scenario is applied to Week 13.

---

## 7. Technology Stack

Identified from `package.json`, source files, and configuration — no additional frameworks or services are used.

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5.4 (App Router) |
| UI library | React 19.1.0 + React DOM 19.1.0 |
| Language | TypeScript 5.8.3 |
| Styling | Plain CSS (`app/globals.css`), custom dashboard layout, Google Fonts (DM Sans + Manrope via CSS import) |
| Currency formatting | `Intl.NumberFormat("en-IN", { currency: "INR" })` |
| Calculation logic | `lib/forecast.ts` (`calculateForecast`, `resolvePaymentDelay`, `formatINR`) |
| Testing | Node.js built-in test runner (`node:test` + `node:assert/strict`), executed via `tsx` (`npm test` → `npx --yes tsx --test tests/forecast.test.ts`) |
| Linting | ESLint 9 + `eslint-config-next` |
| Runtime requirement | Node.js 20 or newer (LTS recommended) |
| AI / LLM runtime dependency | None — no LLM SDK, API route, or AI service is wired into the application (see Section 8) |

No database, authentication provider, deployment platform, or analytics service is configured in the inspected codebase. The `app/api/forecast/` directory exists but is empty.

---

## 8. LLM and AI Workflow

- **LLM used by me:** **Musespark 1.3**.
- **Actual role in this project:** AI-assisted development only — i.e., help with drafting code, explaining concepts, writing tests, and preparing documentation during development. This assessment is based on the inspected project configuration: there is no LLM SDK in `package.json`, no model call in `app/` or `lib/`, no API route that contacts an AI service, and no environment variable or secret handling for any AI provider.
- **Integrated into the application? No.** LLM functionality is **not** integrated into the running application. The forecast, threshold classification, scenario simulation, chart, and CSV export all run deterministically as local TypeScript/React logic with no network call to any AI service. Musespark 1.3 is not embedded, invoked, or required at runtime.
- **Model attribution:** Musespark 1.3 is documented here only as the assistant used during development. It is not described as Claude and not claimed to be an Anthropic model.
- **Secrets:** No API keys, tokens, or secrets are included in this repository or required to run the app. Do not add any.

---

## 9. Project Architecture and Directory Structure

Next.js App Router with a client-side dashboard page and a pure calculation module:

```text
cashflow-guardian/
├── app/
│   ├── page.tsx          # "use client" dashboard: state, metrics, chart, simulator, table, CSV export
│   ├── layout.tsx        # Root layout + page metadata
│   ├── globals.css       # All dashboard styling, responsive breakpoints
│   └── api/
│       └── forecast/     # Empty directory (no route implemented)
├── lib/
│   └── forecast.ts       # WeekInput / ForecastRow types, calculateForecast,
│                         # resolvePaymentDelay, formatINR (pure, no side effects)
├── tests/
│   └── forecast.test.ts  # 15 automated tests (Node test runner + tsx)
├── package.json          # Scripts: dev / build / start / lint / test
├── tsconfig.json
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
└── README.md             # This file
```

Data flow:

```text
sampleWeeks (13 rows) + openingCash + minimumCash + delay settings
  → resolvePaymentDelay() → adjusted weekly inflows
  → calculateForecast() → ForecastRow[] (opening, closing, status)
  → React dashboard (metric cards, bar chart, table, CSV export)
```

---

## 10. Installation and Setup for Windows

Requirements: **Node.js 20 or newer (LTS recommended)**, Visual Studio Code, and a web browser.

```powershell
# 1. Open this project folder in VS Code, then open a terminal
#    (Terminal → New Terminal).

# 2. Install dependencies:
npm.cmd install

# 3. Start the development server:
npm.cmd run dev
```

Then open **http://localhost:3000** in your browser.

Useful commands:

```powershell
npm.cmd test        # Run the 15 automated forecast tests
npm.cmd run build   # Production build
npm.cmd start       # Serve the production build
npm.cmd run lint    # Run ESLint
```

Stop the dev server with `Ctrl+C` in the terminal.

---

## 11. User Guide

All items below were confirmed in `app/page.tsx`.

- **Dashboard (Overview):** The landing view shows four metric cards — opening cash, projected closing cash (Week 13, flagged as above/below threshold), lowest projected balance, and weeks-at-risk count (with watch-week count).
- **Forecast (13-week chart + table):** The bar chart plots weekly closing cash, colour-coded Healthy (green) / Watch (amber) / At risk (red), with a minimum-threshold line. The weekly table lists opening cash, inflows, outflows, closing cash, status badge, and a descriptive note per week.
- **Threshold settings:** Edit **Opening cash balance** and **Minimum cash threshold** (₹ number inputs). The forecast, statuses, chart line, and metric cards recalculate immediately.
- **Payment-delay simulation:** Choose **Payment expected in** (Week 1–13) and **Delayed inflow amount**, then click **Simulate payment delay**. A result banner explains the adjustment (e.g., "Week 4 inflows reduced by ₹3,00,000 and added to Week 5"). Click **Reset scenario** to return to the baseline forecast.
- **Reset:** Toggling the scenario button off restores original inflows; editing the cash inputs likewise recomputes from baseline sample data. There is no separate "reset all" button — re-enter the default values (₹12,00,000 opening, ₹8,00,000 minimum) to restore defaults.
- **CSV export:** Click **Export CSV** (top-right) to download `cashflow-guardian-forecast.csv` containing Week, Opening Cash, Inflows, Outflows, Closing Cash, Status, and Note columns for the currently displayed forecast (including any active scenario).

---

## 12. Sample Data and Financial Assumptions

- **Sample weeks** (hardcoded in `app/page.tsx`, mirrored in tests):

| Week | Inflows (₹) | Outflows (₹) | Note |
|---|---|---|---|
| Week 1 | 5,20,000 | 4,10,000 | Customer collections and payroll |
| Week 2 | 3,10,000 | 3,90,000 | Supplier payments |
| Week 3 | 2,50,000 | 4,60,000 | Cloud renewal and payroll |
| Week 4 | 6,00,000 | 4,30,000 | Major customer invoice due |
| Week 5 | 2,20,000 | 4,00,000 | Regular operating expenses |
| Week 6 | 2,80,000 | 4,50,000 | Supplier and tax payments |
| Week 7 | 7,00,000 | 4,40,000 | Quarterly customer collection |
| Week 8 | 2,60,000 | 4,20,000 | Payroll and software tools |
| Week 9 | 3,40,000 | 4,70,000 | Vendor settlement |
| Week 10 | 5,20,000 | 4,50,000 | Customer collections |
| Week 11 | 2,90,000 | 4,10,000 | Operating expenses |
| Week 12 | 6,10,000 | 4,80,000 | Project milestone payment |
| Week 13 | 3,60,000 | 4,30,000 | Payroll and supplier payments |

- **Defaults:** Opening cash ₹12,00,000; minimum cash threshold ₹8,00,000; pre-filled delay Week 4 / ₹3,00,000 (simulation off until toggled).
- **Assumptions:** Weekly granularity; single-currency (INR, whole rupees); deterministic arithmetic with no interest, seasonality modelling, or probabilistic forecasting; one single-week payment delay at a time; Week 13 delays fall outside the horizon.
- All figures are illustrative sample data, not actual company data.

---

## 13. Testing and Validation

Test suite: `tests/forecast.test.ts`, run with `npm.cmd test` (`npx --yes tsx --test tests/forecast.test.ts`).

**Verified result (executed 2026-10-02 during README preparation): 15 tests, 15 passed, 0 failed.**

Coverage includes:

- README Week 1 example (₹12,00,000 → ₹13,10,000 closing).
- Opening-to-closing cascade holds across all 13 weeks, with and without a delay.
- Delay mechanics: source-week reduction, next-week addition, inflow conservation, cap at source-week inflows, zero-amount and invalid-index no-ops, Week 13 beyond-horizon behaviour, empty-input handling, and input non-mutation.
- Status logic: Healthy → Watch flip on the documented Week 4 delay example; Watch-band boundary check.
- `formatINR` Indian-numbering output (e.g., `₹13,10,000`) and `resolvePaymentDelay` return values.

No other test suites, performance benchmarks, or user-acceptance results are claimed. Manual validation performed: starting the dev server, adjusting thresholds, toggling the delay scenario, and exporting the CSV (see Section 11).

---

## 14. Limitations and Known Issues

- **Sample data only.** All inflows, outflows, and notes are fictional and hardcoded; there is no data source, upload, or persistence.
- **Single scenario.** Only one payment delay (one week, one amount, shifted by exactly one week) can be simulated at a time. No partial payments, multi-week slips, or outflow shocks.
- **Simplified finance.** No seasonality, growth rates, interest, taxes computed dynamically, multi-currency support, or receivables ageing.
- **No backend.** The `app/api/forecast/` directory is empty; all computation happens client-side. No authentication, database, or server-side validation.
- **Illustrative statuses.** Thresholds and the 1.2× Watch band are reasonable conventions for a demo, not calibrated treasury policy.
- **Not financial advice.** Nothing here should be relied on for real cash management decisions.

---

## 15. Future Enhancements

Planned only — none of these are implemented yet:

1. **CSV upload** — let users import their own weekly inflows/outflows instead of fixed sample data, with validation and error messages.
2. **Additional liquidity metrics** — e.g., minimum-headroom weeks, cumulative surplus/deficit, burn-rate or coverage-ratio views.
3. **AI-assisted CFO commentary** — optional, server-side narrative summaries of the forecast (e.g., "Weeks 5–6 breach the buffer because…"). This would require a new authenticated API route that keeps any provider key server-side; no such integration exists today.
4. **More scenario options** — multiple simultaneous delays, custom shift lengths, outflow shocks, and baseline-vs-scenario comparison views.
5. **Expanded automated testing** — extend the existing suite (UI/component tests, CSV-export checks, lint/build gates in CI).

---

## 16. Project Screenshots and Live Demo

> Placeholders — to be replaced with real assets once available.

- **Dashboard screenshot:** `[TODO: add screenshot of the 13-week dashboard — metric cards, chart, and table]`
- **Scenario simulator screenshot:** `[TODO: add screenshot with the payment-delay scenario applied]`
- **CSV export sample:** `[TODO: add first 5 lines of an exported forecast CSV]`
- **Live demo:** No verified deployment URL exists at the time of writing. `[TODO: add deployment link once deployed, e.g., Vercel]`

---

## 17. Project Purpose and Learning Outcomes

This project was built as a **PGDM Finance portfolio piece** to demonstrate the intersection of finance domain knowledge and hands-on software delivery:

- **Financial analysis** — translating opening/inflow/outflow mechanics into a correct rolling 13-week forecast.
- **Liquidity monitoring** — designing a minimum-cash threshold and Healthy/Watch/At risk early-warning bands.
- **Scenario planning** — modelling a payment delay as an inflow shift and tracing its downstream balance impact, including edge cases.
- **Practical software development** — typed calculation modules (TypeScript), a Next.js + React dashboard, INR localisation, CSV export, and a verified 15-test automated suite run via `npm.cmd test`.

Recruiters and reviewers can evaluate both the finance reasoning (methodology, assumptions, limitations stated honestly) and the engineering practice (readable code, tested edge cases, reproducible Windows setup).
