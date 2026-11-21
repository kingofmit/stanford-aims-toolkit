/** Sentiment analysis result for a single text. */
export interface SentimentResult {
  score: number;
  comparative: number;
  positive: string[];
  negative: string[];
  tokens: string[];
}

/** Emotion detection result (Ekman's 6 basic emotions). */
export interface EmotionResult {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
}

/** Aspect-level sentiment result. */
export interface AspectSentimentResult {
  aspect: string;
  score: number;
  comparative: number;
  context: string;
}

/** A timestamped text entry for temporal analysis. */
export interface TimestampedText {
  text: string;
  date: string;
}

/** Temporal sentiment data point. */
export interface TemporalPoint {
  date: string;
  score: number;
  comparative: number;
  count: number;
}

/** VADER-style sentiment result with compound and proportion scores. */
export interface VADERResult {
  compound: number;    // Normalized [-1, 1]
  positive: number;    // Proportion of positive words
  negative: number;    // Proportion of negative words
  neutral: number;     // Proportion of neutral words
}
