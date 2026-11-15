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
