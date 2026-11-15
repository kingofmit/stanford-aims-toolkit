export type {
  SentimentResult,
  EmotionResult,
  AspectSentimentResult,
  TimestampedText,
  TemporalPoint,
} from './types';

import type {
  SentimentResult,
  EmotionResult,
  AspectSentimentResult,
  TimestampedText,
  TemporalPoint,
} from './types';

// ---------------------------------------------------------------------------
// AFINN Lexicon (subset — covers common research-relevant terms)
// ---------------------------------------------------------------------------

const AFINN: Record<string, number> = {
  abandon: -2, abandoned: -2, abuse: -3, accept: 1, accepted: 1, accomplish: 2,
  accomplished: 2, accurate: 1, achievement: 2, adequate: 1, admire: 3, admit: -1,
  advantage: 2, afraid: -2, agree: 1, alarm: -2, amazing: 4, anger: -3, angry: -3,
  annoy: -2, annoyed: -2, anxiety: -2, anxious: -2, apologize: -1, appreciate: 2,
  approval: 2, approve: 2, awful: -3, bad: -3, beautiful: 3, benefit: 2, best: 3,
  better: 2, bias: -1, biased: -2, blame: -2, boring: -2, brave: 2, brilliant: 4,
  broken: -1, calm: 2, care: 2, careful: 2, challenge: -1, challenging: -1,
  clear: 1, clever: 2, concern: -1, concerned: -1, confident: 2, confuse: -2,
  confused: -2, correct: 1, courage: 2, creative: 2, crisis: -3, critical: -2,
  criticize: -2, cruel: -3, damage: -3, danger: -3, dangerous: -3, decline: -2,
  defeat: -2, delight: 3, delightful: 3, deny: -2, depressed: -3, desire: 1,
  destroy: -3, difficult: -1, disadvantage: -2, disappoint: -2, disappointed: -2,
  disaster: -3, disgust: -3, dislike: -2, doubt: -1, dreadful: -3, eager: 2,
  easy: 1, effective: 2, efficient: 2, elegant: 2, embarrass: -2, encourage: 2,
  enjoy: 2, error: -2, essential: 1, evil: -3, excellent: 3, excite: 3, excited: 3,
  exciting: 3, fail: -2, failure: -2, fair: 2, faith: 1, fantastic: 4, fault: -2,
  fear: -2, fix: 1, flaw: -2, fool: -2, fortunate: 2, free: 1, friendly: 2,
  frustrate: -2, frustrated: -2, frustrating: -2, fun: 4, generous: 2, genius: 3,
  glad: 3, good: 3, graceful: 2, grateful: 3, great: 3, grief: -2, guilty: -3,
  happy: 3, hard: -1, harm: -2, harmful: -2, hate: -3, help: 2, helpful: 2,
  honest: 2, hope: 2, hopeful: 2, hopeless: -2, horrible: -3, hurt: -2,
  ignore: -1, impact: 1, important: 2, impossible: -2, impress: 3, impressive: 3,
  improve: 2, improvement: 2, inadequate: -2, incredible: 4, innovative: 2,
  insight: 2, insightful: 2, inspire: 3, interest: 1, interesting: 2, invalid: -2,
  joy: 3, kind: 2, lack: -2, laugh: 1, lead: 1, limit: -1, limitation: -1,
  love: 3, lovely: 3, luck: 3, lucky: 3, meaningful: 2, mistake: -2, negative: -2,
  nice: 3, novel: 2, obstacle: -2, outstanding: 5, pain: -2, panic: -3,
  passion: 1, perfect: 3, permit: 1, pleasant: 3, please: 1, pleasure: 3,
  poor: -2, positive: 2, powerful: 2, practical: 1, praise: 3, prefer: 1,
  problem: -2, productive: 2, progress: 2, promise: 1, proud: 2, quality: 2,
  regret: -2, reject: -2, reliable: 2, remarkable: 2, rescue: 2, respect: 2,
  responsible: 2, result: 1, reveal: 1, reward: 2, rich: 2, right: 1, risk: -2,
  robust: 2, rude: -2, ruin: -3, sad: -2, safe: 1, satisfy: 2, scare: -2,
  serious: -1, severe: -2, shame: -2, shock: -2, significant: 1, silly: -1,
  simple: 1, smart: 2, solution: 1, sorry: -1, strength: 2, stress: -2,
  strong: 2, struggle: -2, stupid: -3, succeed: 3, success: 2, successful: 3,
  suffer: -2, superb: 5, support: 2, surprise: 1, terrible: -3, terrific: 4,
  thank: 2, threat: -2, thrive: 3, top: 2, tough: -1, tragic: -2, tremendous: 2,
  triumph: 4, trouble: -2, trust: 2, ugly: -3, undermine: -2, understand: 2,
  unfair: -2, unfortunate: -2, unhappy: -2, unique: 2, useful: 2, useless: -2,
  valid: 1, valuable: 2, victim: -3, victory: 3, weak: -2, welcome: 2,
  well: 2, wonderful: 4, worry: -2, worse: -3, worst: -3, worth: 2, worthless: -3,
  wrong: -3,
};

