import { describe, it, expect } from "vitest";
import { cosineSimilarity, euclideanDistance, findSimilar, kMeans } from "../index";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
  });
});

describe("euclideanDistance", () => {
  it("returns 0 for identical vectors", () => {
    expect(euclideanDistance([1, 2], [1, 2])).toBe(0);
  });

  it("computes correct distance", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5.0);
  });
});

describe("kMeans", () => {
  it("clusters into k groups", () => {
    const vectors = [
      { id: "a", vector: [0, 0] },
      { id: "b", vector: [0, 1] },
      { id: "c", vector: [10, 10] },
      { id: "d", vector: [10, 11] },
    ];
    const clusters = kMeans(vectors, 2);
    expect(clusters.length).toBe(2);
    // a and b should be in same cluster, c and d in another
    const cluster0members = clusters[0].members;
    if (cluster0members.includes("a")) {
      expect(cluster0members).toContain("b");
      expect(clusters[1].members).toContain("c");
      expect(clusters[1].members).toContain("d");
    } else {
      expect(cluster0members).toContain("c");
      expect(cluster0members).toContain("d");
    }
  });
});
