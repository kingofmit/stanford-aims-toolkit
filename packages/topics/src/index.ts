export * from "./types";

import type { LDAConfig, NMFConfig, PreprocessConfig, ProcessedCorpus, Topic, TopicModel, TopicDistribution, CoherenceScore, TopicWord } from "./types";

// ---------------------------------------------------------------------------
// Stopwords for preprocessing
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
  'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
  'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'don', 'should', 'now', 'also', 'like', 'would',
  'could', 'get', 'got', 'one', 'two', 'really', 'know', 'think', 'going',
  'went', 'come', 'came', 'make', 'made', 'way', 'thing', 'things', 'said',
  'say', 'much', 'many', 'well', 'back', 'even', 'still', 'right', 'want',
]);

// ---------------------------------------------------------------------------
// Simple Porter Stemmer (for preprocessing)
// ---------------------------------------------------------------------------

function simpleStem(word: string): string {
  let w = word;
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (!w.endsWith('ss') && w.endsWith('s')) w = w.slice(0, -1);
  if (w.endsWith('eed')) { /* skip */ }
  else if (w.endsWith('ed') && /[aeiou]/.test(w.slice(0, -2))) w = w.slice(0, -2);
  else if (w.endsWith('ing') && /[aeiou]/.test(w.slice(0, -3))) w = w.slice(0, -3);
  if (w.endsWith('y') && w.length > 2 && /[aeiou]/.test(w.slice(0, -1))) w = w.slice(0, -1) + 'i';
  return w;
}

// ---------------------------------------------------------------------------
// Preprocessing Pipeline
// ---------------------------------------------------------------------------

export function preprocessForTopics(
  documents: string[],
  options?: PreprocessConfig,
): ProcessedCorpus {
  // For very small corpora (<=2 docs), minDocFrequency=2 would eliminate everything;
  // automatically lower it to 1 unless the caller has explicitly provided a value.
  const defaultMinDocFrequency = documents.length <= 2 ? 1 : 2;

  const opts: Required<PreprocessConfig> = {
    removeStopwords: true,
    stem: true,
    lowercase: true,
    minWordLength: 3,
    minDocFrequency: defaultMinDocFrequency,
    maxDocFrequencyRatio: 0.85,
    ...options,
  };

  // Tokenize
  let tokenized: string[][] = documents.map((doc) => {
    let tokens: string[] = Array.from(doc.match(/\b[a-zA-Z]+\b/g) ?? []);
    if (opts.lowercase) tokens = tokens.map((t) => t.toLowerCase());
    if (opts.removeStopwords) tokens = tokens.filter((t) => !STOPWORDS.has(t));
    if (opts.minWordLength > 0) tokens = tokens.filter((t) => t.length >= opts.minWordLength);
    if (opts.stem) tokens = tokens.map(simpleStem);
    return tokens;
  });

  // Build document frequency map
  const docFreq = new Map<string, number>();
  for (const tokens of tokenized) {
    const unique = new Set(tokens);
    for (const t of unique) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
  }

  // Filter by frequency thresholds
  const n = documents.length;
  const keepWords = new Set<string>();
  for (const [word, freq] of docFreq) {
    if (freq >= opts.minDocFrequency && freq / n <= opts.maxDocFrequencyRatio) {
      keepWords.add(word);
    }
  }

  tokenized = tokenized.map((tokens) => tokens.filter((t) => keepWords.has(t)));
  const vocabulary = Array.from(keepWords).sort();
  const wordIndex = new Map(vocabulary.map((w, i) => [w, i]));

  // Build document-term matrix
  const dtMatrix = tokenized.map((tokens) => {
    const row = new Array(vocabulary.length).fill(0);
    for (const t of tokens) {
      const idx = wordIndex.get(t);
      if (idx !== undefined) row[idx]++;
    }
    return row;
  });

  return { documents: tokenized, vocabulary, dtMatrix };
}

// ---------------------------------------------------------------------------
// NMF (Non-negative Matrix Factorization)
// ---------------------------------------------------------------------------

export class NMFModeler {
  private config: Required<NMFConfig>;
  private _seed: number;
  /** W matrix from the last fit() call: W[i][k] = weight of topic k in document i (unnormalised). */
  private _W: number[][] = [];