// ---------------------------------------------------------------------------
// Emotion Lexicon (simplified)
// ---------------------------------------------------------------------------

type EmotionKey = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust';

const EMOTION_LEXICON: Record<string, EmotionKey[]> = {
  happy: ['joy'], glad: ['joy'], delighted: ['joy'], pleased: ['joy'], joyful: ['joy'],
  love: ['joy'], wonderful: ['joy'], amazing: ['joy', 'surprise'], excited: ['joy', 'surprise'],
  great: ['joy'], excellent: ['joy'], fantastic: ['joy'], enjoy: ['joy'], fun: ['joy'],
  sad: ['sadness'], unhappy: ['sadness'], depressed: ['sadness'], grief: ['sadness'],
  sorrow: ['sadness'], disappointed: ['sadness'], miserable: ['sadness'], lonely: ['sadness'],
  angry: ['anger'], furious: ['anger'], rage: ['anger'], hate: ['anger'], hostile: ['anger'],
  annoyed: ['anger'], frustrated: ['anger'], irritated: ['anger'], outraged: ['anger'],
  afraid: ['fear'], scared: ['fear'], terrified: ['fear'], anxious: ['fear'], panic: ['fear'],
  worried: ['fear'], nervous: ['fear'], dread: ['fear'], frightened: ['fear'],
  surprised: ['surprise'], shocked: ['surprise'], astonished: ['surprise'],
  unexpected: ['surprise'], sudden: ['surprise'], startled: ['surprise'],
  disgusted: ['disgust'], revolted: ['disgust'], sickened: ['disgust'],
  repulsed: ['disgust'], awful: ['disgust'], gross: ['disgust'], nasty: ['disgust'],
};

// ---------------------------------------------------------------------------
// Sentiment Analysis
// ---------------------------------------------------------------------------

/** Analyze the sentiment of a text using the AFINN lexicon. */
export function analyzeSentiment(text: string): SentimentResult {
  const tokens = text.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
  let score = 0;
  const positive: string[] = [];
  const negative: string[] = [];

  for (const token of tokens) {
    const val = AFINN[token];
    if (val !== undefined) {
      score += val;
      if (val > 0) positive.push(token);
      else if (val < 0) negative.push(token);
    }
  }

  return {
    score,
    comparative: tokens.length > 0 ? score / tokens.length : 0,
    positive,
    negative,
    tokens,
  };
}

// ---------------------------------------------------------------------------
// Emotion Detection
// ---------------------------------------------------------------------------

/** Detect six basic emotions in text. Returns normalized scores (0-1). */
export function detectEmotions(text: string): EmotionResult {
  const tokens = text.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
  const counts: Record<EmotionKey, number> = {
    joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0,
  };

  for (const token of tokens) {
    const emotions = EMOTION_LEXICON[token];
    if (emotions) {
      for (const e of emotions) counts[e]++;
    }
  }

  // Normalize to 0-1 range
  const max = Math.max(...Object.values(counts), 1);
  return {
    joy: Math.round((counts.joy / max) * 100) / 100,
    sadness: Math.round((counts.sadness / max) * 100) / 100,
    anger: Math.round((counts.anger / max) * 100) / 100,
    fear: Math.round((counts.fear / max) * 100) / 100,
    surprise: Math.round((counts.surprise / max) * 100) / 100,
    disgust: Math.round((counts.disgust / max) * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Aspect Sentiment
// ---------------------------------------------------------------------------

/** Analyze sentiment for specific aspects/topics within a text. */
export function aspectSentiment(text: string, aspects: string[]): AspectSentimentResult[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  return aspects.map((aspect) => {
    const aspectLower = aspect.toLowerCase();
    const relevantSentences = sentences.filter((s) => s.toLowerCase().includes(aspectLower));

    if (relevantSentences.length === 0) {
      return { aspect, score: 0, comparative: 0, context: '' };
    }

    const combined = relevantSentences.join('. ');
    const result = analyzeSentiment(combined);

    return {
      aspect,
      score: result.score,
      comparative: result.comparative,
      context: relevantSentences[0].trim(),
    };
  });
}

// ---------------------------------------------------------------------------
// Temporal Sentiment
// ---------------------------------------------------------------------------

/** Track sentiment over time from timestamped texts. */
export function temporalSentiment(entries: TimestampedText[]): TemporalPoint[] {
  const grouped = new Map<string, { scores: number[]; comparatives: number[] }>();

  for (const entry of entries) {
    const date = entry.date;
    const result = analyzeSentiment(entry.text);

    const existing = grouped.get(date);
    if (existing) {
      existing.scores.push(result.score);
      existing.comparatives.push(result.comparative);
    } else {
      grouped.set(date, { scores: [result.score], comparatives: [result.comparative] });
    }
  }

  return Array.from(grouped.entries())
    .map(([date, { scores, comparatives }]) => ({
      date,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
      comparative: Math.round((comparatives.reduce((a, b) => a + b, 0) / comparatives.length) * 100) / 100,
      count: scores.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
