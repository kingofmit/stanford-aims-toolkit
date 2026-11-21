import { describe, it, expect } from "vitest";
import { preprocessForTopics, NMFModeler, LDAModeler } from "../index";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/**
 * Six raw documents. Each pair shares a domain keyword that appears in exactly
 * two documents so minDocFrequency=2 retains it, while rarer words are filtered
 * out. Words appearing in all six documents are dropped by maxDocFrequencyRatio.
 */
const CLUSTER_DOCS_RAW = [
  "medicine health doctor hospital medicine health",
  "medicine health wellness exercise diet fitness",
  "economy market stock trade economy market",
  "economy market inflation growth gdp rate",
  "sports game team win sports game",
  "sports game player coach match tournament",
];

/** Pre-tokenised version of the same clusters (no preprocessing needed). */
const CLUSTER_DOCS_TOKENS = [
  ["health", "doctor", "hospital", "medicine", "patient"],
  ["health", "exercise", "diet", "wellness", "fitness"],
  ["economy", "market", "stock", "trade", "business"],
  ["economy", "growth", "gdp", "inflation", "rate"],
  ["sports", "game", "team", "win", "score"],
  ["sports", "player", "coach", "match", "tournament"],
];

/**
 * Build a dtMatrix and vocabulary directly from pre-tokenised documents,
 * bypassing the full preprocessing pipeline. This gives NMF clean input
 * regardless of stopword / stemming settings.
 */
function buildDtMatrix(docs: string[][]): { dtMatrix: number[][]; vocabulary: string[] } {
  const vocabSet = new Set(docs.flat());
  const vocabulary = Array.from(vocabSet).sort();
  const wordIndex = new Map(vocabulary.map((w, i) => [w, i]));
  const dtMatrix = docs.map((tokens) => {
    const row = new Array(vocabulary.length).fill(0);
    for (const t of tokens) {
      const idx = wordIndex.get(t);
      if (idx !== undefined) row[idx]++;
    }
    return row;
  });
  return { dtMatrix, vocabulary };
}

// ---------------------------------------------------------------------------
// preprocessForTopics
// ---------------------------------------------------------------------------

