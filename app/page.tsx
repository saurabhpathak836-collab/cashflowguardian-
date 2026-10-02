"use client";

import { useMemo, useState } from "react";
import { calculateForecast, formatINR, resolvePaymentDelay, type WeekInput } from "@/lib/forecast";

const sampleWeeks: WeekInput[] = [
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

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

export default function Home() {
  const [openingCash, setOpeningCash] = useState(1200000);
  const [minimumCash, setMinimumCash] = useState(800000);
  const [delayWeek, setDelayWeek] = useState(3);
  const [delayAmount, setDelayAmount] = useState(300000);
  const [simulateDelay, setSimulateDelay] = useState(false);
  const forecast = useMemo(() => calculateForecast(openingCash, sampleWeeks, minimumCash, simulateDelay ? delayWeek : -1, simulateDelay ? delayAmount : 0), [openingCash, minimumCash, delayWeek, delayAmount, simulateDelay]);
  const { targetWeekIndex: delayedTargetIndex, amount: delayedAmount } = useMemo(
    () => resolvePaymentDelay(simulateDelay ? delayWeek : -1, simulateDelay ? delayAmount : 0, sampleWeeks),
    [delayWeek, delayAmount, simulateDelay]
  );
  const closing = forecast[forecast.length - 1]?.closingCash ?? openingCash;
  const minimumProjected = Math.min(...forecast.map((row) => row.closingCash));
  const riskWeeks = forecast.filter((row) => row.status === "At risk");
  const watchWeeks = forecast.filter((row) => row.status === "Watch");
  const maxBalance = Math.max(openingCash, ...forecast.map((row) => row.closingCash), minimumCash * 1.2, 1);
  const minBalance = Math.min(0, ...forecast.map((row) => row.closingCash));
  const range = Math.max(maxBalance - minBalance, 1);

  function downloadCsv() {
    const rows = [["Week", "Opening Cash (INR)", "Inflows (INR)", "Outflows (INR)", "Closing Cash (INR)", "Status", "Note"], ...forecast.map((row) => [row.week, row.openingCash, row.inflows, row.outflows, row.closingCash, row.status, row.note])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cashflow-guardian-forecast.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">CG</div><div><strong>CashFlow</strong><span>GUARDIAN</span></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="nav-item active"><Icon>▦</Icon> Overview</div>
        <div className="nav-item"><Icon>◷</Icon> Cash forecast <span className="nav-tag">13W</span></div>
        <div className="nav-item"><Icon>△</Icon> Risk alerts</div>
        <div className="nav-item"><Icon>⌁</Icon> Scenario planning</div>
        <div className="sidebar-bottom"><div className="avatar">SP</div><div><strong>Demo Workspace</strong><span>Sample company data</span></div></div>
      </aside>

      <section className="main-content">
        <header className="topbar"><div><div className="eyebrow">TREASURY INTELLIGENCE</div><div className="breadcrumb">Workspace <span>/</span> Overview</div></div><div className="topbar-right"><span className="demo-pill"><span className="pulse"/> Demo data</span><button className="button button-secondary" onClick={downloadCsv}>↓ Export CSV</button></div></header>

        <div className="page-heading"><div><p className="eyebrow">LIQUIDITY OVERVIEW</p><h1>Cash flow command center</h1><p className="subheading">See what your cash position could look like over the next 13 weeks.</p></div><div className="as-of">FORECAST HORIZON<strong>13 weeks</strong></div></div>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-top"><span>Opening cash balance</span><span className="metric-icon blue">₹</span></div><div className="metric-value">{formatINR(openingCash)}</div><div className="metric-foot">Starting position</div></article>
          <article className="metric-card"><div className="metric-top"><span>Projected closing cash</span><span className="metric-icon green">↗</span></div><div className="metric-value">{formatINR(closing)}</div><div className={`metric-foot ${closing >= minimumCash ? "positive" : "negative"}`}>{closing >= minimumCash ? "Above minimum cash threshold" : "Below minimum cash threshold"}</div></article>
          <article className="metric-card"><div className="metric-top"><span>Lowest projected balance</span><span className="metric-icon amber">⌁</span></div><div className="metric-value">{formatINR(minimumProjected)}</div><div className="metric-foot">Across the 13-week period</div></article>
          <article className="metric-card"><div className="metric-top"><span>Weeks at risk</span><span className="metric-icon red">!</span></div><div className="metric-value">{riskWeeks.length}<span className="metric-unit"> / 13</span></div><div className="metric-foot">{watchWeeks.length} additional week(s) to watch</div></article>
        </section>

        <section className="content-grid">
          <article className="panel forecast-panel"><div className="panel-heading"><div><h2>13-week cash forecast</h2><p>Projected closing balance by week</p></div><span className="legend"><i/> Closing cash</span></div>
            <div className="chart-wrap"><div className="y-labels"><span>{formatINR(maxBalance)}</span><span>{formatINR(maxBalance * .66)}</span><span>{formatINR(maxBalance * .33)}</span><span>₹0</span></div><div className="chart-area"><div className="grid-line line-1"/><div className="grid-line line-2"/><div className="grid-line line-3"/><div className="threshold-line" style={{ bottom: `${Math.max(0, Math.min(100, ((minimumCash - minBalance) / range) * 100))}%` }}><span>Minimum cash threshold</span></div><div className="bar-chart">{forecast.map((row) => { const height = Math.max(2, Math.min(100, ((row.closingCash - minBalance) / range) * 100)); return <div className="bar-column" key={row.week} title={`${row.week}: ${formatINR(row.closingCash)}`}><div className={`bar ${row.status === "At risk" ? "bar-risk" : row.status === "Watch" ? "bar-watch" : ""}`} style={{ height: `${height}%` }}/><span>{row.week.replace("Week ", "W")}</span></div>; })}</div></div></div>
            <div className="chart-note"><span><i className="dot-green"/> Healthy</span><span><i className="dot-amber"/> Watch</span><span><i className="dot-red"/> At risk</span><span className="chart-note-right">Illustrative sample data · INR</span></div>
          </article>

          <article className="panel scenario-panel"><div className="panel-heading"><div><h2>Scenario simulator</h2><p>Test a potential payment delay</p></div><span className="spark-icon">✳</span></div><div className="scenario-callout"><div className="scenario-icon">↗</div><div><strong>What if a customer pays late?</strong><p>Move an expected inflow to a later week to see the immediate forecast impact.</p></div></div>
            <label className="field-label" htmlFor="openingCash">Opening cash balance</label><div className="input-wrap"><span>₹</span><input id="openingCash" type="number" min="0" step="50000" value={openingCash} onChange={(e) => setOpeningCash(Math.max(0, Number(e.target.value) || 0))}/></div>
            <label className="field-label" htmlFor="minimumCash">Minimum cash threshold</label><div className="input-wrap"><span>₹</span><input id="minimumCash" type="number" min="0" step="50000" value={minimumCash} onChange={(e) => setMinimumCash(Math.max(0, Number(e.target.value) || 0))}/></div>
            <label className="field-label" htmlFor="delayWeek">Payment expected in</label><select id="delayWeek" value={delayWeek} onChange={(e) => setDelayWeek(Number(e.target.value))}>{sampleWeeks.map((week, index) => <option key={week.week} value={index}>{week.week}</option>)}</select>
            <label className="field-label" htmlFor="delayAmount">Delayed inflow amount</label><div className="input-wrap"><span>₹</span><input id="delayAmount" type="number" min="0" step="25000" value={delayAmount} onChange={(e) => setDelayAmount(Math.max(0, Number(e.target.value) || 0))}/></div>
            <button className={`button ${simulateDelay ? "button-danger" : "button-primary"} full-button`} onClick={() => setSimulateDelay((value) => !value)}>{simulateDelay ? "Reset scenario" : "Simulate payment delay"}</button>
            {simulateDelay && <div className="scenario-result"><strong>Scenario applied</strong><p>{delayedTargetIndex === -1 ? <>Week {delayWeek + 1} inflows reduced by {formatINR(delayedAmount)}. The cash is expected after the 13-week horizon, so it is not added back inside this forecast.</> : <>Week {delayWeek + 1} inflows reduced by {formatINR(delayedAmount)} and added to Week {delayedTargetIndex + 1}. Forecast recalculated using this assumption.</>}</p></div>}
            <p className="fine-print">Simulation is illustrative. A delayed receipt is removed from its original week and automatically moved into the following week (or beyond the horizon for Week 13).</p>
          </article>
        </section>

        <section className="panel table-panel"><div className="panel-heading"><div><h2>Weekly cash position</h2><p>Opening balance + inflows − outflows = closing balance</p></div><span className="table-count">13 WEEKS</span></div><div className="table-scroll"><table><thead><tr><th>PERIOD</th><th>OPENING CASH</th><th>INFLOWS</th><th>OUTFLOWS</th><th>CLOSING CASH</th><th>STATUS</th></tr></thead><tbody>{forecast.map((row) => { return <tr key={row.week}><td><strong>{row.week}</strong><span className="table-note">{row.note}</span></td><td>{formatINR(row.openingCash)}</td><td className="money-in">+{formatINR(row.inflows)}</td><td className="money-out">−{formatINR(row.outflows)}</td><td><strong>{formatINR(row.closingCash)}</strong></td><td><span className={`status status-${row.status.toLowerCase().replace(" ", "-")}`}><i/>{row.status}</span></td></tr>; })}</tbody></table></div></section>

        <footer className="footer"><span>CashFlow Guardian · Placement portfolio prototype</span><span>Sample data only · Not financial advice</span></footer>
      </section>
    </main>
  );
}
