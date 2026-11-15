export * from "./types";
import type { Code, Codebook, CodeAssignment, InterRaterResult, Memo, CodingSession } from "./types";

export class CodebookManager {
  private codebook: Codebook;

  constructor(name: string) {
    this.codebook = { id: crypto.randomUUID?.() ?? String(Date.now()), name, codes: [], createdAt: new Date() };
  }

  addCode(name: string, description: string, color: string, parentId?: string): Code {
    const code: Code = { id: String(Date.now()), name, description, color, parentId };
    this.codebook.codes.push(code);
    return code;
  }

  mergeCodes(codeIds: string[], newName: string): Code {
    const merged = this.addCode(newName, `Merged from ${codeIds.length} codes`, "#888");
    this.codebook.codes = this.codebook.codes.filter((c) => !codeIds.includes(c.id));
    return merged;
  }

  getCodebook(): Codebook { return this.codebook; }
  getCodeTree(): Code[] { return this.codebook.codes.filter((c) => !c.parentId); }
  getChildren(codeId: string): Code[] { return this.codebook.codes.filter((c) => c.parentId === codeId); }
}

export function computeCohensKappa(coder1: string[], coder2: string[]): InterRaterResult {
  if (coder1.length !== coder2.length) throw new Error("Arrays must be same length");
  const n = coder1.length;
  const categories = [...new Set([...coder1, ...coder2])];

  let agreement = 0;
  for (let i = 0; i < n; i++) { if (coder1[i] === coder2[i]) agreement++; }
  const po = agreement / n;

  let pe = 0;
  for (const cat of categories) {
    const p1 = coder1.filter((c) => c === cat).length / n;
    const p2 = coder2.filter((c) => c === cat).length / n;
    pe += p1 * p2;
  }

  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);
  const interpretation = kappa > 0.8 ? "Almost perfect" : kappa > 0.6 ? "Substantial" : kappa > 0.4 ? "Moderate" : kappa > 0.2 ? "Fair" : "Slight";

  return { method: "cohens_kappa", score: kappa, agreement: po, expectedAgreement: pe, interpretation };
}

export function computeKrippendorffAlpha(ratings: (string | null)[][]): InterRaterResult {
  const allValues: string[] = [];
  for (const rater of ratings) for (const v of rater) if (v !== null) allValues.push(v);
  const categories = [...new Set(allValues)];
  const n = ratings[0]?.length ?? 0;
  const m = ratings.length;

  let Do = 0, De = 0, pairs = 0;
  for (let i = 0; i < n; i++) {
    const values = ratings.map((r) => r[i]).filter((v): v is string => v !== null);
    if (values.length < 2) continue;
    for (let a = 0; a < values.length; a++) {
      for (let b = a + 1; b < values.length; b++) {
        Do += values[a] !== values[b] ? 1 : 0;
        pairs++;
      }
    }
  }
  Do = pairs > 0 ? Do / pairs : 0;

  const freq = new Map<string, number>();
  for (const v of allValues) freq.set(v, (freq.get(v) ?? 0) + 1);
  const total = allValues.length;
  let dePairs = 0;
  for (const c1 of categories) {
    for (const c2 of categories) {
      if (c1 !== c2) dePairs += (freq.get(c1) ?? 0) * (freq.get(c2) ?? 0);
    }
  }
  De = dePairs / (total * (total - 1) || 1);

  const alpha = De === 0 ? 1 : 1 - Do / De;
  const interpretation = alpha > 0.8 ? "Reliable" : alpha > 0.67 ? "Tentatively reliable" : "Unreliable";

  return { method: "krippendorff_alpha", score: alpha, agreement: 1 - Do, expectedAgreement: 1 - De, interpretation };
}

export function codeFrequency(assignments: CodeAssignment[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const a of assignments) freq.set(a.codeId, (freq.get(a.codeId) ?? 0) + 1);
  return freq;
}

export function codeCooccurrence(assignments: CodeAssignment[]): Map<string, Map<string, number>> {
  const byDoc = new Map<string, string[]>();
  for (const a of assignments) {
    const codes = byDoc.get(a.documentId) ?? [];
    codes.push(a.codeId);
    byDoc.set(a.documentId, codes);
  }
  const cooc = new Map<string, Map<string, number>>();
  for (const codes of byDoc.values()) {
    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        if (!cooc.has(codes[i])) cooc.set(codes[i], new Map());
        const inner = cooc.get(codes[i])!;
        inner.set(codes[j], (inner.get(codes[j]) ?? 0) + 1);
      }
    }
  }
  return cooc;
}
