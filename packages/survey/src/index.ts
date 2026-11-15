export * from "./types";
import type { DescriptiveStats, CrossTab, ReliabilityResult, CorrelationMatrix } from "./types";

export function descriptive(values: number[]): DescriptiveStats {
  const n = values.length;
  if (n === 0) throw new Error("Empty array");
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1 || 1);
  const sd = Math.sqrt(variance);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];

  const freqMap = new Map<number, number>();
  for (const v of values) freqMap.set(v, (freqMap.get(v) ?? 0) + 1);
  const maxFreq = Math.max(...freqMap.values());
  const mode = [...freqMap.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v);

  const skewness = n > 2 ? values.reduce((s, v) => s + ((v - mean) / sd) ** 3, 0) * n / ((n - 1) * (n - 2)) : 0;
  const kurtosis = n > 3 ? values.reduce((s, v) => s + ((v - mean) / sd) ** 4, 0) * n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)) : 0;

  return { n, mean, median, mode, sd, variance, min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0], skewness, kurtosis, q1, q3, iqr: q3 - q1 };
}

export function crossTabulation(rowVar: string[], colVar: string[]): CrossTab {
  const rows = [...new Set(rowVar)];
  const cols = [...new Set(colVar)];
  const n = rowVar.length;
  const observed: number[][] = rows.map((r) => cols.map((c) => rowVar.filter((rv, i) => rv === r && colVar[i] === c).length));
  const rowTotals = observed.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = cols.map((_, j) => observed.reduce((s, row) => s + row[j], 0));
  const expected = rows.map((_, i) => cols.map((_, j) => (rowTotals[i] * colTotals[j]) / n));

  let chiSquare = 0;
  for (let i = 0; i < rows.length; i++)
    for (let j = 0; j < cols.length; j++)
      if (expected[i][j] > 0) chiSquare += (observed[i][j] - expected[i][j]) ** 2 / expected[i][j];

  const df = (rows.length - 1) * (cols.length - 1);
  const cramersV = Math.sqrt(chiSquare / (n * (Math.min(rows.length, cols.length) - 1) || 1));

  return { rows, cols, observed, expected, chiSquare, degreesOfFreedom: df, pValue: 0, cramersV };
}

export function cronbachAlpha(items: number[][]): ReliabilityResult {
  const k = items.length;
  const n = items[0]?.length ?? 0;
  const itemVariances = items.map((item) => { const m = item.reduce((a, b) => a + b, 0) / n; return item.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1 || 1); });
  const totals = Array.from({ length: n }, (_, i) => items.reduce((s, item) => s + item[i], 0));
  const totalMean = totals.reduce((a, b) => a + b, 0) / n;
  const totalVariance = totals.reduce((s, v) => s + (v - totalMean) ** 2, 0) / (n - 1 || 1);
  const sumItemVar = itemVariances.reduce((a, b) => a + b, 0);
  const alpha = (k / (k - 1)) * (1 - sumItemVar / totalVariance);

  const itemTotalCorrelations = items.map((item) => pearsonR(item, totals));
  const alphaIfDeleted = items.map((_, idx) => {
    const remaining = items.filter((_, i) => i !== idx);
    return remaining.length > 1 ? cronbachAlpha(remaining).cronbachAlpha : 0;
  });

  return { cronbachAlpha: alpha, itemCount: k, itemTotalCorrelations, alphaIfDeleted };
}

export function correlationMatrix(variables: { name: string; values: number[] }[]): CorrelationMatrix {
  const names = variables.map((v) => v.name);
  const matrix = variables.map((v1) => variables.map((v2) => pearsonR(v1.values, v2.values)));
  const pValues = matrix.map((row) => row.map(() => 0));
  return { variables: names, matrix, pValues };
}

function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}