  constructor(config: NMFConfig) {
    this.config = {
      maxIterations: 200,
      tolerance: 1e-4,
      seed: 42,
      ...config,
    };
    this._seed = this.config.seed;
  }

  private seededRandom(): number {
    this._seed = (this._seed * 16807) % 2147483647;
    return (this._seed - 1) / 2147483646;
  }

  fit(dtMatrix: number[][], vocabulary: string[]): TopicModel {
    const n = dtMatrix.length; // documents
    const m = vocabulary.length; // terms
    const K = this.config.numTopics;

    if (n === 0 || m === 0) {
      return { topics: [], numTopics: K, coherenceScore: 0, perplexity: 0, iterations: 0, documentTopics: [] };
    }

    // Initialize W (n x K) and H (K x m) with random values
    const W: number[][] = Array.from({ length: n }, () =>
      Array.from({ length: K }, () => this.seededRandom() * 0.1 + 0.01),
    );
    const H: number[][] = Array.from({ length: K }, () =>
      Array.from({ length: m }, () => this.seededRandom() * 0.1 + 0.01),
    );

    // Multiplicative update rules
    let prevCost = Infinity;
    let iterations = 0;

    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      iterations = iter + 1;

      // Update H: H = H .* (W^T V) ./ (W^T W H + eps)
      for (let k = 0; k < K; k++) {
        for (let j = 0; j < m; j++) {
          let wtv = 0;
          let wtwh = 1e-10;
          for (let i = 0; i < n; i++) {
            wtv += W[i][k] * dtMatrix[i][j];
            let wh = 0;
            for (let kk = 0; kk < K; kk++) wh += W[i][kk] * H[kk][j];
            wtwh += W[i][k] * wh;
          }
          H[k][j] *= wtv / wtwh;
        }
      }

      // Update W: W = W .* (V H^T) ./ (W H H^T + eps)
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < K; k++) {
          let vht = 0;
          let whht = 1e-10;
          for (let j = 0; j < m; j++) {
            vht += dtMatrix[i][j] * H[k][j];
            let wh = 0;
            for (let kk = 0; kk < K; kk++) wh += W[i][kk] * H[kk][j];
            whht += wh * H[k][j];
          }
          W[i][k] *= vht / whht;
        }
      }

      // Compute reconstruction cost
      let cost = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
          let approx = 0;
          for (let k = 0; k < K; k++) approx += W[i][k] * H[k][j];
          cost += (dtMatrix[i][j] - approx) ** 2;
        }
      }

      if (Math.abs(prevCost - cost) / (prevCost + 1e-10) < this.config.tolerance) break;
      prevCost = cost;
    }

    // Persist W so getDocumentTopics() can use it without re-fitting
    this._W = W;

    // Extract topics from H matrix
    const topics: Topic[] = Array.from({ length: K }, (_, k) => {
      const wordWeights: TopicWord[] = vocabulary
        .map((word, j) => ({ word, weight: H[k][j] }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 20);

      const docCount = W.filter((row) => {
        const maxWeight = Math.max(...row);
        return maxWeight > 0 && row[k] === maxWeight;
      }).length;

      return {
        id: k,
        label: wordWeights.slice(0, 3).map((w) => w.word).join(', '),
        words: wordWeights,
        coherence: 0,
        documentCount: docCount,
      };
    });

    // Compute coherence
    const tokenizedDocs = dtMatrix.map((row) =>
      vocabulary.filter((_, j) => row[j] > 0),
    );
    const wordToIndex = new Map(vocabulary.map((w, i) => [w, i]));
    let totalCoherence = 0;
    for (const topic of topics) {
      const topWords = topic.words.slice(0, 10).map((w) => w.word);
      let score = 0, pairs = 0;
      for (let i = 1; i < topWords.length; i++) {
        for (let j = 0; j < i; j++) {
          const coCount = tokenizedDocs.filter((d) => d.includes(topWords[i]) && d.includes(topWords[j])).length;
          const jCount = tokenizedDocs.filter((d) => d.includes(topWords[j])).length;
          score += Math.log((coCount + 1) / (jCount || 1));
          pairs++;
        }
      }
      topic.coherence = pairs > 0 ? score / pairs : 0;
      totalCoherence += topic.coherence;
    }

    // Compute normalised per-document topic distributions from W
    const documentTopics: number[][] = W.map((row) => {
      const rowSum = row.reduce((a, b) => a + b, 0) || 1;
      return row.map((v) => v / rowSum);
    });

    return {
      topics,
      numTopics: K,
      coherenceScore: topics.length > 0 ? totalCoherence / topics.length : 0,
      perplexity: prevCost,
      iterations,
      documentTopics,
    };
  }

  getDocumentTopics(dtMatrix: number[][]): TopicDistribution[] {
    // Use the W matrix stored during the last fit() call.
    // If fit() has not been called yet, fall back to uniform distributions.
    const W = this._W.length > 0 ? this._W : null;

    return dtMatrix.map((_, i) => {
      if (W && i < W.length) {
        const row = W[i];
        const rowSum = row.reduce((a, b) => a + b, 0) || 1;
        const topicWeights = row.map((v, k) => ({ topicId: k, weight: v / rowSum }));
        const dominant = topicWeights.reduce((a, b) => (b.weight > a.weight ? b : a));
        return { documentId: String(i), topics: topicWeights, dominantTopic: dominant.topicId };
      }
      // Fallback: uniform distribution (before fit)
      const uniform = Array.from({ length: this.config.numTopics }, (_, k) => ({
        topicId: k,
        weight: 1 / this.config.numTopics,
      }));
      return { documentId: String(i), topics: uniform, dominantTopic: 0 };
    });
  }
}

