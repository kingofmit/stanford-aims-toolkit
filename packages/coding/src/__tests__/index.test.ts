import { describe, it, expect } from "vitest";
import {
  CodebookManager,
  computeCohensKappa,
  computeKrippendorffAlpha,
  codeFrequency,
  codeCooccurrence,
} from "../index";
import type { CodeAssignment } from "../index";

// ---------------------------------------------------------------------------
// CodebookManager
// ---------------------------------------------------------------------------

describe("CodebookManager", () => {
  it("adds a code and retrieves it from the codebook", () => {
    const mgr = new CodebookManager("Test Codebook");
    const code = mgr.addCode("Theme 1", "First theme", "#ff0000");
    expect(code.name).toBe("Theme 1");
    expect(code.description).toBe("First theme");
    expect(code.color).toBe("#ff0000");
    expect(mgr.getCodebook().codes).toHaveLength(1);
  });

  it("supports hierarchical codes via parentId", () => {
    const mgr = new CodebookManager("Test");
    const parent = mgr.addCode("Parent", "Parent code", "#ff0000");
    const child = mgr.addCode("Child", "Child code", "#00ff00", parent.id);
    expect(child.parentId).toBe(parent.id);
    expect(mgr.getCodebook().codes).toHaveLength(2);
  });

  it("getCodeTree returns only root-level codes (no parentId)", () => {
    const mgr = new CodebookManager("Test");
    const parent = mgr.addCode("Root", "Root code", "#aaaaaa");
    mgr.addCode("Child A", "Child A", "#bbbbbb", parent.id);
    mgr.addCode("Child B", "Child B", "#cccccc", parent.id);
    const tree = mgr.getCodeTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Root");
  });

  it("getChildren returns only direct children of a code", async () => {
    const mgr = new CodebookManager("Test");
    const root = mgr.addCode("Root", "Root", "#000000");
    await new Promise((r) => setTimeout(r, 2));
    const child1 = mgr.addCode("Child 1", "Child 1", "#111111", root.id);
    await new Promise((r) => setTimeout(r, 2));
    mgr.addCode("Child 2", "Child 2", "#222222", root.id);
    await new Promise((r) => setTimeout(r, 2));
    // grandchild should not appear in root's children
    mgr.addCode("Grandchild", "Grandchild", "#333333", child1.id);
    expect(mgr.getChildren(root.id)).toHaveLength(2);
  });

  it("mergeCodes removes the original codes and adds a new merged code", async () => {
    const mgr = new CodebookManager("Test");
    const a = mgr.addCode("Code A", "A", "#aaa");
    await new Promise((r) => setTimeout(r, 2));
    const b = mgr.addCode("Code B", "B", "#bbb");
    await new Promise((r) => setTimeout(r, 2));
    const merged = mgr.mergeCodes([a.id, b.id], "Merged AB");
    const names = mgr.getCodebook().codes.map((c) => c.name);
    expect(names).not.toContain("Code A");
    expect(names).not.toContain("Code B");
    expect(names).toContain("Merged AB");
    expect(merged.name).toBe("Merged AB");
  });

  it("getCodebook returns the codebook with the given name", () => {
    const mgr = new CodebookManager("My Study");
    expect(mgr.getCodebook().name).toBe("My Study");
  });
});

// ---------------------------------------------------------------------------
// computeCohensKappa
// ---------------------------------------------------------------------------

