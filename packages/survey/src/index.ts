export * from "./types";
import type {
  DescriptiveStats,
  CrossTab,
  ReliabilityResult,
  CorrelationMatrix,
  TTestResult,
  ANOVAResult,
  ConfidenceIntervalResult,
  RegressionResult,
  MannWhitneyResult,
  PowerAnalysisResult,
} from "./types";

// ---------------------------------------------------------------------------
// Statistical distribution helpers
// ---------------------------------------------------------------------------

/** Natural log of the gamma function (Lanczos approximation). */
function lnGamma(z: number): number {
  if (z <= 0) return Infinity;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i - 1);
  const t = z + g - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z - 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Lower regularized incomplete gamma function P(a, x) via series expansion.
 * P(a, x) = gamma(a, x) / Gamma(a)
 */
function regularizedGammaP(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;
  if (a <= 0) return 1;

  // For x > a + 1, the continued-fraction representation converges faster;
  // use the identity P = 1 - Q where Q uses the CF.
  if (x > a + 1) return 1 - regularizedGammaQ(a, x);

  // Series expansion: P(a,x) = e^{-x} x^a / Gamma(a) * sum_{n=0}^inf x^n / (a * (a+1) * ... * (a+n))
  const lnPrefix = a * Math.log(x) - x - lnGamma(a);
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < 300; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
  }
  return Math.exp(lnPrefix) * sum;
}

/**
 * Upper regularized incomplete gamma function Q(a, x) via continued fraction (Lentz).
 * Q(a, x) = 1 - P(a, x)
 */
function regularizedGammaQ(a: number, x: number): number {
  if (x < 0) return 1;
  if (x === 0) return 1;
  if (a <= 0) return 0;

  if (x <= a + 1) return 1 - regularizedGammaP(a, x);

  // Legendre continued fraction for Q(a,x):
  // Q(a,x) = exp(-x + a*ln(x) - lnGamma(a)) * CF
  // CF evaluated with modified Lentz's method
  // a_1 = 1, b_1 = x + 1 - a
  // a_n = -(n-1)*(n-1-a), b_n = x + 2*n - 1 - a  for n >= 2
  const lnPrefix = a * Math.log(x) - x - lnGamma(a);
  const tiny = 1e-30;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let f = d;
  for (let n = 2; n < 300; n++) {
    const an2 = -(n - 1) * (n - 1 - a);
    b = x + 2 * n - 1 - a;
    d = an2 * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an2 / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return Math.exp(lnPrefix) * f;
}

/**
 * Chi-square survival function: P(X >= x | df).
 * This is the p-value for a chi-square test statistic.
 */
function chiSquarePValue(x: number, df: number): number {
  if (df <= 0 || x < 0) return 1;
  if (x === 0) return 1;
  return regularizedGammaQ(df / 2, x / 2);
}

/**
 * Regularized incomplete beta function I_x(a, b) via continued fraction (Lentz).
 */
function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use the symmetry relation when x > (a+1)/(a+b+2)
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedBeta(1 - x, b, a);
  }

  const lnPrefix = a * Math.log(x) + b * Math.log(1 - x) - Math.log(a)
    - lnGamma(a) - lnGamma(b) + lnGamma(a + b);

  // Continued fraction (Lentz's method)
  const tiny = 1e-30;
  let c = 1;
  let d = 1 / (1 - (a + b) * x / (a + 1));
  if (Math.abs(d) < tiny) d = tiny;
  let f = d;

  for (let m = 1; m < 300; m++) {
    // even step: d_{2m}
    let numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + numerator / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    f *= d * c;

    // odd step: d_{2m+1}
    numerator = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + numerator / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }

  return Math.exp(lnPrefix) * f;
}

/**
 * Two-tailed p-value from the t-distribution.
 * Uses the relationship between the t-distribution CDF and the incomplete beta function:
 *   CDF(t | df) = 1 - 0.5 * I_{df/(df+t²)}(df/2, 1/2)  for t >= 0
 * Two-tailed p = 2 * (1 - CDF(|t|))
 */
function tDistPValue(t: number, df: number): number {
  if (df <= 0) return 1;
  if (!isFinite(t)) return 0;
  if (t === 0) return 1;
  const x = df / (df + t * t);
  const p = regularizedBeta(x, df / 2, 0.5);
  return Math.min(1, Math.max(0, p));
}

/**
 * F-distribution survival function: P(F >= f | df1, df2).
 * Uses the incomplete beta function:
 *   P(F >= f) = I_{df2/(df2 + df1*f)}(df2/2, df1/2)
 */