export class LDAModeler {
  private config: Required<LDAConfig>;
  /** Normalised document-topic distributions from the last fit() call: _docTopicDist[d][k] in [0,1], each row sums to 1. */
  private _docTopicDist: number[][] = [];

  constructor(config: LDAConfig) {
    this.config = {
      alpha: 0.1,
      beta: 0.01,
      iterations: 1000,
      seed: 42,
      ...config,
    };
    this._seed = this.config.seed;
  }

  fit(documents: string[][]): TopicModel {
    const vocab = this.buildVocab(documents);
    const K = this.config.numTopics;
    const V = vocab.size;

    // Initialize topic-word and document-topic counts
    const topicWordCounts: number[][] = Array.from({ length: K }, () => new Array(V).fill(0));
    const docTopicCounts: number[][] = Array.from({ length: documents.length }, () => new Array(K).fill(0));
    const topicCounts = new Array(K).fill(0);

    // Random initialization
    const assignments: number[][] = documents.map((doc) =>
      doc.map(() => Math.floor(this.seededRandom() * K))
    );

    const vocabArray = Array.from(vocab.keys());
    const wordToIndex = new Map(vocabArray.map((w, i) => [w, i]));

    // Count initial assignments
    for (let d = 0; d < documents.length; d++) {
      for (let w = 0; w < documents[d].length; w++) {
        const topic = assignments[d][w];
        const wordIdx = wordToIndex.get(documents[d][w]) ?? 0;
        topicWordCounts[topic][wordIdx]++;
        docTopicCounts[d][topic]++;
        topicCounts[topic]++;
      }
    }

    // Gibbs sampling
    for (let iter = 0; iter < this.config.iterations; iter++) {
      for (let d = 0; d < documents.length; d++) {
        for (let w = 0; w < documents[d].length; w++) {
          const oldTopic = assignments[d][w];
          const wordIdx = wordToIndex.get(documents[d][w]) ?? 0;

          topicWordCounts[oldTopic][wordIdx]--;
          docTopicCounts[d][oldTopic]--;
          topicCounts[oldTopic]--;

          const probs = new Array(K);
          for (let k = 0; k < K; k++) {
            probs[k] =
              ((topicWordCounts[k][wordIdx] + this.config.beta) / (topicCounts[k] + V * this.config.beta)) *
              (docTopicCounts[d][k] + this.config.alpha);
          }

          const newTopic = this.sampleFromDistribution(probs);
          assignments[d][w] = newTopic;
          topicWordCounts[newTopic][wordIdx]++;
          docTopicCounts[d][newTopic]++;
          topicCounts[newTopic]++;
        }
      }
    }

    // Normalise docTopicCounts to proportions and persist for getDocumentDistributions()
    const documentTopics: number[][] = docTopicCounts.map((row) => {
      const rowSum = row.reduce((a, b) => a + b, 0) || 1;
      return row.map((v) => v / rowSum);
    });
    this._docTopicDist = documentTopics;

    // Extract topics
    const topics: Topic[] = Array.from({ length: K }, (_, k) => {
      const wordWeights: TopicWord[] = vocabArray
        .map((word, i) => ({ word, weight: topicWordCounts[k][i] / (topicCounts[k] || 1) }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 20);

      return {
        id: k,
        label: wordWeights.slice(0, 3).map((w) => w.word).join(", "),
        words: wordWeights,
        coherence: 0,
        documentCount: docTopicCounts.filter((d) => d[k] > 0).length,
      };
    });

    return {
      topics,
      numTopics: K,
      coherenceScore: this.computeCoherence(topics, documents, wordToIndex),
      perplexity: 0,
      iterations: this.config.iterations,
      documentTopics,
    };
  }

  getDocumentDistributions(documents: string[][]): TopicDistribution[] {
    // Use the normalised distributions computed during fit().
    // Fall back to uniform if fit() has not been called yet.
    return documents.map((_, i) => {
      if (this._docTopicDist.length > 0 && i < this._docTopicDist.length) {
        const row = this._docTopicDist[i];
        const topicWeights = row.map((weight, k) => ({ topicId: k, weight }));
        const dominant = topicWeights.reduce((a, b) => (b.weight > a.weight ? b : a));
        return { documentId: String(i), topics: topicWeights, dominantTopic: dominant.topicId };
      }
      // Fallback: uniform (before fit)
      const K = this.config.numTopics;
      const uniform = Array.from({ length: K }, (_, k) => ({ topicId: k, weight: 1 / K }));
      return { documentId: String(i), topics: uniform, dominantTopic: 0 };
    });
  }

  estimateOptimalTopics(documents: string[][], min = 2, max = 20): { k: number; coherence: number }[] {
    const results: { k: number; coherence: number }[] = [];
    for (let k = min; k <= max; k += 2) {
      const model = new LDAModeler({ ...this.config, numTopics: k }).fit(documents);
      results.push({ k, coherence: model.coherenceScore });
    }
    return results;
  }

  private buildVocab(documents: string[][]): Map<string, number> {
    const vocab = new Map<string, number>();
    for (const doc of documents) {
      for (const word of doc) {
        vocab.set(word, (vocab.get(word) ?? 0) + 1);
      }
    }
    return vocab;
  }

  private computeCoherence(topics: Topic[], documents: string[][], wordToIndex: Map<string, number>): number {
    let totalCoherence = 0;
    for (const topic of topics) {
      const topWords = topic.words.slice(0, 10).map((w) => w.word);
      let score = 0;
      let pairs = 0;
      for (let i = 1; i < topWords.length; i++) {
        for (let j = 0; j < i; j++) {
          const coCount = documents.filter((d) => d.includes(topWords[i]) && d.includes(topWords[j])).length;
          const jCount = documents.filter((d) => d.includes(topWords[j])).length;
          score += Math.log((coCount + 1) / (jCount || 1));
          pairs++;
        }
      }
      topic.coherence = pairs > 0 ? score / pairs : 0;
      totalCoherence += topic.coherence;
    }
    return topics.length > 0 ? totalCoherence / topics.length : 0;
  }

  private _seed!: number;
  private seededRandom(): number {
    this._seed = (this._seed * 16807) % 2147483647;
    return (this._seed - 1) / 2147483646;
  }

  private sampleFromDistribution(probs: number[]): number {
    const sum = probs.reduce((a, b) => a + b, 0);
    let r = this.seededRandom() * sum;
    for (let i = 0; i < probs.length; i++) {
      r -= probs[i];
      if (r <= 0) return i;
    }
    return probs.length - 1;
  }
}
