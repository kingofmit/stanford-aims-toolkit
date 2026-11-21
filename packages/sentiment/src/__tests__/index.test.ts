import { describe, it, expect } from "vitest";
import {
  analyzeSentiment,
  vaderSentiment,
  detectEmotions,
  aspectSentiment,
  temporalSentiment,
} from "../index";

// ---------------------------------------------------------------------------
// analyzeSentiment
// ---------------------------------------------------------------------------

describe("analyzeSentiment", () => {
  it("scores positive text as positive", () => {
    const result = analyzeSentiment("I love this wonderful amazing product");
    expect(result.score).toBeGreaterThan(0);
    expect(result.positive.length).toBeGreaterThan(0);
  });

  it("scores negative text as negative", () => {
    const result = analyzeSentiment("This is terrible awful horrible");
    expect(result.score).toBeLessThan(0);
    expect(result.negative.length).toBeGreaterThan(0);
  });

  it("scores neutral text near zero", () => {
    // Plain neutral words — most are unrecognized by AFINN or score near 0
    const result = analyzeSentiment("the cat sat on the mat");
    expect(Math.abs(result.score)).toBeLessThan(2);
  });

  it("handles empty text", () => {
    const result = analyzeSentiment("");
    expect(result.score).toBe(0);
    expect(result.comparative).toBe(0);
  });

  it("negation: 'not good' scores negative", () => {
    // "good" = 3; negated → -(3)*0.5 = -1.5
    const result = analyzeSentiment("not good");
    expect(result.score).toBeLessThan(0);
  });

  it("negation: 'not bad' scores positive (double negation flip)", () => {
    const result = analyzeSentiment("not bad");
    // bad = -3; negated → -(-3)*0.5 = +1.5
    expect(result.score).toBeGreaterThan(0);
  });

  it("mixed sentiment text has both positive and negative tokens", () => {
    const result = analyzeSentiment("I love the food but the service was terrible");
    expect(result.positive.length).toBeGreaterThan(0);
    expect(result.negative.length).toBeGreaterThan(0);
  });

  it("comparative is score divided by token count", () => {
    const result = analyzeSentiment("great");
    expect(result.comparative).toBeCloseTo(result.score / result.tokens.length, 5);
  });

  it("positive array contains only tokens that contributed positively", () => {
    const result = analyzeSentiment("love hate");
    expect(result.positive).toContain("love");
    expect(result.positive).not.toContain("hate");
  });

  it("negative array contains only tokens that contributed negatively", () => {
    const result = analyzeSentiment("love hate");
    expect(result.negative).toContain("hate");
    expect(result.negative).not.toContain("love");
  });
});

// ---------------------------------------------------------------------------
// vaderSentiment
// ---------------------------------------------------------------------------

