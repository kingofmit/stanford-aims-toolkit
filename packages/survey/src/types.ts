export interface DescriptiveStats { n: number; mean: number; median: number; mode: number[]; sd: number; variance: number; min: number; max: number; range: number; skewness: number; kurtosis: number; q1: number; q3: number; iqr: number; }
export interface CrossTab { rows: string[]; cols: string[]; observed: number[][]; expected: number[][]; chiSquare: number; degreesOfFreedom: number; pValue: number; cramersV: number; }
export interface ReliabilityResult { cronbachAlpha: number; itemCount: number; itemTotalCorrelations: number[]; alphaIfDeleted: number[]; }
export interface CorrelationMatrix { variables: string[]; matrix: number[][]; pValues: number[][]; }
export interface FactorAnalysisResult { factors: { id: number; eigenvalue: number; varianceExplained: number; loadings: number[] }[]; totalVarianceExplained: number; variables: string[]; }

export interface TTestResult {
  t: number;
  df: number;
  pValue: number;
  meanDiff: number;
  ci: [number, number];
  cohensD?: number;
}

export interface ANOVAResult {
  f: number;
  dfBetween: number;
  dfWithin: number;
  pValue: number;
  etaSquared: number;
  groupMeans: number[];
}

export interface ConfidenceIntervalResult {
  mean: number;
  lower: number;
  upper: number;
  level: number;
}

export interface RegressionResult {
  coefficients: { name: string; estimate: number; se: number; t: number; pValue: number }[];
  rSquared: number;
  adjustedRSquared: number;
  fStatistic: number;
  fPValue: number;
  residualSE: number;
  dfModel: number;
  dfResidual: number;
}

export interface MannWhitneyResult {
  U: number;
  z: number;
  pValue: number;
  rankBiserialR: number;
}

export interface PowerAnalysisResult {
  requiredN: number;
  effectSize: number;
  alpha: number;
  power: number;
  test: string;
}
