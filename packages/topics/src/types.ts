export interface Topic {
  id: number;
  label: string;
  words: TopicWord[];
  coherence: number;
  documentCount: number;
}

export interface TopicWord {
  word: string;
  weight: number;
}

export interface TopicModel {
  topics: Topic[];
  numTopics: number;
  coherenceScore: number;
  perplexity: number;
  iterations: number;
  /** Topic distribution for each document: documentTopics[i][k] = proportion of topic k in document i. Each row sums to 1.0. */
  documentTopics: number[][];
}

export interface TopicDistribution {
  documentId: string;
  topics: { topicId: number; weight: number }[];
  dominantTopic: number;
}

export interface CoherenceScore {
  method: "umass" | "c_v" | "npmi";
  score: number;
  perTopic: { topicId: number; score: number }[];
}

export interface TopicTimeline {
  periods: { label: string; start: Date; end: Date }[];
  evolution: { topicId: number; weights: number[] }[];
}

export interface LDAConfig {
  numTopics: number;
  alpha?: number;
  beta?: number;
  iterations?: number;
  seed?: number;
}

export interface NMFConfig {
  numTopics: number;
  maxIterations?: number;
  tolerance?: number;
  seed?: number;
}

export interface PreprocessConfig {
  removeStopwords?: boolean;
  stem?: boolean;
  lowercase?: boolean;
  minWordLength?: number;
  minDocFrequency?: number;
  maxDocFrequencyRatio?: number;
}

export interface ProcessedCorpus {
  documents: string[][];
  vocabulary: string[];
  dtMatrix: number[][];
}
