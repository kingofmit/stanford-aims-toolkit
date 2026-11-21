export type {
  SentimentResult,
  EmotionResult,
  AspectSentimentResult,
  TimestampedText,
  TemporalPoint,
  VADERResult,
} from './types';

import type {
  SentimentResult,
  EmotionResult,
  AspectSentimentResult,
  TimestampedText,
  TemporalPoint,
  VADERResult,
} from './types';

// ---------------------------------------------------------------------------
// AFINN-165 Lexicon (expanded)
// ---------------------------------------------------------------------------

const AFINN: Record<string, number> = {
  // --- Score -5 ---
  bastard: -5, bastards: -5,

  // --- Score -4 ---
  ass: -4, asshole: -4, damn: -4, dick: -4, fucking: -4, fucked: -4, shit: -4,
  shitty: -4, bitch: -4, crap: -4, pissed: -4, suck: -4, sucks: -4, sucked: -4,
  sucking: -4, bullshit: -4,

  // --- Score -3 (original + additions) ---
  abuse: -3, anger: -3, angry: -3, awful: -3, bad: -3, crisis: -3,
  cruel: -3, damage: -3, danger: -3, dangerous: -3, depressed: -3, destroy: -3,
  disaster: -3, disgust: -3, dreadful: -3, evil: -3, guilty: -3, hate: -3,
  horrible: -3, panic: -3, ruin: -3, stupid: -3, terrible: -3, ugly: -3,
  victim: -3, worse: -3, worst: -3, wrong: -3,
  // new -3
  abhor: -3, abolish: -3, absurd: -3, abysmal: -3, ache: -3, aching: -3,
  adverse: -3, afflict: -3, aggravate: -3, agonize: -3, agony: -3, appall: -3,
  appalling: -3, assault: -3, atrocious: -3, bankrupt: -3, betray: -3,
  betrayal: -3, betrayed: -3, bitter: -3, bleed: -3, bother: -3, brutal: -3,
  bully: -3, burden: -3, catastrophe: -3, cheat: -3, coerce: -3, collapse: -3,
  condemn: -3, corrupt: -3, corruption: -3, criminal: -3, crush: -3, curse: -3,
  deceive: -3, degrade: -3, depress: -3, depressing: -3, depression: -3,
  despair: -3, despise: -3, destitute: -3, destruct: -3, detriment: -3,
  devastate: -3, dire: -3, disapproval: -3, discrimination: -3, disease: -3,
  dismal: -3, distress: -3, disturb: -3, doom: -3, drown: -3, dump: -3,
  enrage: -3, epidemic: -3, exploitation: -3, famine: -3, fatigue: -3,
  filth: -3, fraud: -3, grave: -3, grief: -3, grieve: -3, grim: -3,
  grotesque: -3, harass: -3, havoc: -3, heartless: -3, helpless: -3,
  hideous: -3, homicide: -3, horrify: -3, horror: -3, hostile: -3,
  humiliate: -3, ignorance: -3, impair: -3, infest: -3, injure: -3,
  insane: -3, insult: -3, invade: -3, irritate: -3, jail: -3, jealous: -3,
  kill: -3, lawsuit: -3, liar: -3, lie: -3, loath: -3, loathe: -3, loss: -3,
  menace: -3, misery: -3, mock: -3, mourn: -3, murder: -3, neglect: -3,
  nightmare: -3, numb: -3, oppress: -3, outrage: -3, overwhelm: -3,
  penalty: -3, perish: -3, persecute: -3, perverse: -3, plague: -3,
  poison: -3, pollute: -3, poverty: -3, prison: -3, profanity: -3,
  punish: -3, rage: -3, rape: -3, reckless: -3, reject: -3, resent: -3,
  revenge: -3, revolt: -3, ridicule: -3, rob: -3, rot: -3, ruthless: -3,
  sabotage: -3, sacrifice: -3, savage: -3, scandal: -3, scold: -3, scorn: -3,
  selfish: -3, setback: -3, sever: -3, sin: -3, slaughter: -3, slavery: -3,
  slump: -3, smash: -3, smuggle: -3, snob: -3, spite: -3, steal: -3,
  sting: -3, stink: -3, strangle: -3, sue: -3, suppress: -3, suspect: -3,
  swear: -3, terrify: -3, terrorism: -3, thief: -3, torment: -3, torture: -3,
  toxic: -3, trap: -3, trauma: -3, treachery: -3, trick: -3, tyrant: -3,
  undermine: -3, unethical: -3, unfair: -3, unstable: -3, upset: -3,
  vandal: -3, venom: -3, vex: -3, vicious: -3, violate: -3, violence: -3,
  violent: -3, vulgar: -3, warfare: -3, weaken: -3, wicked: -3, woe: -3,
  worthless: -3, wound: -3, wreck: -3, wretched: -3,

  // --- Score -2 (original + additions) ---
  abandon: -2, abandoned: -2, afraid: -2, alarm: -2, annoy: -2, annoyed: -2, critical: -2,
  anxiety: -2, anxious: -2, biased: -2, blame: -2, boring: -2, confuse: -2,
  confused: -2, criticize: -2, decline: -2, defeat: -2, deny: -2,
  disadvantage: -2, disappoint: -2, disappointed: -2, dislike: -2,
  embarrass: -2, error: -2, fail: -2, failure: -2, fault: -2, fear: -2,
  flaw: -2, fool: -2, frustrate: -2, frustrated: -2, frustrating: -2,
  harm: -2, harmful: -2, hopeless: -2, hurt: -2, impossible: -2,
  inadequate: -2, invalid: -2, lack: -2, mistake: -2, negative: -2,
  obstacle: -2, pain: -2, poor: -2, problem: -2, regret: -2, risk: -2,
  rude: -2, sad: -2, scare: -2, severe: -2, shame: -2, shock: -2, stress: -2,
  struggle: -2, suffer: -2, threat: -2, tragic: -2, trouble: -2,
  unfortunate: -2, unhappy: -2, useless: -2, weak: -2, worry: -2,
  // new -2
  abnormal: -2, abstain: -2, accusation: -2, accuse: -2, ail: -2,
  allegation: -2, allege: -2, ambiguous: -2, annoyance: -2, apathy: -2,
  argue: -2, arrogant: -2, avert: -2, awkward: -2, ban: -2, barrier: -2,
  begrudge: -2, belittle: -2, beware: -2, block: -2, blunder: -2, bore: -2,
  boycott: -2, breach: -2, bribe: -2, bumpy: -2, cancel: -2, caution: -2,
  clash: -2, coarse: -2, compel: -2, complacent: -2, complain: -2,
  complaint: -2, complicate: -2, conceal: -2, conflict: -2, confront: -2,
  conspiracy: -2, contempt: -2, contend: -2, contradict: -2,
  controversial: -2, controversy: -2, cramp: -2, cripple: -2,
  criticise: -2, crude: -2, cynical: -2, deadlock: -2, debacle: -2,
  debris: -2, decay: -2, deceit: -2, deficit: -2, defy: -2, delay: -2,
  demolish: -2, demotion: -2, deplete: -2, deplore: -2, deport: -2,
  deprive: -2, deride: -2, desert: -2, despite: -2, detain: -2, deter: -2,
  devalue: -2, deviate: -2, diminish: -2, disbelief: -2, discontinue: -2,
  discourage: -2, disdain: -2, disfavor: -2, dishearten: -2, dishonest: -2,
  disillusion: -2, dismiss: -2, disorder: -2, dispute: -2, disregard: -2,
  disrupt: -2, dissent: -2, dissolve: -2, distort: -2, distract: -2,
  dominate: -2, downfall: -2, downgrade: -2, dread: -2, drought: -2,
  dull: -2, ego: -2, embargo: -2, endure: -2, exhaust: -2, exploit: -2,
  expose: -2, fabricate: -2, fake: -2, fallacy: -2, falter: -2, feeble: -2,
  feud: -2, fiasco: -2, foe: -2, forbid: -2, forfeit: -2, friction: -2,
  frown: -2, fury: -2, futile: -2, gag: -2, gamble: -2, glare: -2,
  gloom: -2, gloomy: -2, gossip: -2, greed: -2, grudge: -2, hamper: -2,
  handicap: -2, hardship: -2, harsh: -2, haste: -2, haunt: -2, hazard: -2,
  hinder: -2, hoax: -2, hurdle: -2, idle: -2, immoral: -2, impede: -2,
  impose: -2, improper: -2, impure: -2, inability: -2, inappropriate: -2,
  incompetent: -2, inconsistent: -2, inconvenient: -2, indifferent: -2,
  indignant: -2, inferior: -2, inflame: -2, insecure: -2, insensitive: -2,
  insufficient: -2, interfere: -2, intimidate: -2, intrude: -2,
  irrational: -2, irresponsible: -2, isolate: -2, jeopardize: -2, lag: -2,
  lament: -2, limitation: -2, limp: -2, linger: -2, lobby: -2, lose: -2,
  mediocre: -2, misbehave: -2, mislead: -2, monopoly: -2, moody: -2,
  naive: -2, nag: -2, nuisance: -2, object: -2, obscure: -2, obstruct: -2,
  offend: -2, ominous: -2, oppose: -2, ordeal: -2, outcry: -2, overdue: -2,
  overlook: -2, overrun: -2, overturn: -2, paradox: -2, partisan: -2,
  peculiar: -2, penalize: -2, peril: -2, perplex: -2, pessimism: -2,
  pity: -2, plead: -2, plight: -2, plunder: -2, precaution: -2,
  prejudice: -2, pretend: -2, primitive: -2, propaganda: -2, protest: -2,
  provoke: -2, quarrel: -2, quit: -2, rash: -2, rebuke: -2, recede: -2,
  recess: -2, refusal: -2, regress: -2, remorse: -2, repeal: -2, repel: -2,
  reproach: -2, resign: -2, restless: -2, restrict: -2, retaliate: -2,
  retreat: -2, rigid: -2, rival: -2, rupture: -2, sanction: -2,
  sarcasm: -2, saturate: -2, scar: -2, scrutinize: -2, segregate: -2,
  seize: -2, shabby: -2, shallow: -2, siege: -2, skeptic: -2, slack: -2,
  slander: -2, snare: -2, somber: -2, sore: -2, stagger: -2, stagnant: -2,
  stall: -2, starve: -2, stern: -2, stigma: -2, strain: -2, strife: -2,
  strip: -2, stubborn: -2, stumble: -2, subdue: -2, succumb: -2, sulk: -2,
  surrender: -2, susceptible: -2, suspense: -2, suspicion: -2, taint: -2,
  tangle: -2, taunt: -2, tease: -2, tedious: -2, tempt: -2, tense: -2,
  terminate: -2, thwart: -2, toll: -2, tremble: -2, tumble: -2,
  turmoil: -2, twist: -2, undercut: -2, underestimate: -2, undo: -2,
  unease: -2, unfavorable: -2, unfit: -2, unjust: -2, unpleasant: -2,
  unpopular: -2, unrest: -2, unruly: -2, unsatisfactory: -2, unsettled: -2,
  unworthy: -2, upheaval: -2, uproot: -2, vain: -2, verdict: -2, veto: -2,
  void: -2, vulnerable: -2, wane: -2, wary: -2, wasted: -2, weary: -2,
  weird: -2, wilt: -2, wince: -2, withdraw: -2, withhold: -2, wrath: -2,
  yearn: -2,

  // --- Score -1 (original + additions) ---
  admit: -1, apologize: -1, bias: -1, broken: -1, challenge: -1,
  challenging: -1, concern: -1, concerned: -1, difficult: -1, doubt: -1,
  hard: -1, ignore: -1, limit: -1, serious: -1, silly: -1, sorry: -1,
  tough: -1,
  // new -1
  abstract: -1, adjust: -1, alter: -1, ambivalent: -1, anonymous: -1,
  assume: -1, bare: -1, busy: -1, casual: -1, cautious: -1, cold: -1,
  complex: -1, concede: -1, condition: -1, confine: -1, conscious: -1,
  conservative: -1, constraint: -1, contrast: -1, control: -1, cope: -1,
  cost: -1, counter: -1, debate: -1, demand: -1, depend: -1, detach: -1,
  disclose: -1, divide: -1, dry: -1, effort: -1, enforce: -1, exclude: -1,
  excuse: -1, expense: -1, extreme: -1, firm: -1, flat: -1, force: -1,
  formal: -1, grant: -1, guess: -1, hesitant: -1, ignorant: -1,
  indirect: -1, intense: -1, intervene: -1, irony: -1, modest: -1,
  mutual: -1, narrow: -1, neutral: -1, nevertheless: -1, normal: -1,
  notwithstanding: -1, odds: -1, ordinary: -1, passive: -1, patience: -1,
  plain: -1, potentially: -1, pressure: -1, probable: -1, probe: -1,
  prompt: -1, qualify: -1, question: -1, random: -1, raw: -1, reform: -1,
  regulate: -1, reluctant: -1, remedy: -1, remote: -1, repeat: -1,
  resist: -1, review: -1, routine: -1, skeptical: -1, slight: -1, slow: -1,
  solely: -1, somehow: -1, somewhat: -1, spare: -1, speculate: -1,
  steep: -1, strict: -1, subject: -1, submit: -1, sustain: -1,
  tentative: -1, tolerate: -1, uncertain: -1, undergo: -1, unknown: -1,
  unlikely: -1, unresolved: -1, vague: -1, venture: -1, virtual: -1,
  voluntary: -1, whereas: -1,

  // --- Score 1 (original + additions) ---
  accept: 1, accepted: 1, adequate: 1, clear: 1, correct: 1, desire: 1,
  easy: 1, essential: 1, faith: 1, fix: 1, free: 1, impact: 1,
  interest: 1, laugh: 1, lead: 1, passion: 1, permit: 1, please: 1,
  practical: 1, prefer: 1, promise: 1, result: 1, reveal: 1, right: 1,
  safe: 1, significant: 1, simple: 1, solution: 1, surprise: 1, valid: 1,
  // new 1
  accessible: 1, accommodate: 1, accord: 1, acknowledge: 1, adapt: 1,
  admiration: 1, affirm: 1, afford: 1, agreement: 1, aid: 1, alert: 1,
  align: 1, alive: 1, allow: 1, alternative: 1, amuse: 1, anticipate: 1,
  applaud: 1, appreciation: 1, aspire: 1, assure: 1, attain: 1,
  authentic: 1, balance: 1, bargain: 1, belong: 1, boost: 1,
  bright: 1, capable: 1, charm: 1, civic: 1, civil: 1, clean: 1,
  collaborate: 1, comfort: 1, commit: 1, compatible: 1, complement: 1,
  comply: 1, comprehensive: 1, compromise: 1, confer: 1, confirm: 1,
  connect: 1, consent: 1, constructive: 1, contribute: 1, convenience: 1,
  courtesy: 1, credible: 1, cultivate: 1, curious: 1, decent: 1,
  dedicate: 1, democratic: 1, deserve: 1, diplomatic: 1, distinct: 1,
  diverse: 1, earn: 1, ease: 1, educate: 1, eligible: 1,
  embrace: 1, emerge: 1, enable: 1, endeavor: 1, endorse: 1, engage: 1,
  enrich: 1, enterprise: 1, entertain: 1, equal: 1, equip: 1,
  establish: 1, evolve: 1, expand: 1, explore: 1, facilitate: 1,
  familiar: 1, favor: 1, feasible: 1, fit: 1, flexible: 1, flourish: 1,
  fond: 1, function: 1, fundamental: 1, gain: 1, genuine: 1, gift: 1,
  grace: 1, guarantee: 1, guide: 1, harmony: 1, healthy: 1,
  hero: 1, honor: 1, hospitable: 1, humane: 1, humble: 1, ideal: 1,
  imagine: 1, immune: 1, incentive: 1, inclusive: 1, inform: 1,
  initiate: 1, innovate: 1, integrate: 1, integrity: 1,
  intend: 1, invest: 1, keen: 1, launch: 1, legitimate: 1, liberty: 1,
  lively: 1, logical: 1, loyal: 1, maintain: 1, merit: 1, mindful: 1,
  moderate: 1, momentum: 1, motivate: 1, neat: 1, noble: 1, notable: 1,
  nurture: 1, objective: 1, oblige: 1, open: 1, opportunity: 1,
  optimize: 1, orderly: 1, original: 1, overcome: 1, participate: 1,
  patient: 1, peaceful: 1, persist: 1, pioneer: 1, pleased: 1, pledge: 1,
  polite: 1, popular: 1, premium: 1, preserve: 1, pride: 1, principle: 1,
  privilege: 1, proficient: 1, progressive: 1, promote: 1, proper: 1,
  prosper: 1, protect: 1, provide: 1, prudent: 1, purpose: 1, rational: 1,
  ready: 1, reasonable: 1, recommend: 1, refine: 1, refresh: 1, regard: 1,
  relieve: 1, renew: 1, represent: 1, resolve: 1,
  resourceful: 1, restore: 1, retain: 1, revive: 1, secure: 1,
  sincere: 1, skill: 1, smooth: 1, solid: 1, stable: 1, steadfast: 1,
  stimulate: 1, sufficient: 1, sweet: 1, sympathetic: 1, talent: 1,
  tidy: 1, tolerant: 1, transform: 1, transparent: 1,
  unity: 1, uphold: 1, vibrant: 1, vigilant: 1, vital: 1,
  volunteer: 1, warm: 1, wealth: 1, wholesome: 1, willing: 1, wise: 1,
  yield: 1,

  // --- Score 2 (original + additions) ---
  accomplish: 2, accomplished: 2, achievement: 2, advantage: 2, approve: 2,
  benefit: 2, efficient: 2, enjoy: 2, important: 2, insightful: 2,
  remarkable: 2, robust: 2,
  approval: 2, appreciate: 2, better: 2, brave: 2, calm: 2, care: 2,
  careful: 2, clever: 2, confident: 2, courage: 2, creative: 2, effective: 2,
  elegant: 2, encourage: 2, fair: 2, fortunate: 2, friendly: 2, generous: 2,
  graceful: 2, help: 2, helpful: 2, honest: 2, hope: 2, hopeful: 2,
  improve: 2, improvement: 2, innovative: 2, insight: 2, interesting: 2,
  kind: 2, meaningful: 2, novel: 2, positive: 2, powerful: 2, productive: 2,
  progress: 2, proud: 2, quality: 2, reliable: 2, rescue: 2, respect: 2,
  responsible: 2, reward: 2, rich: 2, smart: 2, strength: 2, strong: 2,
  support: 2, thank: 2, top: 2, trust: 2, understand: 2,
  unique: 2, useful: 2, valuable: 2, welcome: 2, well: 2,
  worth: 2,
  // new 2
  abundance: 2, acclaim: 2, adore: 2, advance: 2, affection: 2,
  allegiance: 2, amaze: 2, ample: 2, awe: 2, beloved: 2, bliss: 2,
  bloom: 2, boon: 2, breakthrough: 2, celebrate: 2, champion: 2,
  cherish: 2, commend: 2, compassion: 2, compliment: 2, courteous: 2,
  dazzle: 2, devote: 2, dignity: 2, distinction: 2, eager: 2,
  elevate: 2, empower: 2, enchant: 2, endear: 2,
  energize: 2, enlighten: 2, enthusiasm: 2, envision: 2, esteem: 2,
  euphoria: 2, exalt: 2, exceed: 2, excel: 2, exhilarate: 2,
  exuberant: 2, fame: 2, feast: 2, fertile: 2,
  festive: 2, flawless: 2, fortune: 2, freedom: 2, fulfill: 2, glory: 2,
  goodness: 2, gorgeous: 2, gratitude: 2, happiness: 2, heal: 2,
  heartfelt: 2, heroic: 2, illuminate: 2, immense: 2,
  infinite: 2, jubilant: 2, legend: 2, luminous: 2,
  marvel: 2, mercy: 2,
  optimism: 2, passionate: 2, pinnacle: 2,
  poise: 2, priceless: 2, profound: 2, radiant: 2, rejoice: 2, relish: 2,
  renowned: 2, revere: 2, savor: 2, serene: 2, solidarity: 2, soul: 2,
  sparkle: 2, stellar: 2,
  supreme: 2, tender: 2, thankful: 2, thrill: 2, treasure: 2,
  uplift: 2, valor: 2, victorious: 2, virtue: 2, warmth: 2,
  wisdom: 2, wonder: 2, worthy: 2, zeal: 2, zenith: 2,

  // --- Score 3 (original + additions) ---
  best: 3, beautiful: 3, delight: 3, delightful: 3, excellent: 3,
  grateful: 3, thrive: 3, victory: 3,
  excite: 3, excited: 3, exciting: 3, genius: 3, glad: 3, good: 3,
  great: 3, impress: 3, impressive: 3, joy: 3, love: 3, lovely: 3,
  luck: 3, lucky: 3, nice: 3, perfect: 3, pleasant: 3, pleasure: 3,
  praise: 3, succeed: 3, successful: 3,
  // new 3
  awesome: 3, breathtaking: 3, brilliant: 3, ecstasy: 3, elated: 3,
  enchanting: 3, exquisite: 3, glorious: 3, grand: 3, incredible: 3,
  joyous: 3, jubilation: 3, magical: 3, majestic: 3, marvelous: 3,
  overjoyed: 3, radiance: 3, rapture: 3, stunning: 3, thrilling: 3,
  wondrous: 3,

  // --- Score 4 (original + additions) ---
  amazing: 4, fantastic: 4, fun: 4, terrific: 4, triumph: 4,
  wonderful: 4,
  // new 4
  blissful: 4, euphoric: 4, exhilarating: 4,
  mesmerizing: 4, miraculous: 4, sensational: 4,

  // --- Score 5 (original + additions) ---
  outstanding: 5,
};