function fDistPValue(f: number, df1: number, df2: number): number {
  if (df1 <= 0 || df2 <= 0 || f < 0) return 1;
  if (f === 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return regularizedBeta(x, df2 / 2, df1 / 2);
}

/**
 * Inverse t-distribution (approximate) for confidence intervals.
 * Uses Abramowitz & Stegun rational approximation for the normal quantile,
 * then Cornish-Fisher expansion for the t quantile.
 */
function tInv(p: number, df: number): number {
  // Approximate the normal quantile for probability p (upper tail)
  // Using rational approximation for probit
  if (p <= 0) return Infinity;
  if (p >= 1) return 0;

  const a = p < 0.5 ? p : 1 - p;
  const sign = p < 0.5 ? -1 : 1;

  // Abramowitz & Stegun 26.2.23 rational approximation
  const t2 = Math.log(1 / (a * a));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  const tt = Math.sqrt(t2);
  const z = sign * (tt - (c0 + c1 * tt + c2 * tt * tt) / (1 + d1 * tt + d2 * tt * tt + d3 * tt * tt * tt));

  // Cornish-Fisher expansion to convert normal quantile to t quantile
  if (df >= 300) return z; // essentially normal
  const g1 = (z * z * z + z) / (4 * df);
  const g2 = (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df);
  const g3 = (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3);
  return z + g1 + g2 + g3;
}

/**
 * Two-tailed t critical value for confidence level.
 * level is e.g. 0.95 for 95% CI.
 */
function tCritical(level: number, df: number): number {
  const alpha = (1 - level) / 2;
  return Math.abs(tInv(alpha, df));
}

// ---------------------------------------------------------------------------
// Public statistical functions
// ---------------------------------------------------------------------------

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
  const pValue = df > 0 ? chiSquarePValue(chiSquare, df) : 1;

  return { rows, cols, observed, expected, chiSquare, degreesOfFreedom: df, pValue, cramersV };
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
  const pValues = matrix.map((row, i) =>
    row.map((r, j) => {
      if (i === j) return 0; // diagonal: perfect correlation, p=0
      const n = Math.min(variables[i].values.length, variables[j].values.length);
      if (n <= 2) return 1;
      if (Math.abs(r) >= 1) return 0;
      const tStat = r * Math.sqrt((n - 2) / (1 - r * r));
      return tDistPValue(tStat, n - 2);
    })
  );
  return { variables: names, matrix, pValues };
}

export function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

/**
 * Independent samples t-test (Welch's t-test, unequal variances).
 */
export function independentTTest(group1: number[], group2: number[]): TTestResult {
  const n1 = group1.length;
  const n2 = group2.length;
  if (n1 === 0 || n2 === 0) throw new Error("Groups must not be empty");

  const m1 = group1.reduce((a, b) => a + b, 0) / n1;
  const m2 = group2.reduce((a, b) => a + b, 0) / n2;
  const v1 = n1 > 1 ? group1.reduce((s, v) => s + (v - m1) ** 2, 0) / (n1 - 1) : 0;
  const v2 = n2 > 1 ? group2.reduce((s, v) => s + (v - m2) ** 2, 0) / (n2 - 1) : 0;

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) {
    return { t: 0, df: n1 + n2 - 2, pValue: 1, meanDiff: m1 - m2, ci: [m1 - m2, m1 - m2], cohensD: 0 };
  }

  const t = (m1 - m2) / se;

  // Welch-Satterthwaite degrees of freedom
  const num = (v1 / n1 + v2 / n2) ** 2;
  const denom = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
  const df = denom > 0 ? num / denom : n1 + n2 - 2;

  const pValue = tDistPValue(t, df);

  // Cohen's d (pooled SD)
  const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
  const pooledSD = Math.sqrt(pooledVar);
  const cohensD = pooledSD > 0 ? (m1 - m2) / pooledSD : 0;

  // 95% CI for the mean difference
  const tc = tCritical(0.95, df);
  const ci: [number, number] = [(m1 - m2) - tc * se, (m1 - m2) + tc * se];

  return { t, df, pValue, meanDiff: m1 - m2, ci, cohensD };
}

/**
 * Paired samples t-test.
 */
