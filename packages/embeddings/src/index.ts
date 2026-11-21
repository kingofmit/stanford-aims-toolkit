export * from "./types";
import type {
  Vector,
  Cluster,
  PCAResult,
  SimilarityResult,
  ElbowData,
} from "./types";

// ---------------------------------------------------------------------------
// Primitive distance / similarity helpers
// ---------------------------------------------------------------------------

export function cosineSimilarity(a: Vector, b: Vector): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function euclideanDistance(a: Vector, b: Vector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

// ---------------------------------------------------------------------------
// Similarity search
// ---------------------------------------------------------------------------

export function findSimilar(
  query: Vector,
  embeddings: { id: string; vector: Vector }[],
  topK = 5,
): SimilarityResult[] {
  return embeddings
    .map((e) => ({ id1: "query", id2: e.id, score: cosineSimilarity(query, e.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ---------------------------------------------------------------------------
// k-Means clustering
// ---------------------------------------------------------------------------

export function kMeans(
  vectors: { id: string; vector: Vector }[],
  k: number,
  maxIter = 100,
): Cluster[] {
  if (vectors.length === 0 || k <= 0) return [];

  const dim = vectors[0].vector.length;
  let centroids: Vector[] = vectors.slice(0, k).map((v) => [...v.vector]);
  let assignments = new Array<number>(vectors.length).fill(0);

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
      if (members.length === 0) return [...centroids[c]];
      const centroid = new Array<number>(dim).fill(0);
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

// ---------------------------------------------------------------------------
// Silhouette score
// ---------------------------------------------------------------------------

/**
 * Compute mean silhouette score for a clustering result.
 *
 * @param vectors  Original vectors (same order and ids as used in clustering).
 * @param clusters Result of kMeans / dbscan (noise cluster with id < 0 is ignored).
 * @returns Mean silhouette score in [-1, 1]. Returns 0 when there is only one
 *          non-noise cluster or no data.
 */
export function silhouetteScore(
  vectors: { id: string; vector: Vector }[],
  clusters: Cluster[],
): number {
  // Build a map from id -> cluster index (skip noise clusters, id < 0)
  const idToCluster = new Map<string, number>();
  for (const cluster of clusters) {
    if (cluster.id < 0) continue; // skip noise
    for (const memberId of cluster.members) {
      idToCluster.set(memberId, cluster.id);
    }
  }

  // Filter to only assigned (non-noise) vectors
  const assigned = vectors.filter((v) => idToCluster.has(v.id));
  if (assigned.length === 0) return 0;

  // Count distinct cluster ids present in the assigned set
  const clusterIds = [...new Set(assigned.map((v) => idToCluster.get(v.id) as number))];
  if (clusterIds.length < 2) return 0; // silhouette undefined for a single cluster

  // For quick lookup: cluster id -> array of vectors
  const clusterVectors = new Map<number, { id: string; vector: Vector }[]>();
  for (const cid of clusterIds) {
    clusterVectors.set(cid, assigned.filter((v) => idToCluster.get(v.id) === cid));
  }

  let total = 0;
  for (const point of assigned) {
    const myClusterId = idToCluster.get(point.id) as number;
    const myCluster = clusterVectors.get(myClusterId) ?? [];

    // a(i): mean distance to points in same cluster (excluding self)
    const sameClusterOthers = myCluster.filter((v) => v.id !== point.id);
    let aI = 0;
    if (sameClusterOthers.length > 0) {
      const sumDist = sameClusterOthers.reduce(
        (acc, v) => acc + euclideanDistance(point.vector, v.vector),
        0,
      );
      aI = sumDist / sameClusterOthers.length;
    }

    // b(i): min mean distance to any other cluster
    let bI = Infinity;
    for (const cid of clusterIds) {
      if (cid === myClusterId) continue;
      const otherCluster = clusterVectors.get(cid) ?? [];
      if (otherCluster.length === 0) continue;
      const meanDist =
        otherCluster.reduce((acc, v) => acc + euclideanDistance(point.vector, v.vector), 0) /
        otherCluster.length;
      if (meanDist < bI) bI = meanDist;
    }
    if (!isFinite(bI)) bI = 0;

    const maxAB = Math.max(aI, bI);
    const s = maxAB === 0 ? 0 : (bI - aI) / maxAB;
    total += s;
  }

  return total / assigned.length;
}

// ---------------------------------------------------------------------------
// Elbow data for choosing K in k-means
// ---------------------------------------------------------------------------

/**
 * Run k-means for k = 2..maxK and return inertia for each k.
 * Inertia = sum of squared distances from each point to its assigned centroid.
 */
export function elbowData(
  vectors: { id: string; vector: Vector }[],
  maxK = 10,
  maxIter = 100,
): ElbowData {
  if (vectors.length === 0) return { points: [] };

  const points: ElbowData["points"] = [];
  const upper = Math.min(maxK, vectors.length);

  for (let k = 2; k <= upper; k++) {
    const clusters = kMeans(vectors, k, maxIter);

    // Build centroid lookup by cluster id
    const centroidMap = new Map<number, Vector>();
    for (const cluster of clusters) centroidMap.set(cluster.id, cluster.centroid);

    // Assign each vector to nearest centroid and sum squared distances
    let inertia = 0;
    for (const v of vectors) {
      let minSq = Infinity;
      for (const cluster of clusters) {
        const centroid = centroidMap.get(cluster.id);
        if (!centroid) continue;
        let sq = 0;
        for (let d = 0; d < v.vector.length; d++) sq += (v.vector[d] - centroid[d]) ** 2;
        if (sq < minSq) minSq = sq;
      }
      inertia += isFinite(minSq) ? minSq : 0;
    }

    points.push({ k, inertia });
  }

  return { points };
}

// ---------------------------------------------------------------------------
// PCA via power iteration
// ---------------------------------------------------------------------------

/** Dot product of two equal-length vectors. */
function dot(a: Vector, b: Vector): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** L2 norm of a vector. */
function norm(v: Vector): number {
  return Math.sqrt(dot(v, v));
}

/** Normalize a vector in-place, returns the vector. */
function normalize(v: Vector): Vector {
  const n = norm(v);
  if (n === 0) return v;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

/**
 * Multiply covariance matrix C (dim×dim, stored as flat row-major Float64Array)
 * by vector v (length dim) and return result.
 */
function matVec(C: Float64Array, dim: number, v: Vector): Vector {
  const result = new Array<number>(dim).fill(0);
  for (let r = 0; r < dim; r++) {
    let s = 0;
    for (let c = 0; c < dim; c++) s += C[r * dim + c] * v[c];
    result[r] = s;
  }
  return result;
}

/**
 * Deflate the covariance matrix by removing the contribution of eigenvector `q`.
 * C' = C - λ * q * qᵀ
 */
function deflate(C: Float64Array, dim: number, q: Vector, eigenvalue: number): void {
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      C[r * dim + c] -= eigenvalue * q[r] * q[c];
    }
  }
}

/**
 * Find top `components` eigenvectors of a symmetric matrix using power iteration.
 * Returns { eigenvectors, eigenvalues }.
 */
function powerIteration(
  C: Float64Array,
  dim: number,
  components: number,
  maxIter = 200,
  tol = 1e-9,
): { eigenvectors: Vector[]; eigenvalues: number[] } {
  // Work on a copy so caller's matrix is untouched
  const work = new Float64Array(C);
  const eigenvectors: Vector[] = [];
  const eigenvalues: number[] = [];

  for (let comp = 0; comp < components; comp++) {
    // Initialize with a deterministic non-zero vector
    let q: Vector = new Array<number>(dim).fill(0);
    q[comp % dim] = 1;

    let eigenvalue = 0;
    for (let iter = 0; iter < maxIter; iter++) {
      const z = matVec(work, dim, q);
      eigenvalue = dot(z, q); // Rayleigh quotient estimate
      const zNorm = norm(z);
      if (zNorm === 0) break;
      const qNew = normalize(z);
      // Check convergence
      let diff = 0;
      for (let i = 0; i < dim; i++) diff += (qNew[i] - q[i]) ** 2;
      q = qNew;
      if (Math.sqrt(diff) < tol) break;
    }
    // Final eigenvalue via Rayleigh quotient
    const Aq = matVec(work, dim, q);
    eigenvalue = dot(q, Aq);

    eigenvectors.push(q);
    eigenvalues.push(eigenvalue);
    deflate(work, dim, q, eigenvalue);
  }

  return { eigenvectors, eigenvalues };
}

/**
 * PCA via power iteration.
 *
 * @param vectors    Array of raw vectors (must all be same length).
 * @param dimensions Number of principal components (default 2).
 * @param maxIter    Max power-iteration steps per component.
 * @returns PCAResult with 2D projection points and explained variance ratios.
 */
export function pca(vectors: Vector[], dimensions = 2, maxIter = 200): PCAResult {
  const n = vectors.length;

  // Edge case: no data
  if (n === 0) {
    return { points: [], method: "pca", explainedVariance: [], explained_variance: [] };
  }

  const dim = vectors[0].length;

  // Edge case: single point or zero-dimensional
  if (n === 1 || dim === 0) {
    const ev = new Array<number>(dimensions).fill(0);
    return {
      points: vectors.map((_, i) => ({ id: String(i), x: 0, y: 0 })),
      method: "pca",
      explainedVariance: ev,
      explained_variance: ev,
    };
  }

  const components = Math.min(dimensions, dim, n);

  // 1. Center the data
  const mean = new Array<number>(dim).fill(0);
  for (const v of vectors) for (let d = 0; d < dim; d++) mean[d] += v[d];
  for (let d = 0; d < dim; d++) mean[d] /= n;

  const centered: Vector[] = vectors.map((v) => v.map((val, d) => val - mean[d]));

  // 2. Build covariance matrix (dim × dim) — (1/n) * Xᵀ X
  const C = new Float64Array(dim * dim);
  for (const v of centered) {
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        C[r * dim + c] += v[r] * v[c];
      }
    }
  }
  for (let i = 0; i < C.length; i++) C[i] /= n;

  // 3. Power iteration for top `components` eigenvectors
  const { eigenvectors, eigenvalues } = powerIteration(C, dim, components, maxIter);

  // 4. Total variance (trace of covariance matrix)
  let totalVariance = 0;
  for (let d = 0; d < dim; d++) totalVariance += C[d * dim + d];
  // After deflation C is modified; recompute trace from eigenvalues instead
  totalVariance = 0;
  // Recompute: sum all eigenvalues from a fresh power iteration isn't reliable for
  // total trace. Use the original diagonal approach before deflation.
  // We stored C before deflation was applied (we used `work` copy in powerIteration).
  // So use original sum of eigenvalues as total — but eigenvalues beyond `components`
  // are unknown. Use original trace instead.
  const C_orig = new Float64Array(dim * dim);
  for (const v of centered) {
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        C_orig[r * dim + c] += v[r] * v[c];
      }
    }
  }
  for (let d = 0; d < dim; d++) totalVariance += C_orig[d * dim + d] / n;

  // 5. Explained variance ratios
  const explainedVariance: number[] = eigenvalues.map((ev) =>
    totalVariance > 0 ? Math.max(0, ev) / totalVariance : 0,
  );

  // 6. Project centered data onto eigenvectors
  const points = centered.map((v, i) => {
    const coords = eigenvectors.map((q) => dot(v, q));
    return {
      id: String(i),
      x: coords[0] ?? 0,
      y: coords[1] ?? 0,
    };
  });

  return {
    points,
    method: "pca",
    explainedVariance,
    explained_variance: explainedVariance,
  };
}

// ---------------------------------------------------------------------------
// DBSCAN
// ---------------------------------------------------------------------------

export function dbscan(
  vectors: { id: string; vector: Vector }[],
  eps: number,
  minPts: number,
): Cluster[] {
  const n = vectors.length;

  // Edge cases
  if (n === 0) return [];
  if (n === 1) {
    // A single point is either a cluster (if minPts <= 1) or noise
    if (minPts <= 1) {
      return [{ id: 0, centroid: [...vectors[0].vector], members: [vectors[0].id] }];
    }
    return [];
  }

  const UNVISITED = -1;
  const NOISE = -2;
  const labels = new Array<number>(n).fill(UNVISITED);
  let clusterId = 0;

  const getNeighbors = (idx: number): number[] =>
    vectors.reduce<number[]>((acc, v, j) => {
      if (euclideanDistance(vectors[idx].vector, v.vector) <= eps) acc.push(j);
      return acc;
    }, []);

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) continue;

    const neighbors = getNeighbors(i);
    if (neighbors.length < minPts) {
      labels[i] = NOISE;
      continue;
    }

    labels[i] = clusterId;
    // Use a Set as the queue to avoid re-enqueueing
    const queue = new Set<number>(neighbors.filter((j) => j !== i));

    for (const q of queue) {
      if (labels[q] === NOISE) labels[q] = clusterId;
      if (labels[q] !== UNVISITED) continue;
      labels[q] = clusterId;
      const qNeighbors = getNeighbors(q);
      if (qNeighbors.length >= minPts) {
        for (const nb of qNeighbors) queue.add(nb);
      }
    }

    clusterId++;
  }

  const dim = vectors[0].vector.length;
  const clusters: Cluster[] = [];
  for (let c = 0; c < clusterId; c++) {
    const members = vectors.filter((_, i) => labels[i] === c);
    if (members.length === 0) continue;
    const centroid = new Array<number>(dim).fill(0);
    for (const m of members) for (let d = 0; d < dim; d++) centroid[d] += m.vector[d];
    clusters.push({
      id: c,
      centroid: centroid.map((v) => v / members.length),
      members: members.map((m) => m.id),
    });
  }

  return clusters;
}
