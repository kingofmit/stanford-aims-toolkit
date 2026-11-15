export type Vector = number[];
export interface Embedding { id: string; text: string; vector: Vector; }
export interface Cluster { id: number; centroid: Vector; members: string[]; label?: string; }
export interface DimensionReductionResult { points: { id: string; x: number; y: number; z?: number }[]; method: "pca" | "tsne"; explained_variance?: number[]; }
export interface SimilarityResult { id1: string; id2: string; score: number; }
export interface RespondentProfile { id: string; clusterId: number; dominantThemes: string[]; similarity: number; }