export function pairedTTest(before: number[], after: number[]): TTestResult {
  const n = before.length;
  if (n === 0) throw new Error("Arrays must not be empty");
  if (before.length !== after.length) throw new Error("Arrays must have equal length");

  const diffs = before.map((b, i) => b - after[i]);
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;

  if (n === 1) {
    return { t: 0, df: 0, pValue: 1, meanDiff, ci: [meanDiff, meanDiff] };
  }

  const sdDiff = Math.sqrt(diffs.reduce((s, d) => s + (d - meanDiff) ** 2, 0) / (n - 1));
  const se = sdDiff / Math.sqrt(n);

  if (se === 0) {
    return { t: 0, df: n - 1, pValue: meanDiff === 0 ? 1 : 0, meanDiff, ci: [meanDiff, meanDiff] };
  }

  const t = meanDiff / se;
  const df = n - 1;
  const pValue = tDistPValue(t, df);

  const tc = tCritical(0.95, df);
  const ci: [number, number] = [meanDiff - tc * se, meanDiff + tc * se];

  return { t, df, pValue, meanDiff, ci };
}

/**
 * One-way ANOVA (analysis of variance).
 */
export function oneWayANOVA(groups: number[][]): ANOVAResult {
  const k = groups.length;
  if (k < 2) throw new Error("Need at least 2 groups");

  const groupMeans = groups.map((g) => {
    if (g.length === 0) throw new Error("Groups must not be empty");
    return g.reduce((a, b) => a + b, 0) / g.length;
  });
  const N = groups.reduce((s, g) => s + g.length, 0);
  const grandMean = groups.flat().reduce((a, b) => a + b, 0) / N;

  // Sum of squares between groups
  const ssBetween = groups.reduce((s, g, i) => s + g.length * (groupMeans[i] - grandMean) ** 2, 0);
  // Sum of squares within groups
  const ssWithin = groups.reduce((s, g, i) => s + g.reduce((s2, v) => s2 + (v - groupMeans[i]) ** 2, 0), 0);

  const dfBetween = k - 1;
  const dfWithin = N - k;

  if (dfWithin <= 0) {
    return { f: 0, dfBetween, dfWithin: Math.max(0, dfWithin), pValue: 1, etaSquared: 0, groupMeans };
  }

  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msWithin > 0 ? msBetween / msWithin : 0;
  const pValue = f > 0 ? fDistPValue(f, dfBetween, dfWithin) : 1;
  const etaSquared = (ssBetween + ssWithin) > 0 ? ssBetween / (ssBetween + ssWithin) : 0;

  return { f, dfBetween, dfWithin, pValue, etaSquared, groupMeans };
}

/**
 * Confidence interval for a mean.
 * @param level Confidence level (default 0.95 for 95% CI).
 */
export function confidenceInterval(values: number[], level: number = 0.95): ConfidenceIntervalResult {
  const n = values.length;
  if (n === 0) throw new Error("Empty array");

  const mean = values.reduce((a, b) => a + b, 0) / n;

  if (n === 1) {
    return { mean, lower: mean, upper: mean, level };
  }

  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  const se = sd / Math.sqrt(n);
  const tc = tCritical(level, n - 1);

  return {
    mean,
    lower: mean - tc * se,
    upper: mean + tc * se,
    level,
  };
}

// ---------------------------------------------------------------------------
// Linear Regression (OLS)
// ---------------------------------------------------------------------------

/**
 * Multiple linear regression using ordinary least squares.
 * y = b0 + b1*x1 + b2*x2 + ...
 */
