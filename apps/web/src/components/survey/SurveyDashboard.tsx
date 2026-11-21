"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  Upload, Hash, Type, CheckSquare, Square, BarChart2,
  TrendingUp, GitMerge, Grid3X3, Shield, LineChart, ChevronRight,
  BarChart3, Info, Lock, Copy, Check, AlertTriangle, Table2
} from "lucide-react";
import {
  descriptive, independentTTest, oneWayANOVA, correlationMatrix,
  crossTabulation, cronbachAlpha, linearRegression, confidenceInterval
} from "@aims/survey";
import { parseCSV } from "@aims/core";

// ─── Types ──────────────────────────────────────────────────────────────────

type AnalysisType = "data" | "descriptive" | "ttest" | "anova" | "correlation" | "crosstab" | "reliability" | "regression";

interface Dataset {
  headers: string[];
  rows: Record<string, string | number | boolean | null>[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNumericColumn(rows: Dataset["rows"], col: string): boolean {
  const vals = rows.map((r) => r[col]).filter((v) => v !== null && v !== "");
  if (vals.length === 0) return false;
  return vals.every((v) => typeof v === "number" || (typeof v === "string" && !isNaN(Number(v))));
}

function numericValues(rows: Dataset["rows"], col: string): number[] {
  return rows
    .map((r) => r[col])
    .filter((v) => v !== null && v !== "" && !isNaN(Number(v)))
    .map(Number);
}

function stringValues(rows: Dataset["rows"], col: string): string[] {
  return rows.map((r) => String(r[col] ?? "")).filter(Boolean);
}

function uniqueCount(rows: Dataset["rows"], col: string): number {
  return new Set(rows.map((r) => String(r[col]))).size;
}

function missingPct(rows: Dataset["rows"], col: string): number {
  const missing = rows.filter((r) => r[col] === null || r[col] === "").length;
  return rows.length > 0 ? (missing / rows.length) * 100 : 0;
}

function fmtP(p: number): string {
  if (p < 0.001) return "< .001";
  return p.toFixed(3).replace("0.", ".");
}

function sigStars(p: number): string {
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  return "";
}

function fmtN(n: number): string {
  return n.toFixed(3);
}

function fmtInt(n: number): string {
  return String(Math.round(n));
}

// ─── Smart default helpers ──────────────────────────────────────────────────

function getTextColumns(dataset: Dataset): string[] {
  return dataset.headers.filter((h) => !isNumericColumn(dataset.rows, h));
}

function getUniqueCountForCol(rows: Dataset["rows"], col: string): number {
  return new Set(rows.map((r) => String(r[col]))).size;
}

function bestTTestGroupVar(dataset: Dataset): string {
  const textCols = getTextColumns(dataset);
  if (textCols.length === 0) return "";
  // prefer column with exactly 2 unique values
  const exact2 = textCols.find((c) => getUniqueCountForCol(dataset.rows, c) === 2);
  if (exact2) return exact2;
  // otherwise pick fewest unique values >= 2
  const candidates = textCols
    .map((c) => ({ col: c, n: getUniqueCountForCol(dataset.rows, c) }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => a.n - b.n);
  return candidates[0]?.col ?? textCols[0] ?? "";
}

function bestAnovaGroupVar(dataset: Dataset): string {
  const textCols = getTextColumns(dataset);
  if (textCols.length === 0) return "";
  // prefer column with 3-10 unique values
  const inRange = textCols.find((c) => {
    const n = getUniqueCountForCol(dataset.rows, c);
    return n >= 3 && n <= 10;
  });
  if (inRange) return inRange;
  // fallback to first text column
  return textCols[0] ?? "";
}

function bestCrossTabVars(dataset: Dataset): [string, string] {
  const textCols = getTextColumns(dataset);
  const good = textCols.filter((c) => {
    const n = getUniqueCountForCol(dataset.rows, c);
    return n >= 2 && n <= 6;
  });
  const row = good[0] ?? textCols[0] ?? "";
  const col = good[1] ?? textCols.find((c) => c !== row) ?? row;
  return [row, col];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const selStyle = { background: "var(--accent)", color: "var(--foreground)", border: "1px solid var(--border-bright)" };

function InterpBox({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 rounded-lg p-3 text-sm leading-relaxed" style={{ background: "var(--accent)", color: "var(--muted)", borderLeft: "3px solid var(--primary)" }}>{children}</div>;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-1" style={{ background: "var(--accent)" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color: "var(--foreground)" }}>{typeof value === "number" ? fmtN(value) : value}</span>
    </div>
  );
}

function StatCardInt({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-1" style={{ background: "var(--accent)" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color: "var(--foreground)" }}>{fmtInt(value)}</span>
    </div>
  );
}

function VarSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: "var(--muted)" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded px-2 py-1 text-sm" style={selStyle}>
        {options.map((h) => <option key={h}>{h}</option>)}
      </select>
    </div>
  );
}

function LevelWarningBadge({ count }: { count: number }) {
  if (count <= 10) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--destructive)", color: "#fff" }}>
      <AlertTriangle size={10} /> {count} levels
    </span>
  );
}

