export interface Code { id: string; name: string; description: string; color: string; parentId?: string; }
export interface Codebook { id: string; name: string; codes: Code[]; createdAt: Date; }
export interface CodeAssignment { id: string; codeId: string; documentId: string; textSpan: { start: number; end: number }; text: string; coderId: string; confidence?: number; isAISuggested: boolean; approved: boolean; }
export interface Memo { id: string; codeId?: string; documentId?: string; content: string; author: string; createdAt: Date; }
export interface InterRaterResult { method: "cohens_kappa" | "krippendorff_alpha"; score: number; agreement: number; expectedAgreement: number; interpretation: string; }
export interface CodingSession { id: string; codebook: Codebook; assignments: CodeAssignment[]; memos: Memo[]; coders: string[]; }
