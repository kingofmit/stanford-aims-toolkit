/** A single token with metadata. */
export interface Token {
  text: string;
  index: number;
  start: number;
  end: number;
}

/** Named entity extracted from text. */
export interface NamedEntity {
  text: string;
  type: EntityType;
  start: number;
  end: number;
}

export type EntityType = 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'DATE' | 'NUMBER' | 'EMAIL' | 'URL' | 'HASHTAG' | 'MENTION';

/** Text statistics for a document. */
export interface TextStats {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  avgWordLength: number;
  avgSentenceLength: number;
  vocabularySize: number;
  typeTokenRatio: number;
}

/** Language detection result. */
export interface LanguageResult {
  language: string;
  confidence: number;
}

/** N-gram with frequency. */
export interface NGram {
  tokens: string[];
  text: string;
  count: number;
}