function TabGuidance({ tab }: { tab: AnalysisType }) {
  const messages: Record<string, string> = {
    data: "Upload data to preview it here.",
    descriptive: "Select numeric variables to see summary statistics (mean, SD, skewness, etc.).",
    ttest: "Uses the first text column as the grouping variable automatically. Select a numeric outcome variable.",
    anova: "Uses a categorical column (3-10 levels) as the grouping variable. Select a numeric outcome.",
    correlation: "Select 2 or more numeric variables to compute pairwise Pearson correlations.",
    crosstab: "Uses categorical columns automatically. Adjust row/column variables as needed.",
    reliability: "Select items from a single measurement scale (e.g., all Likert items for one construct).",
    regression: "Select a dependent variable (Y) and one or more numeric predictors.",
  };
  return (
    <div className="flex items-start gap-3 rounded-lg p-4" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
      <Info size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
      <p className="text-sm" style={{ color: "var(--muted)" }}>{messages[tab] ?? "Select variables from the sidebar."}</p>
    </div>
  );
}

// ─── Analysis Panels ─────────────────────────────────────────────────────────

function DataPreviewPanel({ dataset }: { dataset: Dataset }) {
  const maxRows = 100;
  const displayRows = dataset.rows.slice(0, maxRows);
  return (
    <div className="space-y-3">
      {dataset.rows.length > maxRows && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Showing {maxRows} of {dataset.rows.length} rows
        </p>
      )}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-bright)" }}>
        <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
          <table className="text-xs w-full border-collapse" style={{ minWidth: dataset.headers.length * 120 }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card)" }}>
                <th className="p-2 text-center font-mono text-xs" style={{ color: "var(--muted)", borderBottom: "2px solid var(--border-bright)", minWidth: 48 }}>#</th>
                {dataset.headers.map((h) => {
                  const isNum = isNumericColumn(dataset.rows, h);
                  return (
                    <th key={h} className="p-2 text-left" style={{ color: "var(--foreground)", borderBottom: "2px solid var(--border-bright)", minWidth: 100 }}>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold" style={{ background: isNum ? "var(--primary)" : "var(--muted)", color: "var(--background)" }}>
                          {isNum ? "#" : "T"}
                        </span>
                        <span className="truncate">{h}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--background)" : "var(--accent)" }}>
                  <td className="p-2 text-center font-mono" style={{ color: "var(--muted)", borderRight: "1px solid var(--border)" }}>{i + 1}</td>
                  {dataset.headers.map((h) => (
                    <td key={h} className="p-2 truncate" style={{ color: "var(--foreground)", maxWidth: 200 }}>
                      {row[h] === null || row[h] === "" ? <span style={{ color: "var(--muted)" }}>--</span> : String(row[h])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {dataset.rows.length <= maxRows && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Showing all {dataset.rows.length} rows
        </p>
      )}
    </div>
  );
}

function DescriptivePanel({ dataset, selected }: { dataset: Dataset; selected: string[] }) {
  const numeric = selected.filter((v) => isNumericColumn(dataset.rows, v));
  if (numeric.length === 0) return <TabGuidance tab="descriptive" />;

  return (
    <div className="space-y-4">
      {numeric.map((col) => {
        const vals = numericValues(dataset.rows, col);
        if (vals.length < 2) return null;
        const s = descriptive(vals);
        const ci = confidenceInterval(vals);
        return (
          <div key={col} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border-bright)" }}>
            <h3 className="font-semibold mb-3" style={{ color: "var(--primary)" }}>{col}</h3>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <StatCardInt label="N" value={s.n} />
              <StatCard label="Mean" value={s.mean} />
              <StatCard label="SD" value={s.sd} />
              <StatCard label="Median" value={s.median} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <StatCard label="Min" value={s.min} />
              <StatCard label="Max" value={s.max} />
              <StatCard label="Skewness" value={s.skewness} />
              <StatCard label="Kurtosis" value={s.kurtosis} />
            </div>
            <InterpBox>
              <strong>{col}</strong>: M = {fmtN(s.mean)}, SD = {fmtN(s.sd)}, 95% CI [{fmtN(ci.lower)}, {fmtN(ci.upper)}].
              {Math.abs(s.skewness) > 1 ? ` Distribution is ${s.skewness > 0 ? "positively" : "negatively"} skewed (skewness = ${fmtN(s.skewness)}), suggesting non-normality.` : " Distribution appears approximately symmetric."}
            </InterpBox>
          </div>
        );
      })}
    </div>
  );
}

function TTestPanel({ dataset, selected }: { dataset: Dataset; selected: string[] }) {
  const textCols = getTextColumns(dataset);
  const numericSelected = selected.filter((v) => isNumericColumn(dataset.rows, v));
  const smartDefault = useMemo(() => bestTTestGroupVar(dataset), [dataset]);
  const [groupVar, setGroupVar] = useState(smartDefault);
  const [outcomeVar, setOutcomeVar] = useState(numericSelected[0] ?? "");

  const groupLevelCount = groupVar ? getUniqueCountForCol(dataset.rows, groupVar) : 0;

  if (!groupVar || !outcomeVar) return <TabGuidance tab="ttest" />;

  const groups = [...new Set(stringValues(dataset.rows, groupVar))].slice(0, 2);
  if (groups.length < 2) return <p style={{ color: "var(--muted)" }} className="text-sm">Grouping variable needs at least 2 unique values.</p>;

  const g1 = dataset.rows.filter((r) => String(r[groupVar]) === groups[0]).map((r) => Number(r[outcomeVar])).filter((v) => !isNaN(v));
  const g2 = dataset.rows.filter((r) => String(r[groupVar]) === groups[1]).map((r) => Number(r[outcomeVar])).filter((v) => !isNaN(v));

  let result;
  try { result = independentTTest(g1, g2); } catch { return <p style={{ color: "var(--muted)" }} className="text-sm">Insufficient data for t-test.</p>; }

  const stars = sigStars(result.pValue);
  const effectLabel = Math.abs(result.cohensD ?? 0) >= 0.8 ? "large" : Math.abs(result.cohensD ?? 0) >= 0.5 ? "medium" : "small";

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-end">
        <VarSelect label="Outcome Variable" value={outcomeVar} onChange={setOutcomeVar} options={dataset.headers.filter((h) => isNumericColumn(dataset.rows, h))} />
        <VarSelect label="Grouping Variable" value={groupVar} onChange={setGroupVar} options={textCols} />
        <LevelWarningBadge count={groupLevelCount} />
      </div>
      <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border-bright)" }}>
        <h3 className="font-semibold mb-3" style={{ color: "var(--primary)" }}>Independent Samples T-Test: {outcomeVar} by {groupVar}</h3>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <StatCard label={`Mean (${groups[0]})`} value={g1.reduce((a, b) => a + b, 0) / g1.length} />
          <StatCard label={`Mean (${groups[1]})`} value={g2.reduce((a, b) => a + b, 0) / g2.length} />
          <StatCard label="t-statistic" value={result.t} />
          <StatCard label={`p-value ${stars}`} value={fmtP(result.pValue)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Mean Diff" value={result.meanDiff} />
          <StatCardInt label="df" value={result.df} />
          <StatCard label="Cohen's d" value={result.cohensD ?? 0} />
        </div>
        <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>95% CI for difference: [{fmtN(result.ci[0])}, {fmtN(result.ci[1])}]</div>
        <InterpBox>
          An independent samples t-test found {result.pValue < 0.05 ? "a statistically significant" : "no statistically significant"} difference in <strong>{outcomeVar}</strong> between {groups[0]} and {groups[1]}, t({fmtInt(result.df)}) = {fmtN(result.t)}, p {fmtP(result.pValue)}{stars}. Cohen&apos;s d = {fmtN(result.cohensD ?? 0)} indicates a <strong>{effectLabel}</strong> effect size.
        </InterpBox>
      </div>
    </div>
  );
}

function AnovaPanel({ dataset, selected }: { dataset: Dataset; selected: string[] }) {
  const textCols = getTextColumns(dataset);
  const numericSelected = selected.filter((v) => isNumericColumn(dataset.rows, v));
  const smartDefault = useMemo(() => bestAnovaGroupVar(dataset), [dataset]);
  const [groupVar, setGroupVar] = useState(smartDefault);
  const [outcomeVar, setOutcomeVar] = useState(numericSelected[0] ?? "");

  const groupLevelCount = groupVar ? getUniqueCountForCol(dataset.rows, groupVar) : 0;

  if (!groupVar || !outcomeVar) return <TabGuidance tab="anova" />;

  const groupNames = [...new Set(stringValues(dataset.rows, groupVar))];
  const groups = groupNames.map((g) => dataset.rows.filter((r) => String(r[groupVar]) === g).map((r) => Number(r[outcomeVar])).filter((v) => !isNaN(v)));

  let result;
  try { result = oneWayANOVA(groups); } catch { return <p style={{ color: "var(--muted)" }} className="text-sm">Insufficient data for ANOVA.</p>; }

  const stars = sigStars(result.pValue);
  const effectLabel = result.etaSquared >= 0.14 ? "large" : result.etaSquared >= 0.06 ? "medium" : "small";

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-end">
        <VarSelect label="Outcome Variable" value={outcomeVar} onChange={setOutcomeVar} options={dataset.headers.filter((h) => isNumericColumn(dataset.rows, h))} />
        <VarSelect label="Grouping Variable" value={groupVar} onChange={setGroupVar} options={textCols} />
        <LevelWarningBadge count={groupLevelCount} />
      </div>
      <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border-bright)" }}>
        <h3 className="font-semibold mb-3" style={{ color: "var(--primary)" }}>One-Way ANOVA: {outcomeVar} by {groupVar}</h3>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <StatCard label="F-statistic" value={result.f} />
          <StatCard label={`p-value ${stars}`} value={fmtP(result.pValue)} />
          <StatCard label="eta-squared" value={result.etaSquared} />
          <StatCard label="df (between/within)" value={`${fmtInt(result.dfBetween)}/${fmtInt(result.dfWithin)}`} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {groupNames.map((g, i) => (
            <StatCard key={g} label={`Mean: ${g}`} value={result.groupMeans[i]} />
          ))}
        </div>
        <InterpBox>
          A one-way ANOVA revealed {result.pValue < 0.05 ? "a statistically significant" : "no statistically significant"} effect of <strong>{groupVar}</strong> on <strong>{outcomeVar}</strong>, F({fmtInt(result.dfBetween)}, {fmtInt(result.dfWithin)}) = {fmtN(result.f)}, p {fmtP(result.pValue)}{stars}. eta-squared = {fmtN(result.etaSquared)}, indicating a <strong>{effectLabel}</strong> effect ({(result.etaSquared * 100).toFixed(1)}% of variance explained).
        </InterpBox>
      </div>
    </div>
  );
}