describe("preprocessForTopics", () => {
  it("returns a vocabulary, tokenised documents, and a dtMatrix", () => {
    const result = preprocessForTopics(CLUSTER_DOCS_RAW);
    expect(result.vocabulary.length).toBeGreaterThan(0);
    expect(result.documents.length).toBe(CLUSTER_DOCS_RAW.length);
    expect(result.dtMatrix.length).toBe(CLUSTER_DOCS_RAW.length);
    // Every row of dtMatrix must have the same width as the vocabulary
    for (const row of result.dtMatrix) {
      expect(row.length).toBe(result.vocabulary.length);
    }
  });

  it("removes stopwords", () => {
    const result = preprocessForTopics(["the cat sat on the mat"]);
    // 'the', 'on' are stopwords; they should not appear in vocabulary
    expect(result.vocabulary).not.toContain("the");
    expect(result.vocabulary).not.toContain("on");
  });

  it("enforces minimum word length", () => {
    const result = preprocessForTopics(["a an ox big cat elephant"], {
      removeStopwords: false,
      stem: false,
      minWordLength: 4,
      minDocFrequency: 1,
    });
    for (const word of result.vocabulary) {
      expect(word.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("stems words when stem:true", () => {
    // "running" -> stem removes "-ing" -> "runn"
    const result = preprocessForTopics(["running jumped exercised"], {
      stem: true,
      removeStopwords: false,
      lowercase: true,
      minWordLength: 3,
      minDocFrequency: 1,
    });
    // The raw word 'running' should not appear as-is
    expect(result.vocabulary).not.toContain("running");
  });

  it("filters words that appear in fewer docs than minDocFrequency", () => {
    // 'mango' appears in all three docs; 'banana' appears only once.
    // stem:false so the words are preserved exactly as written.
    const docs = [
      "mango banana cherry",
      "mango durian elderberr",   // 'elderberr' is unique
      "mango figfruit grapefruit",
    ];
    const result = preprocessForTopics(docs, {
      removeStopwords: false,
      stem: false,
      lowercase: true,
      minWordLength: 3,
      minDocFrequency: 2,
      maxDocFrequencyRatio: 1.0,  // allow words that appear in all docs
    });
    // 'mango' appears in all three -> kept
    expect(result.vocabulary).toContain("mango");
    // 'banana' appears only once -> filtered by minDocFrequency=2
    expect(result.vocabulary).not.toContain("banana");
  });

  it("auto-sets minDocFrequency to 1 for single-document corpora", () => {
    // maxDocFrequencyRatio must be 1.0 so that words appearing in 100% of a
    // single-document corpus (ratio = 1.0) are not filtered out by the upper bound.
    const result = preprocessForTopics(["machine learning neural network"], {
      maxDocFrequencyRatio: 1.0,
    });
    expect(result.vocabulary.length).toBeGreaterThan(0);
  });

  it("auto-sets minDocFrequency to 1 for two-document corpora", () => {
    const result = preprocessForTopics([
      "machine learning research",
      "deep neural network",
    ]);
    expect(result.vocabulary.length).toBeGreaterThan(0);
  });

  it("handles all-stopword documents without crashing", () => {
    const result = preprocessForTopics(["the and or but if"]);
    expect(result.vocabulary.length).toBe(0);
    expect(result.documents[0]).toHaveLength(0);
  });

  it("handles completely empty document list", () => {
    const result = preprocessForTopics([]);
    expect(result.vocabulary).toHaveLength(0);
    expect(result.documents).toHaveLength(0);
    expect(result.dtMatrix).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// NMFModeler
// ---------------------------------------------------------------------------

describe("NMFModeler", () => {
  // Use pre-tokenised tokens → dtMatrix so NMF gets well-formed non-zero input
  // regardless of how the preprocessing pipeline's frequency filters behave.
  const { dtMatrix: NMF_DT, vocabulary: NMF_VOCAB } = buildDtMatrix(CLUSTER_DOCS_TOKENS);

  it("produces the requested number of topics", () => {
    const model = new NMFModeler({ numTopics: 3, seed: 42 }).fit(NMF_DT, NMF_VOCAB);
    expect(model.topics.length).toBe(3);
    expect(model.numTopics).toBe(3);
  });

  it("every topic has non-empty word list", () => {
    const model = new NMFModeler({ numTopics: 3, seed: 42 }).fit(NMF_DT, NMF_VOCAB);
    for (const topic of model.topics) {
      expect(topic.words.length).toBeGreaterThan(0);
    }
  });

  it("coherence is non-zero for meaningful documents", () => {
    const model = new NMFModeler({ numTopics: 3, seed: 42 }).fit(NMF_DT, NMF_VOCAB);
    // At least some topics should have non-zero coherence when documents share vocabulary
    const anyNonZero = model.topics.some((t) => t.coherence !== 0);
    expect(anyNonZero).toBe(true);
  });

  it("is deterministic with the same seed", () => {
    const m1 = new NMFModeler({ numTopics: 3, seed: 7 }).fit(NMF_DT, NMF_VOCAB);
    const m2 = new NMFModeler({ numTopics: 3, seed: 7 }).fit(NMF_DT, NMF_VOCAB);
    expect(m1.topics[0].words[0].word).toBe(m2.topics[0].words[0].word);
    expect(m1.topics[0].words[0].weight).toBeCloseTo(m2.topics[0].words[0].weight, 10);
  });

  it("documentTopics has one row per document and each row sums to 1", () => {
    const model = new NMFModeler({ numTopics: 3, seed: 42 }).fit(NMF_DT, NMF_VOCAB);
    expect(model.documentTopics.length).toBe(CLUSTER_DOCS_TOKENS.length);
    for (const row of model.documentTopics) {
      expect(row.length).toBe(3);
      const rowSum = row.reduce((a, b) => a + b, 0);
      expect(rowSum).toBeCloseTo(1.0, 5);
    }
  });

  it("getDocumentTopics weights sum to ~1.0 per document after fit", () => {
    const modeler = new NMFModeler({ numTopics: 3, seed: 42 });
    modeler.fit(NMF_DT, NMF_VOCAB);
    const dists = modeler.getDocumentTopics(NMF_DT);
    expect(dists.length).toBe(CLUSTER_DOCS_TOKENS.length);
    for (const dist of dists) {
      const sum = dist.topics.reduce((a, b) => a + b.weight, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it("getDocumentTopics dominantTopic matches the highest weight topic", () => {
    const modeler = new NMFModeler({ numTopics: 3, seed: 42 });
    modeler.fit(NMF_DT, NMF_VOCAB);
    const dists = modeler.getDocumentTopics(NMF_DT);
    for (const dist of dists) {
      const maxWeight = Math.max(...dist.topics.map((t) => t.weight));
      const expectedDominant = dist.topics.find((t) => t.weight === maxWeight)!.topicId;
      expect(dist.dominantTopic).toBe(expectedDominant);
    }
  });

  it("returns empty topics for empty dtMatrix", () => {
    const model = new NMFModeler({ numTopics: 3, seed: 42 }).fit([], []);
    expect(model.topics.length).toBe(0);
    expect(model.documentTopics.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// LDAModeler
// ---------------------------------------------------------------------------

describe("LDAModeler", () => {
  it("produces the requested number of topics", () => {
    const modeler = new LDAModeler({ numTopics: 3, iterations: 100, seed: 42 });
    const model = modeler.fit(CLUSTER_DOCS_TOKENS);
    expect(model.topics.length).toBe(3);
    expect(model.numTopics).toBe(3);
  });

  it("every topic has a non-empty word list", () => {
    const modeler = new LDAModeler({ numTopics: 3, iterations: 100, seed: 42 });
    const model = modeler.fit(CLUSTER_DOCS_TOKENS);
    for (const topic of model.topics) {
      expect(topic.words.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic with the same seed", () => {
    const m1 = new LDAModeler({ numTopics: 3, iterations: 50, seed: 123 }).fit(CLUSTER_DOCS_TOKENS);
    const m2 = new LDAModeler({ numTopics: 3, iterations: 50, seed: 123 }).fit(CLUSTER_DOCS_TOKENS);
    expect(m1.topics[0].words[0].word).toBe(m2.topics[0].words[0].word);
  });

  it("documentTopics has one row per document and each row sums to 1", () => {
    const modeler = new LDAModeler({ numTopics: 3, iterations: 100, seed: 42 });
    const model = modeler.fit(CLUSTER_DOCS_TOKENS);
    expect(model.documentTopics.length).toBe(CLUSTER_DOCS_TOKENS.length);
    for (const row of model.documentTopics) {
      expect(row.length).toBe(3);
      const rowSum = row.reduce((a, b) => a + b, 0);
      expect(rowSum).toBeCloseTo(1.0, 5);
    }
  });

  it("getDocumentDistributions weights sum to ~1.0 per document after fit", () => {
    const modeler = new LDAModeler({ numTopics: 3, iterations: 200, seed: 42 });
    modeler.fit(CLUSTER_DOCS_TOKENS);
    const dists = modeler.getDocumentDistributions(CLUSTER_DOCS_TOKENS);
    expect(dists.length).toBe(CLUSTER_DOCS_TOKENS.length);
    for (const dist of dists) {
      const sum = dist.topics.reduce((a, b) => a + b.weight, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it("getDocumentDistributions dominant topic matches the highest weight topic", () => {
    const modeler = new LDAModeler({ numTopics: 3, iterations: 200, seed: 42 });
    modeler.fit(CLUSTER_DOCS_TOKENS);
    const dists = modeler.getDocumentDistributions(CLUSTER_DOCS_TOKENS);
    for (const dist of dists) {
      const maxWeight = Math.max(...dist.topics.map((t) => t.weight));
      const expectedDominant = dist.topics.find((t) => t.weight === maxWeight)!.topicId;
      expect(dist.dominantTopic).toBe(expectedDominant);
    }
  });

  it("handles a single-document corpus without crashing", () => {
    const modeler = new LDAModeler({ numTopics: 2, iterations: 50, seed: 1 });
    const model = modeler.fit([["machine", "learning", "neural", "network"]]);
    expect(model.topics.length).toBe(2);
    expect(model.documentTopics.length).toBe(1);
    expect(model.documentTopics[0].reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 5);
  });
});
