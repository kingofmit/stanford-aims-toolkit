export type { Token, NamedEntity, EntityType, TextStats, LanguageResult, NGram, KWICResult, ReadabilityResult, Dictionary, DictionaryResult } from './types';

import type { Token, NamedEntity, TextStats, LanguageResult, NGram, KWICResult, ReadabilityResult, Dictionary, DictionaryResult } from './types';

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

// ---------------------------------------------------------------------------
// KWIC (Key Word In Context) Concordance
// ---------------------------------------------------------------------------

/** Search documents for a keyword and return each occurrence with surrounding context. */
export function concordance(
  documents: string[],
  keyword: string,
  options?: {
    windowSize?: number;
    caseSensitive?: boolean;
  },
): KWICResult[] {
  const windowSize = options?.windowSize ?? 50;
  const caseSensitive = options?.caseSensitive ?? false;
  const results: KWICResult[] = [];
  const flags = caseSensitive ? 'g' : 'gi';
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, flags);

  for (let docIdx = 0; docIdx < documents.length; docIdx++) {
    const doc = documents[docIdx];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(doc)) !== null) {
      const pos = match.index;
      const leftStart = Math.max(0, pos - windowSize);
      const rightEnd = Math.min(doc.length, pos + match[0].length + windowSize);
      results.push({
        keyword,
        left: doc.slice(leftStart, pos),
        match: match[0],
        right: doc.slice(pos + match[0].length, rightEnd),
        documentIndex: docIdx,
        position: pos,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Syllable Counter (helper)
// ---------------------------------------------------------------------------

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;
  let count = 0;
  let prevVowel = false;
  for (const ch of word) {
    const isVowel = 'aeiouy'.includes(ch);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  // Silent e
  if (word.endsWith('e') && count > 1) count--;
  return Math.max(count, 1);
}

// ---------------------------------------------------------------------------
// Sentence Splitting
// ---------------------------------------------------------------------------

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd',
  'gen', 'gov', 'sgt', 'cpl', 'pvt', 'capt', 'lt', 'col', 'maj',
  'rev', 'hon', 'pres', 'dept', 'univ', 'assn', 'bros', 'inc', 'ltd',
  'co', 'corp', 'vs', 'etc', 'approx', 'appt', 'est', 'min', 'max',
  'misc', 'dept', 'est', 'vol', 'fig', 'eq', 'no', 'jan', 'feb',
  'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  'u.s', 'u.k', 'e.g', 'i.e', 'a.m', 'p.m',
]);

/** Split text into sentences, handling abbreviations, decimals, and ellipses. */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  // Match potential sentence-ending punctuation
  const regex = /([.!?]+)\s+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const punctuation = match[1];
    const beforePunct = text.slice(lastIndex, match.index + punctuation.length);

    // Check for ellipsis
    if (punctuation === '...' || punctuation.length > 2) {
      continue;
    }

    // Check for decimal numbers (digit.digit)
    if (punctuation === '.') {
      const charBefore = match.index > 0 ? text[match.index - 1] : '';
      const charAfter = match.index + punctuation.length < text.length
        ? text[match.index + punctuation.length]
        : '';
      // Skip if surrounded by digits on both sides (decimal)
      if (/\d/.test(charBefore) && /\s*\d/.test(charAfter)) {
        continue;
      }
    }

    // Check for abbreviations
    if (punctuation === '.') {
      // Get the word before the period
      const wordBefore = text.slice(lastIndex, match.index).trim().split(/\s+/).pop() ?? '';
      const normalized = wordBefore.toLowerCase().replace(/\./g, '');
      if (ABBREVIATIONS.has(normalized) || ABBREVIATIONS.has(wordBefore.toLowerCase())) {
        continue;
      }
      // Single letter abbreviations like U.S.A.
      if (/^[A-Za-z]$/.test(wordBefore) || /^([A-Za-z]\.)+$/.test(wordBefore + '.')) {
        continue;
      }
    }

    sentences.push(beforePunct.trim());
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  const remaining = text.slice(lastIndex).trim();
  if (remaining.length > 0) {
    sentences.push(remaining);
  }

  return sentences.filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Readability Indices
// ---------------------------------------------------------------------------

/** Compute readability indices for a text. */
export function readability(text: string): ReadabilityResult {
  const words = text.match(/\b[a-zA-Z]+\b/g) ?? [];
  const sentenceList = splitSentences(text);
  const sentenceCount = Math.max(sentenceList.length, 1);
  const wordCount = Math.max(words.length, 1);
  const charCount = words.join('').length;

  let totalSyllables = 0;
  let polysyllables = 0;
  for (const w of words) {
    const syl = countSyllables(w);
    totalSyllables += syl;
    if (syl >= 3) polysyllables++;
  }

  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = totalSyllables / wordCount;

  // Flesch-Kincaid Grade Level
  const fleschKincaid = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

  // Flesch Reading Ease
  const fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

  // SMOG
  const smog = 1.0430 * Math.sqrt(polysyllables * (30 / sentenceCount)) + 3.1291;

  // Coleman-Liau
  const L = (charCount / wordCount) * 100;
  const S = (sentenceCount / wordCount) * 100;
  const colemanLiau = 0.0588 * L - 0.296 * S - 15.8;

  // Automated Readability Index
  const automatedReadability = 4.71 * (charCount / wordCount) + 0.5 * wordsPerSentence - 21.43;

  return {
    fleschKincaid: Math.round(fleschKincaid * 100) / 100,
    fleschReadingEase: Math.round(fleschReadingEase * 100) / 100,
    smog: Math.round(smog * 100) / 100,
    colemanLiau: Math.round(colemanLiau * 100) / 100,
    automatedReadability: Math.round(automatedReadability * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Dictionary Analysis (LIWC-like)
// ---------------------------------------------------------------------------

/** Moral Foundations dictionary (Graham et al.). */
export const MORAL_FOUNDATIONS: Dictionary = {
  name: 'Moral Foundations',
  categories: {
    care: [
      'compassion', 'empathy', 'suffer', 'hurt', 'harm', 'care', 'protect', 'kind',
      'nurture', 'safe', 'vulnerable', 'abuse', 'cruel', 'pain', 'heal', 'comfort',
      'mercy', 'gentle', 'tender', 'sympathy',
    ],
    fairness: [
      'fair', 'equal', 'justice', 'rights', 'deserve', 'bias', 'discriminate', 'prejudice',
      'honest', 'cheat', 'fraud', 'proportional', 'equitable', 'impartial', 'reciprocal',
      'balanced', 'unfair', 'exploit', 'oppress', 'privilege',
    ],
    loyalty: [
      'loyal', 'betray', 'patriot', 'group', 'team', 'unite', 'together', 'collective',
      'ally', 'traitor', 'abandon', 'belong', 'community', 'solidarity', 'devoted',
      'faithful', 'comrade', 'country', 'flag', 'tribe',
    ],
    authority: [
      'authority', 'respect', 'obey', 'tradition', 'order', 'law', 'hierarchy', 'leader',
      'rebel', 'subvert', 'disobey', 'submit', 'comply', 'discipline', 'duty', 'rank',
      'status', 'command', 'rule', 'govern',
    ],
    purity: [
      'pure', 'disgust', 'sacred', 'sin', 'clean', 'dirty', 'corrupt', 'wholesome',
      'moral', 'immoral', 'modest', 'indecent', 'virtue', 'taint', 'defile', 'sanctity',
      'noble', 'degrade', 'profane', 'pious',
    ],
  },
};

/** Cognitive Processes dictionary. */
export const COGNITIVE_PROCESSES: Dictionary = {
  name: 'Cognitive Processes',
  categories: {
    insight: [
      'think', 'know', 'consider', 'realize', 'understand', 'recognize', 'discover',
      'find', 'learn', 'notice', 'remember', 'see', 'decide', 'acknowledge', 'conclude',
      'determine', 'figure', 'gather', 'infer', 'perceive',
    ],
    causation: [
      'because', 'cause', 'effect', 'hence', 'therefore', 'result', 'consequently',
      'lead', 'create', 'produce', 'generate', 'influence', 'impact', 'trigger',
      'provoke', 'induce', 'due', 'reason', 'why', 'outcome',
    ],
    certainty: [
      'always', 'never', 'definitely', 'absolutely', 'certain', 'clearly', 'obvious',
      'undoubtedly', 'sure', 'indeed', 'without doubt', 'certainly', 'precisely',
      'exactly', 'completely', 'entirely', 'surely', 'truly', 'unquestionably',
      'inevitably',
    ],
    tentativeness: [
      'maybe', 'perhaps', 'possibly', 'might', 'could', 'seem', 'appear', 'suggest',
      'guess', 'assume', 'probable', 'likely', 'unclear', 'uncertain', 'roughly',
      'approximately', 'almost', 'somewhat', 'apparently', 'potentially',
    ],
  },
};

/** Analyze text against a dictionary, returning word counts and percentages per category. */
export function analyzeDictionary(text: string, dictionary: Dictionary): DictionaryResult {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
  const totalWords = words.length;

  const categories: DictionaryResult['categories'] = {};

  for (const [category, dictWords] of Object.entries(dictionary.categories)) {
    const wordSet = new Set(dictWords.map((w) => w.toLowerCase()));
    const matched: string[] = [];

    for (const w of words) {
      if (wordSet.has(w)) {
        matched.push(w);
      }
    }

    categories[category] = {
      count: matched.length,
      percentage: totalWords > 0 ? Math.round((matched.length / totalWords) * 10000) / 100 : 0,
      words: matched,
    };
  }

  return { totalWords, categories };
}