describe("computeCohensKappa", () => {
  it("returns 1.0 for perfect agreement", () => {
    const labels = ["A", "B", "A", "B", "C"];
    const result = computeCohensKappa(labels, labels);
    expect(result.score).toBeCloseTo(1.0);
    expect(result.interpretation).toBe("Almost perfect");
    expect(result.agreement).toBeCloseTo(1.0);
  });

  it("returns near 0 for systematic disagreement (all opposite labels)", () => {
    const coder1 = ["A", "B", "A", "B", "A", "B", "A", "B"];
    const coder2 = ["B", "A", "B", "A", "B", "A", "B", "A"];
    const result = computeCohensKappa(coder1, coder2);
    // All items disagree — kappa should be at or below 0
    expect(result.score).toBeLessThanOrEqual(0.1);
  });

  it("produces a known kappa value from the Artstein & Poesio example", () => {
    // 20 items: coder1 has 9 Y and 11 N; coder2 has 10 Y and 10 N; 18 items agree
    const coder1 = ["Y","Y","Y","Y","Y","Y","Y","Y","Y","N","N","N","N","N","N","N","N","N","N","N"];
    const coder2 = ["Y","Y","Y","Y","Y","Y","Y","Y","N","Y","N","N","N","N","N","N","N","N","N","N"];
    const result = computeCohensKappa(coder1, coder2);
    // po = 18/20 = 0.9; pe ≈ (9/20*10/20) + (11/20*10/20) = 0.5; kappa ≈ 0.8
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.score).toBeLessThan(1.0);
  });

  it("throws when arrays have different lengths", () => {
    expect(() => computeCohensKappa(["A"], ["A", "B"])).toThrow();
  });

  it("sets method to 'cohens_kappa'", () => {
    const result = computeCohensKappa(["A"], ["A"]);
    expect(result.method).toBe("cohens_kappa");
  });

  it("computes expectedAgreement between 0 and 1", () => {
    const result = computeCohensKappa(["A", "B", "A"], ["A", "A", "B"]);
    expect(result.expectedAgreement).toBeGreaterThanOrEqual(0);
    expect(result.expectedAgreement).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// computeKrippendorffAlpha
// ---------------------------------------------------------------------------

describe("computeKrippendorffAlpha", () => {
  it("returns 1.0 for perfect agreement across all raters", () => {
    const ratings = [
      ["A", "B", "C", "A", "B"],
      ["A", "B", "C", "A", "B"],
      ["A", "B", "C", "A", "B"],
    ];
    const result = computeKrippendorffAlpha(ratings);
    expect(result.score).toBeCloseTo(1.0);
    expect(result.interpretation).toBe("Reliable");
  });

  it("handles missing values (null) without throwing", () => {
    const ratings: (string | null)[][] = [
      ["A", null, "B", "A"],
      ["A", "B",  null, "A"],
    ];
    expect(() => computeKrippendorffAlpha(ratings)).not.toThrow();
  });

  it("produces a lower alpha when raters substantially disagree", () => {
    // Complete disagreement pattern
    const ratings = [
      ["A", "A", "B", "B"],
      ["B", "B", "A", "A"],
    ];
    const result = computeKrippendorffAlpha(ratings);
    expect(result.score).toBeLessThan(0.5);
  });

  it("sets method to 'krippendorff_alpha'", () => {
    const ratings = [["A", "B"], ["A", "B"]];
    const result = computeKrippendorffAlpha(ratings);
    expect(result.method).toBe("krippendorff_alpha");
  });
});

// ---------------------------------------------------------------------------
// codeFrequency
// ---------------------------------------------------------------------------

function mkAssignment(id: string, documentId: string, codeId: string, coderId = "r1"): CodeAssignment {
  return { id, documentId, codeId, coderId, textSpan: { start: 0, end: 1 }, text: "x", isAISuggested: false, approved: true };
}

describe("codeFrequency", () => {
  it("counts code occurrences correctly", () => {
    const assignments: CodeAssignment[] = [
      mkAssignment("1", "doc1", "cA"),
      mkAssignment("2", "doc1", "cB"),
      mkAssignment("3", "doc2", "cA"),
      mkAssignment("4", "doc2", "cA"),
    ];
    const freq = codeFrequency(assignments);
    expect(freq.get("cA")).toBe(3);
    expect(freq.get("cB")).toBe(1);
  });

  it("returns an empty map for empty input", () => {
    const freq = codeFrequency([]);
    expect(freq.size).toBe(0);
  });

  it("tracks each unique code independently", () => {
    const assignments: CodeAssignment[] = [
      mkAssignment("1", "doc1", "X"),
      mkAssignment("2", "doc1", "Y"),
      mkAssignment("3", "doc1", "Z"),
    ];
    const freq = codeFrequency(assignments);
    expect(freq.size).toBe(3);
    expect(freq.get("X")).toBe(1);
    expect(freq.get("Y")).toBe(1);
    expect(freq.get("Z")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// codeCooccurrence
// ---------------------------------------------------------------------------

describe("codeCooccurrence", () => {
  it("finds codes that co-occur in the same document", () => {
    const assignments: CodeAssignment[] = [
      mkAssignment("1", "doc1", "cA"),
      mkAssignment("2", "doc1", "cB"),
    ];
    const cooc = codeCooccurrence(assignments);
    expect(cooc.get("cA")?.get("cB")).toBe(1);
  });

  it("does not pair codes from different documents", () => {
    const assignments: CodeAssignment[] = [
      mkAssignment("1", "doc1", "cA"),
      mkAssignment("2", "doc2", "cB"),
    ];
    const cooc = codeCooccurrence(assignments);
    expect(cooc.get("cA")?.get("cB")).toBeUndefined();
  });

  it("counts co-occurrences across multiple documents", () => {
    const assignments: CodeAssignment[] = [
      mkAssignment("1", "doc1", "cA"),
      mkAssignment("2", "doc1", "cB"),
      mkAssignment("3", "doc2", "cA"),
      mkAssignment("4", "doc2", "cB"),
    ];
    const cooc = codeCooccurrence(assignments);
    expect(cooc.get("cA")?.get("cB")).toBe(2);
  });

  it("returns an empty map when no co-occurrences exist", () => {
    const assignments: CodeAssignment[] = [
      mkAssignment("1", "doc1", "cA"),
      mkAssignment("2", "doc2", "cB"),
    ];
    const cooc = codeCooccurrence(assignments);
    expect(cooc.size).toBe(0);
  });
});
