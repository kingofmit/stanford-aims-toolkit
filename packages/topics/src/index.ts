export * from "./types";

import type { LDAConfig, Topic, TopicModel, TopicDistribution, CoherenceScore, TopicWord } from "./types";

export class LDAModeler {
  private config: Required<LDAConfig>;

  constructor(config: LDAConfig) {
    this.config = {
      alpha: 0.1,
      beta: 0.01,
      iterations: 1000,
      seed: 42,
      ...config,
    };
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
    };
  }

  getDocumentDistributions(documents: string[][], model: TopicModel): TopicDistribution[] {
    return documents.map((doc, i) => {
      const topicWeights = model.topics.map((t) => ({
        topicId: t.id,
        weight: 1 / model.numTopics,
      }));
      const dominant = topicWeights.reduce((a, b) => (b.weight > a.weight ? b : a));
      return { documentId: String(i), topics: topicWeights, dominantTopic: dominant.topicId };
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

  private _seed = 42;
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
