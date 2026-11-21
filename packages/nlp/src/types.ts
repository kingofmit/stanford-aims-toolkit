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

/** KWIC (Key Word In Context) concordance result. */
export interface KWICResult {
  keyword: string;
  left: string;
  match: string;
  right: string;
  documentIndex: number;
  position: number;
}

/** Readability index scores. */
export interface ReadabilityResult {
  fleschKincaid: number;
  fleschReadingEase: number;
  smog: number;
  colemanLiau: number;
  automatedReadability: number;
}

/** A dictionary mapping category names to word lists. */
export interface Dictionary {
  name: string;
  categories: Record<string, string[]>;
}

/** Result of dictionary-based text analysis. */
export interface DictionaryResult {
  totalWords: number;
  categories: Record<string, {
    count: number;
    percentage: number;
    words: string[];
  }>;
}