export function linearRegression(
  y: number[],
  predictors: { name: string; values: number[] }[],
): RegressionResult {
  const n = y.length;
  const p = predictors.length;
  if (n <= p + 1) throw new Error('Need more observations than predictors');

  // Build design matrix X with intercept column
  const X: number[][] = y.map((_, i) => [1, ...predictors.map((pred) => pred.values[i])]);
  const cols = p + 1;

  // X'X
  const XtX: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < cols; j++)
      for (let k = 0; k < n; k++) XtX[i][j] += X[k][i] * X[k][j];

  // X'y
  const Xty: number[] = new Array(cols).fill(0);
  for (let i = 0; i < cols; i++)
    for (let k = 0; k < n; k++) Xty[i] += X[k][i] * y[k];

  // Solve XtX * b = Xty using Gaussian elimination
  const aug = XtX.map((row, i) => [...row, Xty[i]]);
  for (let col = 0; col < cols; col++) {
    let maxRow = col;
    for (let row = col + 1; row < cols; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) continue;
    const pivot = aug[col][col];
    for (let j = col; j <= cols; j++) aug[col][j] /= pivot;
    for (let row = 0; row < cols; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= cols; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  const b = aug.map((row) => row[cols]);

  // Predictions & residuals
  const yHat = X.map((row) => row.reduce((s, v, i) => s + v * b[i], 0));
  const residuals = y.map((yi, i) => yi - yHat[i]);
  const yMean = y.reduce((a, v) => a + v, 0) / n;
  const ssTot = y.reduce((s, yi) => s + (yi - yMean) ** 2, 0);
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const ssReg = ssTot - ssRes;

  const dfModel = p;
  const dfResidual = n - p - 1;
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const adjustedRSquared = dfResidual > 0 ? 1 - (ssRes / dfResidual) / (ssTot / (n - 1)) : 0;
  const residualSE = dfResidual > 0 ? Math.sqrt(ssRes / dfResidual) : 0;
  const msReg = dfModel > 0 ? ssReg / dfModel : 0;
  const msRes = dfResidual > 0 ? ssRes / dfResidual : 0;
  const fStatistic = msRes > 0 ? msReg / msRes : 0;
  const fPValue = fStatistic > 0 ? fDistPValue(fStatistic, dfModel, dfResidual) : 1;

  // Invert XtX for standard errors (recompute)
  const XtXInv = invertMatrix(XtX);
  const names = ['(Intercept)', ...predictors.map((p) => p.name)];
  const coefficients = b.map((est, i) => {
    const se = XtXInv ? Math.sqrt(Math.max(0, XtXInv[i][i] * (ssRes / dfResidual))) : 0;
    const t = se > 0 ? est / se : 0;
    const pValue = se > 0 ? tDistPValue(t, dfResidual) : 1;
    return { name: names[i], estimate: est, se, t, pValue };
  });

  return { coefficients, rSquared, adjustedRSquared, fStatistic, fPValue, residualSE, dfModel, dfResidual };
}

function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length;
  const aug = A.map((row, i) => {
    const identity = new Array(n).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) return null;
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row.slice(n));
}

// ---------------------------------------------------------------------------
// Mann-Whitney U Test (non-parametric)
// ---------------------------------------------------------------------------

export function mannWhitneyU(group1: number[], group2: number[]): MannWhitneyResult {
  const n1 = group1.length;
  const n2 = group2.length;
  const combined = [
    ...group1.map((v) => ({ v, group: 1 })),
    ...group2.map((v) => ({ v, group: 2 })),
  ].sort((a, b) => a.v - b.v);

  // Assign ranks (handle ties)
  const ranks = new Array(combined.length);
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].v === combined[i].v) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) ranks[k] = avgRank;
    i = j;
  }

  let R1 = 0;
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].group === 1) R1 += ranks[k];
  }

  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);

  const meanU = (n1 * n2) / 2;
  const sdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = sdU > 0 ? (U1 - meanU) / sdU : 0;

  // Normal approximation for p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const rankBiserialR = 1 - (2 * U) / (n1 * n2);

  return { U, z, pValue, rankBiserialR };
}

function normalCDF(z: number): number {
  // Abramowitz & Stegun approximation
  if (z < -8) return 0;
  if (z > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

// ---------------------------------------------------------------------------
// Power Analysis (sample size estimation)
// ---------------------------------------------------------------------------

export function powerAnalysis(options: {
  effectSize: number;
  alpha?: number;
  power?: number;
  test?: 'ttest' | 'anova' | 'correlation';
}): PowerAnalysisResult {
  const alpha = options.alpha ?? 0.05;
  const power = options.power ?? 0.80;
  const d = options.effectSize;
  const test = options.test ?? 'ttest';

  // Normal quantiles
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(power);

  let requiredN: number;
  if (test === 'ttest') {
    // Two-sample t-test: n per group = ((z_a + z_b) / d)^2 * 2
    requiredN = Math.ceil(2 * ((zAlpha + zBeta) / d) ** 2);
  } else if (test === 'correlation') {
    // Correlation: n = ((z_a + z_b) / arctanh(d))^2 + 3
    const z = Math.atanh(Math.min(Math.abs(d), 0.999));
    requiredN = Math.ceil(((zAlpha + zBeta) / z) ** 2 + 3);
  } else {
    // ANOVA: approximate as t-test equivalent
    requiredN = Math.ceil(2 * ((zAlpha + zBeta) / d) ** 2);
  }

  return { requiredN: Math.max(requiredN, 4), effectSize: d, alpha, power, test };
}

function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = p < 0.5 ? p : 1 - p;
  const sign = p < 0.5 ? -1 : 1;
  const t = Math.sqrt(-2 * Math.log(a));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return sign * (t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
}
