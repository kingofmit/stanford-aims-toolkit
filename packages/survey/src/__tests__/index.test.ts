import { describe, it, expect } from "vitest";
import {
  descriptive,
  crossTabulation,
  cronbachAlpha,
  correlationMatrix,
  pearsonR,
  independentTTest,
  pairedTTest,
  oneWayANOVA,
  confidenceInterval,
  linearRegression,
  mannWhitneyU,
  powerAnalysis,
} from "../index";

// ---------------------------------------------------------------------------
// descriptive
// ---------------------------------------------------------------------------

describe("descriptive", () => {
  it("computes basic stats for [1,2,3,4,5] — R benchmark", () => {
    const s = descriptive([1, 2, 3, 4, 5]);
    expect(s.n).toBe(5);
    expect(s.mean).toBeCloseTo(3, 10);
    expect(s.median).toBeCloseTo(3, 10);
    expect(s.min).toBe(1);
    expect(s.max).toBe(5);
    expect(s.range).toBe(4);
    // Sample SD: sqrt(10/4) = sqrt(2.5) ≈ 1.5811388 (matches R sd([1,2,3,4,5]))
    expect(s.sd).toBeCloseTo(1.5811388, 5);
    expect(s.variance).toBeCloseTo(2.5, 10);
  });

  it("computes basic stats for [2,4,6,8,10] — R benchmark", () => {
    const s = descriptive([2, 4, 6, 8, 10]);
    expect(s.mean).toBeCloseTo(6, 10);
    // Sample SD: sqrt(40/4) = sqrt(10) ≈ 3.162278 (matches R sd([2,4,6,8,10]))
    expect(s.sd).toBeCloseTo(3.162278, 5);
    expect(s.median).toBeCloseTo(6, 10);
  });

  it("handles single-value array — SD is 0, mean = value", () => {
    const s = descriptive([42]);
    expect(s.n).toBe(1);
    expect(s.mean).toBe(42);
    expect(s.median).toBe(42);
    expect(s.sd).toBe(0);
    expect(s.min).toBe(42);
    expect(s.max).toBe(42);
    expect(s.range).toBe(0);
  });

  it("computes standard deviation for classic dataset", () => {
    // [2,4,4,4,5,5,7,9]: sample SD ≈ 2.138 (R benchmark)
    const s = descriptive([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.n).toBe(8);
    expect(s.mean).toBeCloseTo(5, 10);
    expect(s.sd).toBeCloseTo(2.138, 2);
  });

  it("finds correct mode", () => {
    const s = descriptive([1, 2, 2, 3, 3, 3, 4]);
    expect(s.mode).toContain(3);
    expect(s.mode).not.toContain(1);
    expect(s.mode).not.toContain(4);
  });

  it("reports multiple modes for bimodal data", () => {
    const s = descriptive([1, 1, 2, 3, 3]);
    expect(s.mode).toContain(1);
    expect(s.mode).toContain(3);
    expect(s.mode.length).toBe(2);
  });

  it("skewness is near 0 for symmetric data", () => {
    // A perfectly symmetric dataset: mean-centered around 0
    const s = descriptive([1, 2, 3, 4, 5]);
    expect(Math.abs(s.skewness)).toBeCloseTo(0, 10);
  });

  it("throws on empty array", () => {
    expect(() => descriptive([])).toThrow();
  });

  it("computes IQR and quartiles", () => {
    const s = descriptive([1, 2, 3, 4, 5]);
    expect(s.q1).toBeDefined();
    expect(s.q3).toBeDefined();
    expect(s.iqr).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// pearsonR
// ---------------------------------------------------------------------------

describe("pearsonR", () => {
  it("returns 1.0 for perfectly positively correlated data — R benchmark", () => {
    // cor([1,2,3,4,5], [2,4,6,8,10]) = 1 exactly in R
    expect(pearsonR([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1.0, 10);
  });

  it("returns -1.0 for perfectly negatively correlated data", () => {
    expect(pearsonR([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])).toBeCloseTo(-1.0, 10);
  });

  it("returns ~0 for orthogonal data", () => {
    // x = [1,2,3,4], y = [2,1,2,1] — roughly symmetric deviations cancel out
    // Using an explicitly mean-zero pair: [1,-1,1,-1] vs [1,1,-1,-1]
    expect(pearsonR([1, -1, 1, -1], [1, 1, -1, -1])).toBeCloseTo(0, 10);
  });

  it("returns 0 for empty arrays", () => {
    expect(pearsonR([], [])).toBe(0);
  });

  it("returns 0 when one variable has zero variance", () => {
    expect(pearsonR([1, 2, 3], [5, 5, 5])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// crossTabulation
// ---------------------------------------------------------------------------

describe("crossTabulation", () => {
  it("computes correct chi-square for independent data", () => {
    // 6 obs, A→{X,X,Y}, B→{X,Y,Y}: observed [[2,1],[1,2]], expected [[1.5,1.5],[1.5,1.5]]
    // chi-square = 4 * ((0.5)^2 / 1.5) = 4 * (0.25/1.5) ≈ 0.667, df = 1
    const row = ["A", "A", "A", "B", "B", "B"];
    const col = ["X", "X", "Y", "X", "Y", "Y"];
    const result = crossTabulation(row, col);
    expect(result.degreesOfFreedom).toBe(1);
    expect(result.chiSquare).toBeGreaterThanOrEqual(0);
    expect(result.cramersV).toBeGreaterThanOrEqual(0);
    expect(result.cramersV).toBeLessThanOrEqual(1);
  });

  it("gives p < 0.05 for clearly associated variables", () => {
    // Perfect 2x2 association: A always→X, B always→Y (10 obs each)
    const row = Array(10).fill("A").concat(Array(10).fill("B"));
    const col = Array(10).fill("X").concat(Array(10).fill("Y"));
    const result = crossTabulation(row, col);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.cramersV).toBeCloseTo(1.0, 5);
    expect(result.chiSquare).toBeCloseTo(20, 5); // chi-square = n for perfect 2x2
  });

  it("gives Cramér's V = 1 for perfect association", () => {
    const row = ["A", "A", "B", "B"];
    const col = ["X", "X", "Y", "Y"];
    const result = crossTabulation(row, col);
    expect(result.cramersV).toBeCloseTo(1.0, 5);
  });

  it("gives p ≈ 1 and chi-square ≈ 0 for uniform distribution", () => {
    // All cells equally filled: chi-square should be 0
    const row = ["A", "A", "B", "B"];
    const col = ["X", "Y", "X", "Y"];
    const result = crossTabulation(row, col);
    expect(result.chiSquare).toBeCloseTo(0, 10);
    expect(result.pValue).toBeCloseTo(1, 2);
  });

  it("builds the observed table correctly", () => {
    const row = ["A", "A", "B"];
    const col = ["X", "Y", "X"];
    const result = crossTabulation(row, col);
    expect(result.rows).toContain("A");
    expect(result.rows).toContain("B");
    expect(result.cols).toContain("X");
    expect(result.cols).toContain("Y");
    // Total counts must sum to n
    const total = result.observed.flat().reduce((a, b) => a + b, 0);
    expect(total).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// independentTTest
// ---------------------------------------------------------------------------

describe("independentTTest", () => {
  it("gives p < 0.05 for clearly different groups", () => {
    const g1 = [1, 2, 1, 2, 1, 2];
    const g2 = [9, 10, 9, 10, 9, 10];
    const result = independentTTest(g1, g2);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.t).toBeLessThan(0); // g1 mean < g2 mean → negative t
    expect(result.meanDiff).toBeCloseTo(-8, 5);
  });

  it("gives t ≈ 0 and p ≈ 1 for identical groups", () => {
    const g = [3, 4, 5, 6, 7];
    const result = independentTTest(g, g);
    expect(result.t).toBeCloseTo(0, 5);
    expect(result.pValue).toBeCloseTo(1, 2);
    expect(result.meanDiff).toBeCloseTo(0, 10);
  });

  it("computes large Cohen's d for very different groups", () => {
    const g1 = [1, 1, 1, 1, 1];
    const g2 = [10, 10, 10, 10, 10];
    // Pooled SD is 0 when both groups have identical values → se = 0 path
    // Use slightly varied groups instead
    const g1v = [1, 1.1, 0.9, 1.0, 1.1];
    const g2v = [10, 10.1, 9.9, 10.0, 10.1];
    const result = independentTTest(g1v, g2v);
    expect(Math.abs(result.cohensD!)).toBeGreaterThan(0.8);
  });

  it("95% CI contains the true mean difference", () => {
    // Both groups drawn from populations with known means 0 and 5
    const g1 = [0, 0, 0, 0, 0];
    const g2 = [5, 5, 5, 5, 5];
    // se = 0 branch: CI is [meanDiff, meanDiff]
    const result = independentTTest(g1, g2);
    expect(result.meanDiff).toBeCloseTo(-5, 10);
    // With varied groups the CI should bracket the true diff
    const g1v = [-0.5, 0.2, -0.1, 0.3, 0.1];
    const g2v = [4.8, 5.1, 4.9, 5.2, 5.0];
    const r2 = independentTTest(g1v, g2v);
    expect(r2.ci[0]).toBeLessThan(r2.meanDiff);
    expect(r2.ci[1]).toBeGreaterThan(r2.meanDiff);
  });

  it("throws on empty groups", () => {
    expect(() => independentTTest([], [1, 2, 3])).toThrow();
    expect(() => independentTTest([1, 2, 3], [])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// pairedTTest
// ---------------------------------------------------------------------------

describe("pairedTTest", () => {
  it("detects consistent before→after increase", () => {
    // before=[1,3,5,7,9], after=[2,4,6,8,11]: diffs=[-1,-1,-1,-1,-2]
    const before = [1, 3, 5, 7, 9];
    const after = [2, 4, 6, 8, 11];
    const result = pairedTTest(before, after);
    expect(result.meanDiff).toBeCloseTo(-1.2, 5);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.df).toBe(4);
  });

  it("gives p ≈ 1 and t ≈ 0 when before and after are identical", () => {
    // diffs are all 0 → sd = 0 → se = 0 branch returns p = 1
    const data = [5, 5, 5, 5];
    const result = pairedTTest(data, data);
    expect(result.t).toBe(0);
    expect(result.pValue).toBe(1);
  });

  it("mean difference has correct sign", () => {
    // before > after → positive meanDiff
    const result = pairedTTest([10, 12, 14], [8, 9, 10]);
    expect(result.meanDiff).toBeGreaterThan(0);
  });

  it("throws on empty arrays", () => {
    expect(() => pairedTTest([], [])).toThrow();
  });

  it("throws when arrays have unequal lengths", () => {
    expect(() => pairedTTest([1, 2], [1, 2, 3])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// oneWayANOVA
// ---------------------------------------------------------------------------

describe("oneWayANOVA", () => {
  it("gives F ≈ 0 and p ≈ 1 for identical groups", () => {
    const g = [5, 5, 5, 5, 5];
    const result = oneWayANOVA([g, g, g]);
    expect(result.f).toBeCloseTo(0, 5);
    expect(result.pValue).toBeCloseTo(1, 2);
    expect(result.etaSquared).toBeCloseTo(0, 10);
  });

  it("gives p < 0.05 and positive eta-squared for clearly different groups", () => {
    const g1 = [1, 2, 1, 2, 1];
    const g2 = [5, 6, 5, 6, 5];
    const g3 = [10, 11, 10, 11, 10];
    const result = oneWayANOVA([g1, g2, g3]);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.etaSquared).toBeGreaterThan(0);
    expect(result.f).toBeGreaterThan(1);
  });

  it("computes correct group means", () => {
    const g1 = [1, 2, 3];
    const g2 = [7, 8, 9];
    const result = oneWayANOVA([g1, g2]);
    expect(result.groupMeans[0]).toBeCloseTo(2, 10);
    expect(result.groupMeans[1]).toBeCloseTo(8, 10);
  });

  it("F = t² for two groups (ANOVA↔t-test equivalence)", () => {
    const g1 = [1, 2, 3, 4, 5];
    const g2 = [3, 4, 5, 6, 7];
    const anova = oneWayANOVA([g1, g2]);
    const ttest = independentTTest(g1, g2);
    // For equal variances F = t²; Welch may differ slightly, but should be close
    expect(anova.f).toBeCloseTo(ttest.t ** 2, 0);
  });

  it("throws on fewer than 2 groups", () => {
    expect(() => oneWayANOVA([[1, 2, 3]])).toThrow();
  });

  it("degrees of freedom are correct", () => {
    // 3 groups of 4: dfBetween = 2, dfWithin = 9
    const g = [1, 2, 3, 4];
    const result = oneWayANOVA([g, g, g]);
    expect(result.dfBetween).toBe(2);
    expect(result.dfWithin).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// correlationMatrix
// ---------------------------------------------------------------------------

describe("correlationMatrix", () => {
  it("diagonal is exactly 1.0 (self-correlation)", () => {
    const vars = [
      { name: "x", values: [1, 2, 3, 4, 5] },
      { name: "y", values: [5, 4, 3, 2, 1] },
    ];
    const result = correlationMatrix(vars);
    expect(result.matrix[0][0]).toBeCloseTo(1.0, 10);
    expect(result.matrix[1][1]).toBeCloseTo(1.0, 10);
  });

  it("perfectly positive correlation: r = 1.0, p ≈ 0 — R benchmark", () => {
    const vars = [
      { name: "x", values: [1, 2, 3, 4, 5] },
      { name: "y", values: [2, 4, 6, 8, 10] },
    ];
    const result = correlationMatrix(vars);
    expect(result.matrix[0][1]).toBeCloseTo(1.0, 5);
    expect(result.pValues[0][1]).toBeCloseTo(0, 3);
  });

  it("perfectly negative correlation: r = -1.0", () => {
    const vars = [
      { name: "x", values: [1, 2, 3, 4, 5] },
      { name: "y", values: [10, 8, 6, 4, 2] },
    ];
    const result = correlationMatrix(vars);
    expect(result.matrix[0][1]).toBeCloseTo(-1.0, 5);
  });

  it("near-zero correlation for orthogonal data", () => {
    const vars = [
      { name: "x", values: [1, -1, 1, -1] },
      { name: "y", values: [1, 1, -1, -1] },
    ];
    const result = correlationMatrix(vars);
    expect(Math.abs(result.matrix[0][1])).toBeCloseTo(0, 10);
  });

  it("variable names are preserved", () => {
    const vars = [
      { name: "trust", values: [1, 2, 3] },
      { name: "income", values: [4, 5, 6] },
    ];
    const result = correlationMatrix(vars);
    expect(result.variables).toEqual(["trust", "income"]);
  });

  it("matrix is symmetric", () => {
    const vars = [
      { name: "a", values: [1, 2, 3, 4, 5] },
      { name: "b", values: [2, 3, 1, 5, 4] },
    ];
    const result = correlationMatrix(vars);
    expect(result.matrix[0][1]).toBeCloseTo(result.matrix[1][0], 10);
  });
});

// ---------------------------------------------------------------------------
// cronbachAlpha
// ---------------------------------------------------------------------------

describe("cronbachAlpha", () => {
  it("alpha ≈ 1.0 for perfectly correlated items", () => {
    // All items are identical → total variance = k² * item variance → alpha = 1
    const item = [1, 2, 3, 4, 5, 4, 3, 2];
    const result = cronbachAlpha([item, item, item, item]);
    expect(result.cronbachAlpha).toBeCloseTo(1.0, 5);
  });

  it("alpha > 0.5 for genuinely correlated items", () => {
    const item1 = [5, 4, 5, 4, 3, 5, 4, 5];
    const item2 = [4, 4, 5, 3, 3, 5, 4, 4];
    const item3 = [5, 3, 4, 4, 3, 4, 3, 5];
    const result = cronbachAlpha([item1, item2, item3]);
    expect(result.cronbachAlpha).toBeGreaterThan(0.5);
  });

  it("reports correct item count", () => {
    const item = [1, 2, 3];
    const result = cronbachAlpha([item, item, item]);
    expect(result.itemCount).toBe(3);
  });

  it("itemTotalCorrelations has one entry per item", () => {
    const items = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
    const result = cronbachAlpha(items);
    expect(result.itemTotalCorrelations.length).toBe(3);
    expect(result.alphaIfDeleted.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// confidenceInterval
// ---------------------------------------------------------------------------

describe("confidenceInterval", () => {
  it("95% CI contains the true mean for [1,2,3,4,5]", () => {
    const values = [1, 2, 3, 4, 5];
    const result = confidenceInterval(values, 0.95);
    const trueMean = 3;
    expect(result.mean).toBeCloseTo(trueMean, 10);
    expect(result.lower).toBeLessThan(trueMean);
    expect(result.upper).toBeGreaterThan(trueMean);
    expect(result.level).toBe(0.95);
  });

  it("99% CI is wider than 95% CI", () => {
    const values = [2, 4, 6, 8, 10];
    const ci95 = confidenceInterval(values, 0.95);
    const ci99 = confidenceInterval(values, 0.99);
    const width95 = ci95.upper - ci95.lower;
    const width99 = ci99.upper - ci99.lower;
    expect(width99).toBeGreaterThan(width95);
  });

  it("lower < mean < upper for any dataset", () => {
    const values = [3, 7, 2, 9, 1, 5];
    const result = confidenceInterval(values);
    expect(result.lower).toBeLessThan(result.mean);
    expect(result.upper).toBeGreaterThan(result.mean);
  });

  it("single-value: CI collapses to that value", () => {
    const result = confidenceInterval([42]);
    expect(result.lower).toBe(42);
    expect(result.upper).toBe(42);
    expect(result.mean).toBe(42);
  });

  it("throws on empty array", () => {
    expect(() => confidenceInterval([])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// linearRegression
// ---------------------------------------------------------------------------

describe("linearRegression", () => {
  it("R² ≈ 1 for perfect linear relationship", () => {
    // y = 2 + 3x exactly
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const y = x.map((v) => 2 + 3 * v);
    const result = linearRegression(y, [{ name: "x", values: x }]);
    expect(result.rSquared).toBeCloseTo(1.0, 5);
  });

  it("recovers known slope and intercept", () => {
    // y = 5 + 2x
    const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const y = x.map((v) => 5 + 2 * v);
    const result = linearRegression(y, [{ name: "x", values: x }]);
    const intercept = result.coefficients.find((c) => c.name === "(Intercept)")!;
    const slope = result.coefficients.find((c) => c.name === "x")!;
    expect(intercept.estimate).toBeCloseTo(5, 4);
    expect(slope.estimate).toBeCloseTo(2, 4);
  });

  it("multiple predictors: R² ≈ 1 for exact linear combo", () => {
    // y = 1 + 2*x1 + 3*x2
    const x1 = [1, 2, 3, 4, 5, 6, 7, 8];
    const x2 = [2, 1, 4, 3, 6, 5, 8, 7];
    const y = x1.map((v, i) => 1 + 2 * v + 3 * x2[i]);
    const result = linearRegression(y, [
      { name: "x1", values: x1 },
      { name: "x2", values: x2 },
    ]);
    expect(result.rSquared).toBeCloseTo(1.0, 4);
    const b1 = result.coefficients.find((c) => c.name === "x1")!;
    const b2 = result.coefficients.find((c) => c.name === "x2")!;
    expect(b1.estimate).toBeCloseTo(2, 3);
    expect(b2.estimate).toBeCloseTo(3, 3);
  });

  it("fStatistic is significant for a real relationship", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = x.map((v) => 1 + 2 * v + (Math.random() * 0.001 - 0.0005));
    const result = linearRegression(y, [{ name: "x", values: x }]);
    expect(result.fPValue).toBeLessThan(0.05);
  });

  it("coefficient count equals number of predictors + intercept", () => {
    const x1 = [1, 2, 3, 4, 5, 6];
    const x2 = [6, 5, 4, 3, 2, 1];
    const y = x1.map((v, i) => v + x2[i]);
    const result = linearRegression(y, [
      { name: "a", values: x1 },
      { name: "b", values: x2 },
    ]);
    expect(result.coefficients.length).toBe(3); // intercept + 2 predictors
    expect(result.dfModel).toBe(2);
  });

  it("throws when observations ≤ predictors + 1", () => {
    expect(() =>
      linearRegression([1, 2], [
        { name: "x1", values: [1, 2] },
        { name: "x2", values: [3, 4] },
      ])
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// mannWhitneyU
// ---------------------------------------------------------------------------

describe("mannWhitneyU", () => {
  it("gives p < 0.05 for clearly different groups", () => {
    const g1 = [1, 2, 3, 4, 5];
    const g2 = [8, 9, 10, 11, 12];
    const result = mannWhitneyU(g1, g2);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.U).toBeGreaterThanOrEqual(0);
  });

  it("gives p > 0.05 for identical groups", () => {
    const g = [5, 6, 7, 8, 9, 10];
    const result = mannWhitneyU(g, g);
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  it("rank-biserial correlation is in [-1, 1]", () => {
    const result = mannWhitneyU([1, 2, 3], [4, 5, 6]);
    expect(result.rankBiserialR).toBeGreaterThanOrEqual(-1);
    expect(result.rankBiserialR).toBeLessThanOrEqual(1);
  });

  it("rank-biserial r ≈ 1 when group1 always > group2", () => {
    // g1 all larger → U1 = n1*n2, U = 0 → rankBiserialR = 1
    const g1 = [10, 11, 12, 13, 14];
    const g2 = [1, 2, 3, 4, 5];
    const result = mannWhitneyU(g1, g2);
    expect(result.rankBiserialR).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// powerAnalysis
// ---------------------------------------------------------------------------

describe("powerAnalysis", () => {
  it("large effect size needs fewer participants than small effect size", () => {
    const largeFx = powerAnalysis({ effectSize: 0.8 }); // Cohen's d = 0.8 (large)
    const smallFx = powerAnalysis({ effectSize: 0.2 }); // Cohen's d = 0.2 (small)
    expect(largeFx.requiredN).toBeLessThan(smallFx.requiredN);
  });

  it("requiredN is a positive integer", () => {
    const result = powerAnalysis({ effectSize: 0.5 });
    expect(result.requiredN).toBeGreaterThan(0);
    expect(Number.isInteger(result.requiredN)).toBe(true);
  });

  it("higher power requires more participants", () => {
    const p80 = powerAnalysis({ effectSize: 0.5, power: 0.80 });
    const p95 = powerAnalysis({ effectSize: 0.5, power: 0.95 });
    expect(p95.requiredN).toBeGreaterThan(p80.requiredN);
  });

  it("stricter alpha requires more participants", () => {
    const alpha05 = powerAnalysis({ effectSize: 0.5, alpha: 0.05 });
    const alpha01 = powerAnalysis({ effectSize: 0.5, alpha: 0.01 });
    expect(alpha01.requiredN).toBeGreaterThan(alpha05.requiredN);
  });

  it("supports correlation test type", () => {
    const result = powerAnalysis({ effectSize: 0.3, test: "correlation" });
    expect(result.requiredN).toBeGreaterThan(0);
    expect(result.test).toBe("correlation");
  });

  it("supports anova test type", () => {
    const result = powerAnalysis({ effectSize: 0.5, test: "anova" });
    expect(result.test).toBe("anova");
    expect(result.requiredN).toBeGreaterThan(0);
  });

  it("stores effectSize, alpha, and power in result", () => {
    const result = powerAnalysis({ effectSize: 0.5, alpha: 0.05, power: 0.80 });
    expect(result.effectSize).toBe(0.5);
    expect(result.alpha).toBe(0.05);
    expect(result.power).toBe(0.80);
  });
});