// ---------------------------------------------------------------------------
// Negation Handling
// ---------------------------------------------------------------------------

const NEGATION_WORDS = new Set([
  'not', "n't", 'no', 'never', 'neither', 'nobody', 'nothing',
  'nowhere', 'nor', 'cannot', "can't", "won't", "don't", "doesn't",
  "didn't", "isn't", "aren't", "wasn't", "weren't", "wouldn't",
  "couldn't", "shouldn't", "mustn't", "haven't", "hasn't", "hadn't",
]);

/**
 * Check whether any token within `window` positions before `index` is a
 * negation word. Also checks for contractions containing "n't" attached
 * to the preceding token.
 */
function isNegated(tokens: string[], index: number, window = 3): boolean {
  const start = Math.max(0, index - window);
  for (let i = start; i < index; i++) {
    const t = tokens[i];
    if (NEGATION_WORDS.has(t) || t.endsWith("n't")) {
      return true;
    }
  }
  return false;
}

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
// Degree Modifiers (VADER-style)
// ---------------------------------------------------------------------------

const DEGREE_MODIFIERS: Record<string, number> = {
  very: 1.293,
  extremely: 1.293,
  absolutely: 1.293,
  incredibly: 1.293,
  really: 1.293,
  so: 1.293,
  totally: 1.293,
  slightly: 0.293,
  somewhat: 0.293,
  barely: 0.293,
  hardly: 0.293,
  marginally: 0.293,
  kind: 0.293,
  kinda: 0.293,
  rather: 0.293,
};

