export type { Token, NamedEntity, EntityType, TextStats, LanguageResult, NGram } from './types';

import type { Token, NamedEntity, TextStats, LanguageResult, NGram } from './types';

// ---------------------------------------------------------------------------
// Stopwords (English)
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
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
  't', 'can', 'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm', 'o', 're',
  've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven',
  'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren',
  'won', 'wouldn',
]);

// ---------------------------------------------------------------------------
// Tokenization
// ---------------------------------------------------------------------------

/** Tokenize text into individual word tokens. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /\b[\w']+\b/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      text: match[0],
      index: index++,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens;
}

/** Remove stopwords from a list of tokens. */
export function removeStopwords(tokens: Token[], customStopwords?: Set<string>): Token[] {
  const stops = customStopwords ?? STOPWORDS;
  return tokens.filter((t) => !stops.has(t.text.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Stemming (Porter Stemmer — simplified)
// ---------------------------------------------------------------------------

/** Apply Porter stemming to a word. */
export function stem(word: string): string {
  let w = word.toLowerCase();

  // Step 1a
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (!w.endsWith('ss') && w.endsWith('s')) w = w.slice(0, -1);

  // Step 1b
  if (w.endsWith('eed')) {
    if (measureGt0(w.slice(0, -3))) w = w.slice(0, -1);
  } else if (w.endsWith('ed') && hasVowel(w.slice(0, -2))) {
    w = w.slice(0, -2);
    w = step1bHelper(w);
  } else if (w.endsWith('ing') && hasVowel(w.slice(0, -3))) {
    w = w.slice(0, -3);
    w = step1bHelper(w);
  }

  // Step 1c
  if (w.endsWith('y') && hasVowel(w.slice(0, -1))) {
    w = w.slice(0, -1) + 'i';
  }

  return w;
}

function step1bHelper(w: string): string {
  if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) return w + 'e';
  if (w.length >= 2 && w[w.length - 1] === w[w.length - 2] && !'lsz'.includes(w[w.length - 1])) {
    return w.slice(0, -1);
  }
  return w;
}

function hasVowel(s: string): boolean {
  return /[aeiou]/i.test(s);
}

function measureGt0(s: string): boolean {
  return /[aeiou][^aeiou]/.test(s);
}

// ---------------------------------------------------------------------------
// Named Entity Recognition (rule-based)
// ---------------------------------------------------------------------------

/** Extract named entities from text using pattern matching. */
export function extractEntities(text: string): NamedEntity[] {
  const entities: NamedEntity[] = [];

  // Emails
  for (const match of text.matchAll(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g)) {
    entities.push({ text: match[0], type: 'EMAIL', start: match.index!, end: match.index! + match[0].length });
  }

  // URLs
  for (const match of text.matchAll(/https?:\/\/[^\s]+/g)) {
    entities.push({ text: match[0], type: 'URL', start: match.index!, end: match.index! + match[0].length });
  }

  // Hashtags
  for (const match of text.matchAll(/#\w+/g)) {
    entities.push({ text: match[0], type: 'HASHTAG', start: match.index!, end: match.index! + match[0].length });
  }

  // Mentions
  for (const match of text.matchAll(/@\w+/g)) {
    entities.push({ text: match[0], type: 'MENTION', start: match.index!, end: match.index! + match[0].length });
  }

  // Dates (basic patterns)
  for (const match of text.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi)) {
    entities.push({ text: match[0], type: 'DATE', start: match.index!, end: match.index! + match[0].length });
  }

  // Capitalized sequences (potential persons/orgs/locations)
  for (const match of text.matchAll(/(?:(?:Dr|Mr|Ms|Mrs|Prof)\.\s)?[A-Z][a-z]+(?:\s[A-Z][a-z]+)+/g)) {
    const t = match[0];
    // Skip if already captured
    if (!entities.some((e) => e.start === match.index)) {
      const type = t.startsWith('Dr.') || t.startsWith('Mr.') || t.startsWith('Ms.') || t.startsWith('Mrs.') || t.startsWith('Prof.')
        ? 'PERSON'
        : t.includes('University') || t.includes('Institute') || t.includes('Corp') || t.includes('Inc')
          ? 'ORGANIZATION'
          : 'LOCATION';
      entities.push({ text: t, type, start: match.index!, end: match.index! + t.length });
    }
  }

  return entities.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// Text Statistics
// ---------------------------------------------------------------------------

/** Compute text statistics for a document. */
export function textStats(text: string): TextStats {
  const words = text.match(/\b\w+\b/g) ?? [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));

  return {
    charCount: text.length,
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordLength: words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0,
    avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
    vocabularySize: uniqueWords.size,
    typeTokenRatio: words.length > 0 ? uniqueWords.size / words.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Language Detection (trigram-based, simplified)
// ---------------------------------------------------------------------------

const LANGUAGE_PROFILES: Record<string, Set<string>> = {
  en: new Set(['the', 'and', 'ing', 'tion', 'her', 'for', 'tha', 'hat', 'his', 'ere', 'ent', 'ion', 'was', 'ith', 'all', 'ver']),
  es: new Set(['los', 'las', 'que', 'del', 'ent', 'cion', 'por', 'con', 'una', 'est', 'ado', 'nte', 'mos', 'ara', 'ión', 'tos']),
  fr: new Set(['les', 'des', 'que', 'ent', 'ons', 'ion', 'ait', 'est', 'ous', 'par', 'une', 'ans', 'our', 'ais', 'res', 'men']),
  de: new Set(['der', 'die', 'und', 'den', 'ein', 'sch', 'ich', 'cht', 'das', 'ber', 'gen', 'ung', 'eit', 'ine', 'ach', 'ver']),
};

/** Detect the language of a text string. */
export function detectLanguage(text: string): LanguageResult {
  const trigrams = extractTrigrams(text.toLowerCase());
  let bestLang = 'en';
  let bestScore = 0;

  for (const [lang, profile] of Object.entries(LANGUAGE_PROFILES)) {
    let score = 0;
    for (const tri of trigrams) {
      if (profile.has(tri)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  const confidence = trigrams.length > 0 ? Math.min(bestScore / trigrams.length * 3, 1) : 0;
  return { language: bestLang, confidence: Math.round(confidence * 100) / 100 };
}

function extractTrigrams(text: string): string[] {
  const cleaned = text.replace(/[^a-z\s]/g, '');
  const trigrams: string[] = [];
  for (let i = 0; i <= cleaned.length - 3; i++) {
    trigrams.push(cleaned.substring(i, i + 3));
  }
  return trigrams;
}

// ---------------------------------------------------------------------------
// N-grams
// ---------------------------------------------------------------------------

/** Generate n-grams from tokens with frequency counts. */
export function ngrams(tokens: Token[], n: number): NGram[] {
  const counts = new Map<string, { tokens: string[]; count: number }>();

  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).map((t) => t.text.toLowerCase());
    const key = gram.join(' ');
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { tokens: gram, count: 1 });
    }
  }

  return Array.from(counts.entries())
    .map(([text, { tokens: t, count }]) => ({ tokens: t, text, count }))
    .sort((a, b) => b.count - a.count);
}