describe("vaderSentiment", () => {
  it("compound score is in [-1, 1] range for positive text", () => {
    const result = vaderSentiment("This is absolutely wonderful and amazing!");
    expect(result.compound).toBeGreaterThanOrEqual(-1);
    expect(result.compound).toBeLessThanOrEqual(1);
  });

  it("compound score is in [-1, 1] range for negative text", () => {
    const result = vaderSentiment("This is horrible and terrible and awful.");
    expect(result.compound).toBeGreaterThanOrEqual(-1);
    expect(result.compound).toBeLessThanOrEqual(1);
  });

  it("ALL CAPS boost: GREAT scores higher compound than great", () => {
    const upper = vaderSentiment("GREAT");
    const lower = vaderSentiment("great");
    expect(upper.compound).toBeGreaterThan(lower.compound);
  });

  it("exclamation boost: 'Great!' scores higher compound than 'Great'", () => {
    const withBang = vaderSentiment("Great!");
    const without = vaderSentiment("Great");
    expect(withBang.compound).toBeGreaterThan(without.compound);
  });

  it("degree modifier: 'very good' scores higher compound than 'good'", () => {
    const withModifier = vaderSentiment("very good");
    const withoutModifier = vaderSentiment("good");
    expect(withModifier.compound).toBeGreaterThan(withoutModifier.compound);
  });

  it("'but' clause: after-but segment dominates final score", () => {
    // "good but bad" — before-but gets 0.5x weight, after-but gets 1.5x
    // so the negative after-but should win
    const result = vaderSentiment("good but bad");
    expect(result.compound).toBeLessThan(0);
  });

  it("proportions (positive + negative + neutral) sum to approximately 1.0", () => {
    const result = vaderSentiment("I really love this but it has some problems");
    const total = result.positive + result.negative + result.neutral;
    expect(total).toBeCloseTo(1.0, 1);
  });

  it("empty text returns compound 0 and zero proportions", () => {
    const result = vaderSentiment("");
    expect(result.compound).toBe(0);
    expect(result.positive).toBe(0);
    expect(result.negative).toBe(0);
    expect(result.neutral).toBe(0);
  });

  it("purely negative text has negative compound", () => {
    const result = vaderSentiment("terrible horrible awful disaster");
    expect(result.compound).toBeLessThan(0);
  });

  it("purely positive text has positive compound", () => {
    const result = vaderSentiment("wonderful fantastic amazing great");
    expect(result.compound).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// detectEmotions
// ---------------------------------------------------------------------------

describe("detectEmotions", () => {
  it("happy text has highest joy score", () => {
    const result = detectEmotions("I am so happy and delighted and joyful today");
    expect(result.joy).toBe(1); // normalized to max=1
    expect(result.joy).toBeGreaterThan(result.anger);
    expect(result.joy).toBeGreaterThan(result.sadness);
    expect(result.joy).toBeGreaterThan(result.fear);
  });

  it("angry text has highest anger score", () => {
    const result = detectEmotions("I am furious and outraged and angry and hostile");
    expect(result.anger).toBe(1);
    expect(result.anger).toBeGreaterThan(result.joy);
    expect(result.anger).toBeGreaterThan(result.sadness);
  });

  it("fearful text has highest fear score", () => {
    const result = detectEmotions("I am afraid and terrified and scared and panicking");
    expect(result.fear).toBe(1);
    expect(result.fear).toBeGreaterThan(result.joy);
    expect(result.fear).toBeGreaterThan(result.anger);
  });

  it("all emotion scores are in [0, 1] range", () => {
    const result = detectEmotions("I love this but it also makes me sad and angry");
    for (const val of Object.values(result)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it("empty text returns all zero emotions", () => {
    const result = detectEmotions("");
    expect(result.joy).toBe(0);
    expect(result.sadness).toBe(0);
    expect(result.anger).toBe(0);
    expect(result.fear).toBe(0);
    expect(result.surprise).toBe(0);
    expect(result.disgust).toBe(0);
  });

  it("sad text has highest sadness score", () => {
    const result = detectEmotions("I feel so sad and unhappy and depressed and miserable");
    expect(result.sadness).toBe(1);
    expect(result.sadness).toBeGreaterThan(result.anger);
  });
});

// ---------------------------------------------------------------------------
// aspectSentiment
// ---------------------------------------------------------------------------

describe("aspectSentiment", () => {
  it("finds correct positive sentiment for a mentioned aspect", () => {
    const text = "The food was excellent. The service was terrible.";
    const result = aspectSentiment(text, ["food"]);
    expect(result[0].score).toBeGreaterThan(0);
  });

  it("finds correct negative sentiment for a mentioned aspect", () => {
    const text = "The food was excellent. The service was terrible.";
    const result = aspectSentiment(text, ["service"]);
    expect(result[0].score).toBeLessThan(0);
  });

  it("returns score 0 for an unmentioned aspect", () => {
    const text = "The food was excellent. The service was terrible.";
    const result = aspectSentiment(text, ["price"]);
    expect(result[0].score).toBe(0);
    expect(result[0].comparative).toBe(0);
  });

  it("handles multiple aspects in one call", () => {
    const text = "The food was excellent. The service was terrible.";
    const result = aspectSentiment(text, ["food", "service", "price"]);
    expect(result).toHaveLength(3);
    const food = result.find((r) => r.aspect === "food")!;
    const service = result.find((r) => r.aspect === "service")!;
    const price = result.find((r) => r.aspect === "price")!;
    expect(food.score).toBeGreaterThan(0);
    expect(service.score).toBeLessThan(0);
    expect(price.score).toBe(0);
  });

  it("context is non-empty string when aspect is found", () => {
    const text = "The product was amazing and wonderful.";
    const result = aspectSentiment(text, ["product"]);
    expect(result[0].context.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// temporalSentiment
// ---------------------------------------------------------------------------

describe("temporalSentiment", () => {
  it("groups entries by date correctly", () => {
    const entries = [
      { date: "2026-01-01", text: "great day" },
      { date: "2026-01-01", text: "wonderful morning" },
      { date: "2026-01-02", text: "terrible evening" },
    ];
    const result = temporalSentiment(entries);
    expect(result).toHaveLength(2);
    const jan1 = result.find((r) => r.date === "2026-01-01")!;
    expect(jan1.count).toBe(2);
  });

  it("returns results sorted by date ascending", () => {
    const entries = [
      { date: "2026-03-01", text: "good" },
      { date: "2026-01-01", text: "great" },
      { date: "2026-02-01", text: "nice" },
    ];
    const result = temporalSentiment(entries);
    expect(result[0].date).toBe("2026-01-01");
    expect(result[1].date).toBe("2026-02-01");
    expect(result[2].date).toBe("2026-03-01");
  });

  it("positive text produces positive score for that date", () => {
    const entries = [{ date: "2026-05-01", text: "wonderful fantastic amazing" }];
    const result = temporalSentiment(entries);
    expect(result[0].score).toBeGreaterThan(0);
  });

  it("negative text produces negative score for that date", () => {
    const entries = [{ date: "2026-05-01", text: "terrible horrible awful" }];
    const result = temporalSentiment(entries);
    expect(result[0].score).toBeLessThan(0);
  });

  it("empty entries array returns empty array", () => {
    const result = temporalSentiment([]);
    expect(result).toHaveLength(0);
  });

  it("averaged score for a date reflects combined texts", () => {
    const entries = [
      { date: "2026-06-01", text: "great" },   // score 3
      { date: "2026-06-01", text: "terrible" }, // score -3
    ];
    const result = temporalSentiment(entries);
    // average of 3 and -3 = 0
    expect(result[0].score).toBeCloseTo(0, 1);
  });
});