// ---------------------------------------------------------------------------
// Sentiment Analysis (with negation handling)
// ---------------------------------------------------------------------------

/** Analyze the sentiment of a text using the AFINN lexicon with negation handling. */
export function analyzeSentiment(text: string): SentimentResult {
  const tokens = text.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
  let score = 0;
  const positive: string[] = [];
  const negative: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const val = AFINN[token];
    if (val !== undefined) {
      let adjusted = val;
      if (isNegated(tokens, i)) {
        // Flip sign and reduce magnitude by 50%
        adjusted = -val * 0.5;
      }
      score += adjusted;
      if (adjusted > 0) positive.push(token);
      else if (adjusted < 0) negative.push(token);
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
// VADER-style Sentiment Analysis
// ---------------------------------------------------------------------------

const CAPS_BOOST = 0.733;

/**
 * VADER-style sentiment analysis that accounts for capitalization, punctuation,
 * degree modifiers, and "but" clause weighting.
 */
export function vaderSentiment(text: string): VADERResult {
  // Split on "but" — text after "but" gets 50% more weight
  const butParts = text.split(/\bbut\b/i);
  const isMultiClause = butParts.length > 1;

  let totalPositive = 0;
  let totalNegative = 0;
  let totalNeutral = 0;
  let rawScore = 0;

  for (let clauseIdx = 0; clauseIdx < butParts.length; clauseIdx++) {
    const clause = butParts[clauseIdx];
    // Weight: text after "but" gets 1.5x, text before gets 0.5x when there's a but clause
    const weight = isMultiClause ? (clauseIdx === 0 ? 0.5 : 1.5) : 1.0;

    const tokens = clause.match(/\b[a-zA-Z']+\b/g) ?? [];
    const lowerTokens = tokens.map((t) => t.toLowerCase());

    // Count exclamation marks in this clause for positive boost
    const exclamationCount = Math.min((clause.match(/!/g) ?? []).length, 4);

    let clauseScore = 0;

    for (let i = 0; i < tokens.length; i++) {
      const original = tokens[i];
      const lower = lowerTokens[i];
      const val = AFINN[lower];

      if (val === undefined) {
        totalNeutral++;
        continue;
      }

      let adjusted = val;

      // Negation handling
      if (isNegated(lowerTokens, i)) {
        adjusted = -val * 0.5;
      }

      // Degree modifier check (previous token)
      if (i > 0) {
        const prevLower = lowerTokens[i - 1];
        const modifier = DEGREE_MODIFIERS[prevLower];
        if (modifier !== undefined) {
          adjusted = adjusted * modifier;
        }
      }

      // ALL CAPS boost (only if word is 2+ chars and entire word is uppercase)
      if (original.length >= 2 && original === original.toUpperCase()) {
        if (adjusted > 0) adjusted += CAPS_BOOST;
        else if (adjusted < 0) adjusted -= CAPS_BOOST;
      }

      clauseScore += adjusted;

      if (adjusted > 0) totalPositive++;
      else if (adjusted < 0) totalNegative++;
      else totalNeutral++;
    }

    // Exclamation boost for positive scores
    if (clauseScore > 0 && exclamationCount > 0) {
      clauseScore += exclamationCount * 0.292;
    }

    rawScore += clauseScore * weight;
  }

  // Normalize compound to [-1, 1]
  const compound = rawScore / Math.sqrt(rawScore * rawScore + 15);

  // Compute proportions
  const total = totalPositive + totalNegative + totalNeutral;
  if (total === 0) {
    return { compound: 0, positive: 0, negative: 0, neutral: 0 };
  }

  return {
    compound: Math.round(compound * 10000) / 10000,
    positive: Math.round((totalPositive / total) * 1000) / 1000,
    negative: Math.round((totalNegative / total) * 1000) / 1000,
    neutral: Math.round((totalNeutral / total) * 1000) / 1000,
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