function CorrelationPanel({ dataset, selected }: { dataset: Dataset; selected: string[] }) {
  const numeric = selected.filter((v) => isNumericColumn(dataset.rows, v));
  if (numeric.length < 2) return <TabGuidance tab="correlation" />;

  const variables = numeric.map((name) => ({ name, values: numericValues(dataset.rows, name) }));
  let result;
  try { result = correlationMatrix(variables); } catch { return <p style={{ color: "var(--muted)" }} className="text-sm">Insufficient data for correlation analysis.</p>; }

  function cellColor(r: number, i: number, j: number): string {
    if (i === j) return "var(--border-bright)";
    const intensity = Math.abs(r);
    if (r > 0) return `rgba(34,197,94,${intensity * 0.6})`;
    return `rgba(239,68,68,${intensity * 0.6})`;
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border-bright)" }}>
      <h3 className="font-semibold" style={{ color: "var(--primary)" }}>Correlation Matrix</h3>
      <div className="overflow-x-auto">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left" style={{ color: "var(--muted)" }}></th>
              {result.variables.map((v) => (
                <th key={v} className="p-2 text-center max-w-16 truncate" style={{ color: "var(--muted)" }}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.matrix.map((row, i) => (
              <tr key={result.variables[i]}>
                <td className="p-2 font-medium text-right pr-3" style={{ color: "var(--foreground)" }}>{result.variables[i]}</td>
                {row.map((r, j) => {
                  const p = result.pValues[i][j];
                  return (
                    <td key={j} className="p-2 text-center rounded font-mono" style={{ background: cellColor(r, i, j), color: "var(--foreground)" }}>
                      {i === j ? "--" : `${fmtN(r)}${sigStars(p)}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InterpBox>
        Cells show Pearson r. * p &lt; .05, ** p &lt; .01, *** p &lt; .001. Green = positive correlation, red = negative. Rule of thumb: |r| &lt; .30 weak, .30-.50 moderate, &gt; .50 strong.
      </InterpBox>
    </div>
  );
}

function CrossTabPanel({ dataset, selected }: { dataset: Dataset; selected: string[] }) {
  const catCols = getTextColumns(dataset);
  const defaults = useMemo(() => bestCrossTabVars(dataset), [dataset]);
  const [rowVar, setRowVar] = useState(selected.find((v) => !isNumericColumn(dataset.rows, v)) ?? defaults[0]);
  const [colVar, setColVar] = useState(defaults[1]);

  if (catCols.length < 2) {
    return (
      <div className="flex items-start gap-3 rounded-lg p-4" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
        <Info size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
        <p className="text-sm" style={{ color: "var(--muted)" }}>Cross-tabulation requires at least two categorical (text) variables. Your dataset has {catCols.length === 0 ? "no" : "only one"} categorical variable.</p>
      </div>
    );
  }

  if (!rowVar || !colVar) return <TabGuidance tab="crosstab" />;

  const rowData = stringValues(dataset.rows, rowVar);
  const colData = stringValues(dataset.rows, colVar);

  let result;
  try { result = crossTabulation(rowData, colData); } catch { return <p style={{ color: "var(--muted)" }} className="text-sm">Insufficient data for cross-tabulation.</p>; }

  const stars = sigStars(result.pValue);
  const effectLabel = result.cramersV >= 0.5 ? "strong" : result.cramersV >= 0.3 ? "moderate" : "weak";

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <VarSelect label="Row Variable" value={rowVar} onChange={setRowVar} options={catCols} />
        <VarSelect label="Column Variable" value={colVar} onChange={setColVar} options={catCols} />
      </div>
      <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border-bright)" }}>
        <h3 className="font-semibold mb-3" style={{ color: "var(--primary)" }}>Cross-Tabulation: {rowVar} x {colVar}</h3>
        <div className="overflow-x-auto mb-3">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left" style={{ color: "var(--muted)" }}>{rowVar} / {colVar}</th>
                {result.cols.map((c) => <th key={c} className="p-2 text-center" style={{ color: "var(--muted)" }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, i) => (
                <tr key={r}>
                  <td className="p-2 font-medium" style={{ color: "var(--foreground)" }}>{r}</td>
                  {result.observed[i].map((obs, j) => (
                    <td key={j} className="p-2 text-center" style={{ color: "var(--foreground)" }}>
                      {obs} <span style={{ color: "var(--muted)" }}>({fmtN(result.expected[i][j])})</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Observed (Expected)</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label={`chi-sq ${stars}`} value={fmtN(result.chiSquare)} />
          <StatCard label={`p-value ${stars}`} value={fmtP(result.pValue)} />
          <StatCard label="Cramer's V" value={fmtN(result.cramersV)} />
        </div>
        <InterpBox>
          chi-sq({fmtInt(result.degreesOfFreedom)}) = {fmtN(result.chiSquare)}, p {fmtP(result.pValue)}{stars}. Cramer&apos;s V = {fmtN(result.cramersV)}, indicating a <strong>{effectLabel}</strong> association between <strong>{rowVar}</strong> and <strong>{colVar}</strong>.
        </InterpBox>
      </div>
    </div>
  );
}

function ReliabilityPanel({ dataset, selected }: { dataset: Dataset; selected: string[] }) {
  const numeric = selected.filter((v) => isNumericColumn(dataset.rows, v));
  if (numeric.length < 2) return <TabGuidance tab="reliability" />;

  const items = numeric.map((col) => numericValues(dataset.rows, col));
  let result;
  try { result = cronbachAlpha(items); } catch { return <p style={{ color: "var(--muted)" }} className="text-sm">Insufficient data for reliability analysis.</p>; }

  const alpha = result.cronbachAlpha;
  const isNegative = alpha < 0;
  const alphaLabel = isNegative ? "invalid" : alpha >= 0.9 ? "excellent" : alpha >= 0.8 ? "good" : alpha >= 0.7 ? "acceptable" : alpha >= 0.6 ? "questionable" : "poor";

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border-bright)" }}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ color: "var(--primary)" }}>Scale Reliability Analysis</h3>
        <StatCard label="Cronbach's alpha" value={fmtN(alpha)} />
      </div>
      {isNegative && (
        <div className="flex items-start gap-3 rounded-lg p-3" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid var(--destructive)" }}>
          <AlertTriangle size={16} style={{ color: "var(--destructive)", flexShrink: 0, marginTop: 2 }} />
          <p className="text-sm" style={{ color: "var(--destructive)" }}>
            Negative alpha indicates the items do not form a coherent scale. This often happens when items are mixed (e.g., demographics mixed with scale items). Select only the items that belong to a single measurement scale.
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              {["Item", "Item-Total r", "alpha if Deleted", "Note"].map((h) => <th key={h} className="p-2 text-left" style={{ color: "var(--muted)" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {numeric.map((col, i) => (
              <tr key={col} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="p-2" style={{ color: "var(--foreground)" }}>{col}</td>
                <td className="p-2 font-mono" style={{ color: "var(--foreground)" }}>{fmtN(result.itemTotalCorrelations[i])}</td>
                <td className="p-2 font-mono" style={{ color: "var(--foreground)" }}>{fmtN(result.alphaIfDeleted[i])}</td>
                <td className="p-2 text-xs" style={{ color: result.alphaIfDeleted[i] > alpha ? "var(--destructive)" : "var(--success)" }}>
                  {result.alphaIfDeleted[i] > alpha ? "!! drops scale" : "ok"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InterpBox>
        Cronbach&apos;s alpha = {fmtN(alpha)} indicates <strong>{alphaLabel}</strong> internal consistency{alpha >= 0.7 ? " (alpha >= 0.70 is the conventional threshold)" : " -- consider revising items with low item-total correlations or high alpha-if-deleted values"}.
      </InterpBox>
    </div>
  );
}

function RegressionPanel({ dataset, selected }: { dataset: Dataset; selected: string[] }) {
  const numeric = dataset.headers.filter((h) => isNumericColumn(dataset.rows, h));
  const [depVar, setDepVar] = useState(selected.find((v) => isNumericColumn(dataset.rows, v)) ?? numeric[0] ?? "");
  const predictorOptions = numeric.filter((h) => h !== depVar);
  const [predictors, setPredictors] = useState<string[]>(selected.filter((v) => isNumericColumn(dataset.rows, v) && v !== depVar).slice(0, 3));

  const togglePredictor = (col: string) => {
    setPredictors((prev) => prev.includes(col) ? prev.filter((p) => p !== col) : [...prev, col]);
  };

  if (!depVar || predictors.length === 0) return <TabGuidance tab="regression" />;

  const yVals = numericValues(dataset.rows, depVar);
  const predVars = predictors.map((name) => ({ name, values: numericValues(dataset.rows, name) }));

  let result;
  try { result = linearRegression(yVals, predVars); } catch { return <p style={{ color: "var(--muted)" }} className="text-sm">Insufficient data for regression. Ensure more observations than predictors.</p>; }

  const fStars = sigStars(result.fPValue);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-start">
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--muted)" }}>Dependent Variable (Y)</label>
          <select value={depVar} onChange={(e) => { setDepVar(e.target.value); setPredictors([]); }} className="rounded px-2 py-1 text-sm" style={selStyle}>
            {numeric.map((h) => <option key={h}>{h}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--muted)" }}>Predictors (click to toggle)</label>
          <div className="flex flex-wrap gap-1">
            {predictorOptions.map((h) => (
              <button key={h} onClick={() => togglePredictor(h)} className="px-2 py-1 rounded text-xs transition-colors" style={{ background: predictors.includes(h) ? "var(--primary)" : "var(--accent)", color: predictors.includes(h) ? "#000" : "var(--muted)", border: "1px solid var(--border-bright)" }}>
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border-bright)" }}>
        <h3 className="font-semibold" style={{ color: "var(--primary)" }}>Linear Regression: {depVar} ~ {predictors.join(" + ")}</h3>
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="R-sq" value={fmtN(result.rSquared)} />
          <StatCard label="Adj. R-sq" value={fmtN(result.adjustedRSquared)} />
          <StatCard label={`F-statistic ${fStars}`} value={fmtN(result.fStatistic)} />
          <StatCard label={`F p-value ${fStars}`} value={fmtP(result.fPValue)} />
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="p-2 text-left" style={{ color: "var(--muted)" }}>Predictor</th>
                <th className="p-2 text-center" style={{ color: "var(--muted)" }}>B</th>
                <th className="p-2 text-center" style={{ color: "var(--muted)" }}>SE</th>
                <th className="p-2 text-center" style={{ color: "var(--muted)" }}>t</th>
                <th className="p-2 text-center" style={{ color: "var(--muted)" }}>p</th>
              </tr>
            </thead>
            <tbody>
              {result.coefficients.map((coef) => (
                <tr key={coef.name} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="p-2" style={{ color: "var(--foreground)" }}>{coef.name}</td>
                  <td className="p-2 text-center font-mono" style={{ color: "var(--foreground)" }}>{fmtN(coef.estimate)}</td>
                  <td className="p-2 text-center font-mono" style={{ color: "var(--muted)" }}>{fmtN(coef.se)}</td>
                  <td className="p-2 text-center font-mono" style={{ color: "var(--foreground)" }}>{fmtN(coef.t)}</td>
                  <td className="p-2 text-center font-mono" style={{ color: coef.pValue < 0.05 ? "var(--success)" : "var(--muted)" }}>
                    {fmtP(coef.pValue)}{sigStars(coef.pValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <InterpBox>
          The model explains {(result.rSquared * 100).toFixed(1)}% of variance in <strong>{depVar}</strong> (R-sq = {fmtN(result.rSquared)}, adj. R-sq = {fmtN(result.adjustedRSquared)}), F({fmtInt(result.dfModel)}, {fmtInt(result.dfResidual)}) = {fmtN(result.fStatistic)}, p {fmtP(result.fPValue)}{fStars}.
          {result.coefficients.filter((c) => c.name !== "(Intercept)" && c.pValue < 0.05).map((c) => ` ${c.name} is a significant predictor (B = ${fmtN(c.estimate)}, p ${fmtP(c.pValue)}${sigStars(c.pValue)}).`).join("")}
        </InterpBox>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ANALYSIS_TABS: { id: AnalysisType; label: string; icon: React.ReactNode }[] = [
  { id: "data", label: "Data", icon: <Table2 size={14} /> },
  { id: "descriptive", label: "Descriptive Stats", icon: <BarChart2 size={14} /> },
  { id: "ttest", label: "T-Test", icon: <GitMerge size={14} /> },
  { id: "anova", label: "ANOVA", icon: <TrendingUp size={14} /> },
  { id: "correlation", label: "Correlation", icon: <Grid3X3 size={14} /> },
  { id: "crosstab", label: "Cross-Tab", icon: <ChevronRight size={14} /> },
  { id: "reliability", label: "Reliability", icon: <Shield size={14} /> },
  { id: "regression", label: "Regression", icon: <LineChart size={14} /> },
];

export function SurveyDashboard() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [analysisType, setAnalysisType] = useState<AnalysisType>("data");
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseCSV(text, file.name);
        const headers = parsed.columns.map((c) => c.name);
        setDataset({ headers, rows: parsed.rows as Dataset["rows"] });
        setSelectedVariables([]);
        setAnalysisType("data");
      } catch {
        alert("Failed to parse CSV. Please check the file format.");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) processFile(file);
  };

  const toggleVariable = (col: string) => {
    setSelectedVariables((prev) =>
      prev.includes(col) ? prev.filter((v) => v !== col) : [...prev, col]
    );
  };

  const selectAllNumeric = useCallback(() => {
    if (!dataset) return;
    const numCols = dataset.headers.filter((h) => isNumericColumn(dataset.rows, h));
    setSelectedVariables(numCols);
  }, [dataset]);

  const clearSelection = useCallback(() => {
    setSelectedVariables([]);
  }, []);

  const copyResults = useCallback(() => {
    if (!resultsRef.current) return;
    const text = resultsRef.current.innerText;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border-bright)" }}>
        <BarChart2 size={20} style={{ color: "var(--primary)" }} />
        <h1 className="font-semibold text-lg tracking-tight">Survey Analysis Dashboard</h1>
        {dataset && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded" style={{ background: "var(--accent)", color: "var(--muted)" }}>{dataset.rows.length} rows &middot; {dataset.headers.length} variables</span>
            <button onClick={copyResults} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors hover:opacity-80" style={{ background: "var(--accent)", color: "var(--muted)", border: "1px solid var(--border)" }}>
              {copied ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {!dataset ? (
        /* ─── Empty state ─── */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-6" style={{ maxWidth: 520, width: "100%" }}>
            <div className="flex flex-col items-center gap-3 text-center">
              <BarChart3 size={24} style={{ color: "var(--primary)" }} />
              <h2 className="text-xl font-semibold">Survey Analysis Dashboard</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Upload a CSV file to run descriptive statistics, t-tests, ANOVA, correlations, cross-tabulations, reliability analysis, and regression — all in your browser.
              </p>
            </div>

            {/* How it works */}
            <div className="w-full rounded-lg p-4" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} style={{ color: "var(--primary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>How it works</span>
              </div>
              <ol className="text-sm space-y-1 ml-5 list-decimal" style={{ color: "var(--muted)" }}>
                <li>Upload a CSV with column headers in the first row</li>
                <li>Select variables from the sidebar</li>
                <li>Switch between analysis tabs to explore your data</li>
                <li>Copy results for your paper or report</li>
              </ol>
            </div>

            {/* Upload drop zone */}
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="cursor-pointer w-full flex flex-col items-center gap-3 rounded-2xl p-10 transition-colors"
              style={{ border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border-bright)"}`, background: dragOver ? "var(--accent)" : "var(--card)" }}
            >
              <Upload size={28} style={{ color: "var(--primary)" }} />
              <div className="text-center">
                <p className="font-semibold text-sm">Drop a .csv file here or click to browse</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>First row should contain column headers</p>
              </div>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>

            {/* Privacy note */}
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
              <Lock size={12} />
              <span>Your data stays in your browser. Nothing is uploaded to any server.</span>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Main layout ─── */
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 overflow-y-auto p-4 space-y-1" style={{ borderRight: "1px solid var(--border-bright)", background: "var(--card)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Variables</p>
              <button onClick={() => { setDataset(null); setSelectedVariables([]); }} className="text-xs hover:underline" style={{ color: "var(--muted)" }}>Change file</button>
            </div>
            {/* Quick actions */}
            <div className="flex gap-1 mb-3">
              <button onClick={selectAllNumeric} className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80" style={{ background: "var(--accent)", color: "var(--primary)", border: "1px solid var(--border)" }}>
                Select All Numeric
              </button>
              <button onClick={clearSelection} className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80" style={{ background: "var(--accent)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                Clear
              </button>
            </div>
            {dataset.headers.map((col) => {
              const isNum = isNumericColumn(dataset.rows, col);
              const sel = selectedVariables.includes(col);
              const uCount = uniqueCount(dataset.rows, col);
              const mPct = missingPct(dataset.rows, col);
              return (
                <button key={col} onClick={() => toggleVariable(col)} className="w-full text-left rounded-lg px-3 py-2 transition-colors hover:opacity-80"
                  style={{ background: sel ? "var(--accent)" : "transparent", borderLeft: sel ? "3px solid var(--primary)" : "3px solid transparent" }}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold flex-shrink-0" style={{ background: isNum ? "var(--primary)" : "var(--muted)", color: "var(--background)" }}>
                      {isNum ? "#" : "T"}
                    </span>
                    <span className="text-sm truncate flex-1" style={{ color: "var(--foreground)" }}>{col}</span>
                    {sel ? <CheckSquare size={12} style={{ color: "var(--primary)" }} /> : <Square size={12} style={{ color: "var(--border-bright)" }} />}
                  </div>
                  <div className="flex gap-2 mt-1 ml-7">
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{uCount} unique</span>
                    {mPct > 0 && <span className="text-xs" style={{ color: "var(--destructive)" }}>{mPct.toFixed(0)}% missing</span>}
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Main area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto" style={{ borderBottom: "1px solid var(--border-bright)" }}>
              {ANALYSIS_TABS.map((tab) => (
                <button key={tab.id} onClick={() => setAnalysisType(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors"
                  style={{ background: analysisType === tab.id ? "var(--background)" : "transparent", color: analysisType === tab.id ? "var(--primary)" : "var(--muted)", borderBottom: analysisType === tab.id ? "2px solid var(--primary)" : "2px solid transparent" }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6" ref={resultsRef}>
              {analysisType !== "data" && selectedVariables.length === 0 && <TabGuidance tab={analysisType} />}
              {analysisType === "data" && <DataPreviewPanel dataset={dataset} />}
              {analysisType === "descriptive" && <DescriptivePanel dataset={dataset} selected={selectedVariables} />}
              {analysisType === "ttest" && <TTestPanel dataset={dataset} selected={selectedVariables} />}
              {analysisType === "anova" && <AnovaPanel dataset={dataset} selected={selectedVariables} />}
              {analysisType === "correlation" && <CorrelationPanel dataset={dataset} selected={selectedVariables} />}
              {analysisType === "crosstab" && <CrossTabPanel dataset={dataset} selected={selectedVariables} />}
              {analysisType === "reliability" && <ReliabilityPanel dataset={dataset} selected={selectedVariables} />}
              {analysisType === "regression" && <RegressionPanel dataset={dataset} selected={selectedVariables} />}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default SurveyDashboard;
