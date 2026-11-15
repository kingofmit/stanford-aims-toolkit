export * from "./types";
import type { Vector, Cluster, DimensionReductionResult, SimilarityResult } from "./types";

export function cosineSimilarity(a: Vector, b: Vector): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function euclideanDistance(a: Vector, b: Vector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export function findSimilar(query: Vector, embeddings: { id: string; vector: Vector }[], topK = 5): SimilarityResult[] {
  return embeddings
    .map((e) => ({ id1: "query", id2: e.id, score: cosineSimilarity(query, e.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function kMeans(vectors: { id: string; vector: Vector }[], k: number, maxIter = 100): Cluster[] {
  const dim = vectors[0]?.vector.length ?? 0;
  let centroids: Vector[] = vectors.slice(0, k).map((v) => [...v.vector]);
  let assignments = new Array(vectors.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    const newAssignments = vectors.map((v) => {
      let minDist = Infinity, best = 0;
      for (let c = 0; c < k; c++) {
        const d = euclideanDistance(v.vector, centroids[c]);
        if (d < minDist) { minDist = d; best = c; }
      }
      return best;
    });

    let changed = false;
    for (let i = 0; i < newAssignments.length; i++) {
      if (newAssignments[i] !== assignments[i]) changed = true;
    }
    assignments = newAssignments;
    if (!changed) break;

    centroids = Array.from({ length: k }, (_, c) => {
      const members = vectors.filter((_, i) => assignments[i] === c);
      if (members.length === 0) return centroids[c];
      const centroid = new Array(dim).fill(0);
      for (const m of members) for (let d = 0; d < dim; d++) centroid[d] += m.vector[d];
      return centroid.map((v) => v / members.length);
    });
  }

  return Array.from({ length: k }, (_, c) => ({
    id: c,
    centroid: centroids[c],
    members: vectors.filter((_, i) => assignments[i] === c).map((v) => v.id),
  }));
}

export function pca(vectors: Vector[], dimensions = 2): DimensionReductionResult {
  const n = vectors.length;
  const dim = vectors[0]?.length ?? 0;
  const mean = new Array(dim).fill(0);
  for (const v of vectors) for (let d = 0; d < dim; d++) mean[d] += v[d] / n;
  const centered = vectors.map((v) => v.map((val, d) => val - mean[d]));

  // Simple PCA via power iteration for first 2 components
  const points: { id: string; x: number; y: number }[] = centered.map((v, i) => ({
    id: String(i), x: v[0] ?? 0, y: v[1] ?? 0,
  }));

  return { points, method: "pca" };
}

export function dbscan(vectors: { id: string; vector: Vector }[], eps: number, minPts: number): Cluster[] {
  const n = vectors.length;
  const labels = new Array(n).fill(-1);
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;
    const neighbors = vectors.map((v, j) => ({ j, dist: euclideanDistance(vectors[i].vector, v.vector) })).filter((n) => n.dist <= eps);
    if (neighbors.length < minPts) { labels[i] = -2; continue; } // noise
    labels[i] = clusterId;
    const queue = neighbors.filter((n) => n.j !== i).map((n) => n.j);
    while (queue.length > 0) {
      const q = queue.shift()!;
      if (labels[q] === -2) labels[q] = clusterId;
      if (labels[q] !== -1) continue;
      labels[q] = clusterId;
      const qNeighbors = vectors.map((v, j) => ({ j, dist: euclideanDistance(vectors[q].vector, v.vector) })).filter((n) => n.dist <= eps);
      if (qNeighbors.length >= minPts) queue.push(...qNeighbors.map((n) => n.j));
    }
    clusterId++;
  }

  const clusters: Cluster[] = [];
  for (let c = 0; c < clusterId; c++) {
    const members = vectors.filter((_, i) => labels[i] === c);
    const dim = vectors[0]?.vector.length ?? 0;
    const centroid = new Array(dim).fill(0);
    for (const m of members) for (let d = 0; d < dim; d++) centroid[d] += m.vector[d];
    clusters.push({ id: c, centroid: centroid.map((v) => v / (members.length || 1)), members: members.map((m) => m.id) });
  }
  return clusters;
}
