export interface DescriptiveStats { n: number; mean: number; median: number; mode: number[]; sd: number; variance: number; min: number; max: number; range: number; skewness: number; kurtosis: number; q1: number; q3: number; iqr: number; }
export interface CrossTab { rows: string[]; cols: string[]; observed: number[][]; expected: number[][]; chiSquare: number; degreesOfFreedom: number; pValue: number; cramersV: number; }
export interface ReliabilityResult { cronbachAlpha: number; itemCount: number; itemTotalCorrelations: number[]; alphaIfDeleted: number[]; }
export interface CorrelationMatrix { variables: string[]; matrix: number[][]; pValues: number[][]; }
export interface FactorAnalysisResult { factors: { id: number; eigenvalue: number; varianceExplained: number; loadings: number[] }[]; totalVarianceExplained: number; variables: string[]; }
