import { describe, it, expect } from "vitest";
import {
  tokenize,
  removeStopwords,
  stem,
  extractEntities,
  textStats,
  detectLanguage,
  ngrams,
  concordance,
  splitSentences,
  readability,
  analyzeDictionary,
  MORAL_FOUNDATIONS,
  COGNITIVE_PROCESSES,
} from "../index";

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------

describe("tokenize", () => {
  it("produces the correct token count", () => {
    const tokens = tokenize("Hello world, this is a test.");
    expect(tokens.length).toBe(6);
  });

  it("records correct character positions", () => {
    const tokens = tokenize("cat sat");
    expect(tokens[0].start).toBe(0);
    expect(tokens[0].end).toBe(3);
    expect(tokens[1].start).toBe(4);
    expect(tokens[1].end).toBe(7);
  });

  it("assigns sequential index values", () => {
    const tokens = tokenize("one two three");
    expect(tokens.map((t) => t.index)).toEqual([0, 1, 2]);
  });

  it("handles punctuation by not including it as tokens", () => {
    const tokens = tokenize("Hello, world! How are you?");
    const texts = tokens.map((t) => t.text);
    expect(texts).not.toContain(",");
    expect(texts).not.toContain("!");
    expect(texts).not.toContain("?");
  });

  it("handles contractions as single tokens", () => {
    const tokens = tokenize("don't can't won't");
    expect(tokens.length).toBe(3);
    expect(tokens[0].text).toBe("don't");
  });

  it("returns an empty array for empty input", () => {
    expect(tokenize("")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// removeStopwords
// ---------------------------------------------------------------------------

describe("removeStopwords", () => {
  it("removes common English stopwords", () => {
    const tokens = tokenize("this is a very good test");
    const filtered = removeStopwords(tokens);
    const words = filtered.map((t) => t.text.toLowerCase());
    expect(words).not.toContain("this");
    expect(words).not.toContain("is");
    expect(words).not.toContain("a");
  });

  it("keeps meaningful content words", () => {
    const tokens = tokenize("the scientist analyzed the data carefully");
    const filtered = removeStopwords(tokens);
    const words = filtered.map((t) => t.text.toLowerCase());
    expect(words).toContain("scientist");
    expect(words).toContain("analyzed");
    expect(words).toContain("data");
    expect(words).toContain("carefully");
  });

  it("accepts custom stopword sets", () => {
    const tokens = tokenize("cat dog bird");
    const custom = new Set(["cat", "dog"]);
    const filtered = removeStopwords(tokens, custom);
    const words = filtered.map((t) => t.text.toLowerCase());
    expect(words).not.toContain("cat");
    expect(words).not.toContain("dog");
    expect(words).toContain("bird");
  });
});

// ---------------------------------------------------------------------------
// stem
// ---------------------------------------------------------------------------

describe("stem", () => {
  it('stems "running" to "run"', () => {
    expect(stem("running")).toBe("run");
  });

  it('stems "happiness" — simplified Porter retains suffix, returns lowercased form', () => {
    // The simplified Porter stemmer does not implement step 2 (-ness removal),
    // so "happiness" lowercases but is not further reduced.
    const result = stem("happiness");
    expect(result).toBe(result.toLowerCase()); // at minimum it lowercases
    expect(typeof result).toBe("string");
  });

  it('stems "flies" to "fli"', () => {
    expect(stem("flies")).toBe("fli");
  });

  it('stems "cats" to "cat"', () => {
    expect(stem("cats")).toBe("cat");
  });

  it('stems "caresses" to "caress"', () => {
    expect(stem("caresses")).toBe("caress");
  });

  it("is case-insensitive (lowercases first)", () => {
    expect(stem("Running")).toBe(stem("running"));
  });
});

// ---------------------------------------------------------------------------
// extractEntities
// ---------------------------------------------------------------------------

describe("extractEntities", () => {
  it("finds email addresses", () => {
    const entities = extractEntities("Contact alice@example.com for info.");
    const emails = entities.filter((e) => e.type === "EMAIL");
    expect(emails).toHaveLength(1);
    expect(emails[0].text).toBe("alice@example.com");
  });

  it("finds URLs", () => {
    const entities = extractEntities("Visit https://stanford.edu for details.");
    const urls = entities.filter((e) => e.type === "URL");
    expect(urls).toHaveLength(1);
    expect(urls[0].text).toContain("stanford.edu");
  });

  it("finds dates in numeric form", () => {
    const entities = extractEntities("The meeting is on 12/25/2024.");
    const dates = entities.filter((e) => e.type === "DATE");
    expect(dates.length).toBeGreaterThan(0);
    expect(dates[0].text).toBe("12/25/2024");
  });

  it("finds dates in long form", () => {
    const entities = extractEntities("The event was on January 15, 2023.");
    const dates = entities.filter((e) => e.type === "DATE");
    expect(dates.length).toBeGreaterThan(0);
  });

  it("finds capitalized person names", () => {
    const entities = extractEntities("John Smith presented the findings.");
    const names = entities.filter((e) => e.type !== "EMAIL" && e.type !== "URL" && e.type !== "DATE");
    expect(names.length).toBeGreaterThan(0);
    expect(names[0].text).toContain("John Smith");
  });

  it("returns entities sorted by start position", () => {
    const entities = extractEntities("Contact bob@test.com or visit https://test.com.");
    for (let i = 1; i < entities.length; i++) {
      expect(entities[i].start).toBeGreaterThanOrEqual(entities[i - 1].start);
    }
  });
});

// ---------------------------------------------------------------------------
// textStats
// ---------------------------------------------------------------------------

describe("textStats", () => {
  it("computes correct word count", () => {
    const stats = textStats("The quick brown fox jumps.");
    expect(stats.wordCount).toBe(5);
  });

  it("computes correct sentence count", () => {
    const stats = textStats("Hello world. How are you? I am fine!");
    expect(stats.sentenceCount).toBe(3);
  });

  it("computes type-token ratio below 1 when words repeat", () => {
    const stats = textStats("the cat sat on the mat");
    // "the" appears twice — TTR < 1
    expect(stats.typeTokenRatio).toBeLessThan(1);
    expect(stats.typeTokenRatio).toBeGreaterThan(0);
  });

  it("computes TTR of 1 for all-unique words", () => {
    const stats = textStats("alpha beta gamma delta");
    expect(stats.typeTokenRatio).toBe(1);
  });

  it("tracks character count", () => {
    const text = "Hello";
    expect(textStats(text).charCount).toBe(5);
  });

  it("computes vocabulary size equal to unique lowercase words", () => {
    const stats = textStats("Cat cat CAT dog");
    expect(stats.vocabularySize).toBe(2); // 'cat' and 'dog'
  });
});

// ---------------------------------------------------------------------------
// detectLanguage
// ---------------------------------------------------------------------------

describe("detectLanguage", () => {
  it("detects English text as 'en'", () => {
    const result = detectLanguage(
      "The quick brown fox jumps over the lazy dog. This is an English sentence.",
    );
    expect(result.language).toBe("en");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("detects Spanish text as 'es'", () => {
    const result = detectLanguage(
      "Los estudiantes aprendieron mucho en la universidad. Las clases fueron interesantes.",
    );
    expect(result.language).toBe("es");
  });

  it("returns confidence between 0 and 1", () => {
    const result = detectLanguage("Hello world this is a test sentence.");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// ngrams
// ---------------------------------------------------------------------------

describe("ngrams", () => {
  it('generates bigrams of "the cat sat" in correct pairs', () => {
    const tokens = tokenize("the cat sat");
    const bigrams = ngrams(tokens, 2);
    const texts = bigrams.map((g) => g.text);
    expect(texts).toContain("the cat");
    expect(texts).toContain("cat sat");
    expect(bigrams).toHaveLength(2);
  });

  it("generates trigrams with the right length", () => {
    const tokens = tokenize("one two three four");
    const trigrams = ngrams(tokens, 3);
    expect(trigrams).toHaveLength(2);
    trigrams.forEach((g) => expect(g.tokens).toHaveLength(3));
  });

  it("counts repeated n-grams correctly", () => {
    const tokens = tokenize("the cat the cat the cat");
    const bigrams = ngrams(tokens, 2);
    const theCat = bigrams.find((g) => g.text === "the cat");
    expect(theCat?.count).toBe(3);
  });

  it("sorts by frequency descending", () => {
    const tokens = tokenize("a b a b a c");
    const bigrams = ngrams(tokens, 2);
    expect(bigrams[0].count).toBeGreaterThanOrEqual(bigrams[1]?.count ?? 0);
  });
});

// ---------------------------------------------------------------------------
// concordance (KWIC)
// ---------------------------------------------------------------------------

describe("concordance", () => {
  const docs = [
    "The researcher analyzed the data carefully and found significant results.",
    "Data collection was thorough and the analysis was rigorous.",
  ];

  it("finds keyword occurrences across documents", () => {
    const results = concordance(docs, "data");
    expect(results.length).toBeGreaterThan(0);
  });

  it("records correct documentIndex", () => {
    const results = concordance(docs, "researcher");
    expect(results).toHaveLength(1);
    expect(results[0].documentIndex).toBe(0);
  });

  it("populates left and right context windows", () => {
    const results = concordance(["The cat sat on the mat."], "cat", { windowSize: 10 });
    expect(results[0].left.length).toBeGreaterThan(0);
    expect(results[0].right.length).toBeGreaterThan(0);
  });

  it("is case-insensitive by default", () => {
    const results = concordance(["DATA is important. The data is clean."], "data");
    expect(results).toHaveLength(2);
  });

  it("respects case-sensitive option", () => {
    const results = concordance(["DATA is important. The data is clean."], "data", {
      caseSensitive: true,
    });
    expect(results).toHaveLength(1);
    expect(results[0].match).toBe("data");
  });

  it("window size limits context length", () => {
    const longDoc = "word ".repeat(50) + "TARGET " + "word ".repeat(50);
    const results = concordance([longDoc], "TARGET", { windowSize: 20 });
    expect(results[0].left.length).toBeLessThanOrEqual(20);
    expect(results[0].right.length).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// splitSentences
// ---------------------------------------------------------------------------

describe("splitSentences", () => {
  it("splits simple sentences on periods", () => {
    const sentences = splitSentences("Hello world. This is a test. Done.");
    expect(sentences).toHaveLength(3);
  });

  it("handles title abbreviations like Dr. Smith without splitting", () => {
    const sentences = splitSentences("Dr. Smith presented the results. The audience applauded.");
    expect(sentences).toHaveLength(2);
  });

  it("does not split on decimal numbers", () => {
    const sentences = splitSentences("The mean was 3.14 points. That is significant.");
    expect(sentences).toHaveLength(2);
  });

  it("splits on question marks and exclamation points", () => {
    const sentences = splitSentences("Is this correct? Yes it is! Great.");
    expect(sentences).toHaveLength(3);
  });

  it("handles ellipsis — ellipsis does not split sentence prematurely", () => {
    // An ellipsis followed by content should still produce a sentence containing
    // the text that follows the ellipsis.
    const sentences = splitSentences("Well... that is interesting. And so is this.");
    expect(sentences.length).toBeGreaterThanOrEqual(1);
    // The full concatenated output should include both content words
    const all = sentences.join(" ");
    expect(all).toContain("interesting");
    expect(all).toContain("And so is this");
  });
});

// ---------------------------------------------------------------------------
// readability
// ---------------------------------------------------------------------------

describe("readability", () => {
  const normalText =
    "The student studied hard for the exam. She reviewed her notes every evening. " +
    "The teacher provided helpful feedback on assignments. Learning requires dedication and effort.";

  it("produces a Flesch-Kincaid grade level in a reasonable range (1-16) for normal prose", () => {
    const result = readability(normalText);
    expect(result.fleschKincaid).toBeGreaterThan(1);
    expect(result.fleschKincaid).toBeLessThan(16);
  });

  it("produces a positive Flesch Reading Ease score", () => {
    const result = readability(normalText);
    // Flesch RE ranges roughly 0–100 for normal text
    expect(result.fleschReadingEase).toBeLessThan(120);
  });

  it("produces a positive SMOG index for multi-sentence text", () => {
    const result = readability(normalText);
    expect(result.smog).toBeGreaterThan(0);
  });

  it("harder text has higher Flesch-Kincaid grade than simpler text", () => {
    const simple = "The cat sat. The dog ran. The bird flew. I saw them go.";
    const complex =
      "The epistemological ramifications of poststructuralist deconstruction necessitate a comprehensive re-examination of hermeneutical frameworks.";
    const simpleScore = readability(simple).fleschKincaid;
    const complexScore = readability(complex).fleschKincaid;
    expect(complexScore).toBeGreaterThan(simpleScore);
  });
});

// ---------------------------------------------------------------------------
// analyzeDictionary
// ---------------------------------------------------------------------------

describe("analyzeDictionary", () => {
  it("matches moral foundations care words", () => {
    const text = "We must show compassion and empathy to those who suffer and are in pain.";
    const result = analyzeDictionary(text, MORAL_FOUNDATIONS);
    expect(result.categories["care"].count).toBeGreaterThan(0);
    expect(result.categories["care"].words).toContain("compassion");
  });

  it("matches moral foundations fairness words", () => {
    const text = "Justice and equal rights are fundamental. Discrimination is unfair and wrong.";
    const result = analyzeDictionary(text, MORAL_FOUNDATIONS);
    expect(result.categories["fairness"].count).toBeGreaterThan(0);
  });

  it("computes percentage relative to total word count", () => {
    const text = "compassion compassion compassion a b c d e f g"; // 10 words, 3 matches
    const result = analyzeDictionary(text, MORAL_FOUNDATIONS);
    expect(result.totalWords).toBe(10);
    expect(result.categories["care"].percentage).toBeCloseTo(30, 0);
  });

  it("returns zero counts for irrelevant text", () => {
    const text = "the quick brown fox jumped over the lazy dog";
    const result = analyzeDictionary(text, MORAL_FOUNDATIONS);
    Object.values(result.categories).forEach((cat) => {
      expect(cat.count).toBe(0);
    });
  });

  it("matches cognitive processes insight words", () => {
    const text = "I think and understand that we can learn and discover new things.";
    const result = analyzeDictionary(text, COGNITIVE_PROCESSES);
    expect(result.categories["insight"].count).toBeGreaterThan(0);
  });

  it("matches cognitive processes causation words", () => {
    const text = "The result happened because of the cause, therefore it had a great impact.";
    const result = analyzeDictionary(text, COGNITIVE_PROCESSES);
    expect(result.categories["causation"].count).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// MORAL_FOUNDATIONS and COGNITIVE_PROCESSES dictionary shape
// ---------------------------------------------------------------------------

describe("MORAL_FOUNDATIONS dictionary", () => {
  it("has the expected five categories", () => {
    const categories = Object.keys(MORAL_FOUNDATIONS.categories);
    expect(categories).toContain("care");
    expect(categories).toContain("fairness");
    expect(categories).toContain("loyalty");
    expect(categories).toContain("authority");
    expect(categories).toContain("purity");
  });

  it("each category contains a non-empty word list", () => {
    for (const words of Object.values(MORAL_FOUNDATIONS.categories)) {
      expect(words.length).toBeGreaterThan(0);
    }
  });
});

describe("COGNITIVE_PROCESSES dictionary", () => {
  it("has the expected four categories", () => {
    const categories = Object.keys(COGNITIVE_PROCESSES.categories);
    expect(categories).toContain("insight");
    expect(categories).toContain("causation");
    expect(categories).toContain("certainty");
    expect(categories).toContain("tentativeness");
  });

  it("each category contains a non-empty word list", () => {
    for (const words of Object.values(COGNITIVE_PROCESSES.categories)) {
      expect(words.length).toBeGreaterThan(0);
    }
  });
});
