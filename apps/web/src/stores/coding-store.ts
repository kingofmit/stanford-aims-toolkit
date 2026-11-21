"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Document {
  id: string;
  name: string;
  text: string;
  createdAt: Date;
}

export interface Code {
  id: string;
  name: string;
  description: string;
  color: string;
  parentId?: string;
  shortcut?: number; // 1-9 keyboard shortcut
}

export interface CodedSegment {
  id: string;
  documentId: string;
  codeId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  coderId: string;
  memo?: string;
  createdAt: Date;
}

export interface Memo {
  id: string;
  documentId?: string;
  segmentId?: string;
  codeId?: string;
  content: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface CodingState {
  // Data
  documents: Document[];
  codes: Code[];
  segments: CodedSegment[];
  memos: Memo[];
  coderId: string;

  // UI state
  activeDocumentId: string | null;
  activeCodeId: string | null;
  selectedRange: { start: number; end: number; text: string } | null;
  filterCodeId: string | null; // filter segments panel by code

  // Document actions
  addDocument: (name: string, text: string) => string;
  removeDocument: (id: string) => void;
  setActiveDocument: (id: string | null) => void;

  // Code actions
  addCode: (name: string, description: string, color: string, parentId?: string) => string;
  updateCode: (id: string, updates: Partial<Pick<Code, "name" | "description" | "color" | "parentId" | "shortcut">>) => void;
  removeCode: (id: string) => void;
  setActiveCode: (id: string | null) => void;

  // Segment actions
  addSegment: (documentId: string, codeId: string, startOffset: number, endOffset: number, text: string) => string;
  removeSegment: (id: string) => void;
  updateSegmentMemo: (id: string, memo: string) => void;

  // Selection
  setSelectedRange: (range: { start: number; end: number; text: string } | null) => void;
  applyCodeToSelection: (codeId?: string) => void; // uses activeCodeId if not provided

  // Memo actions
  addMemo: (content: string, opts?: { documentId?: string; segmentId?: string; codeId?: string }) => string;
  removeMemo: (id: string) => void;

  // Filter
  setFilterCodeId: (id: string | null) => void;

  // Computed helpers
  getActiveDocument: () => Document | undefined;
  getDocumentSegments: (documentId: string) => CodedSegment[];
  getCodeSegments: (codeId: string) => CodedSegment[];
  getCodeById: (id: string) => Code | undefined;
  getRootCodes: () => Code[];
  getChildCodes: (parentId: string) => Code[];
  getCodeFrequencies: () => Map<string, number>;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useCodingStore = create<CodingState>((set, get) => ({
  // Initial state
  documents: [],
  codes: [],
  segments: [],
  memos: [],
  coderId: "researcher",
  activeDocumentId: null,
  activeCodeId: null,
  selectedRange: null,
  filterCodeId: null,

  // Document actions
  addDocument: (name, text) => {
    const id = uid();
    set((s) => ({
      documents: [...s.documents, { id, name, text, createdAt: new Date() }],
      activeDocumentId: s.activeDocumentId ?? id,
    }));
    return id;
  },
  removeDocument: (id) =>
    set((s) => ({
      documents: s.documents.filter((d) => d.id !== id),
      segments: s.segments.filter((seg) => seg.documentId !== id),
      activeDocumentId: s.activeDocumentId === id ? (s.documents.find((d) => d.id !== id)?.id ?? null) : s.activeDocumentId,
    })),
  setActiveDocument: (id) => set({ activeDocumentId: id, selectedRange: null }),

  // Code actions
  addCode: (name, description, color, parentId) => {
    const id = uid();
    set((s) => ({
      codes: [...s.codes, { id, name, description, color, parentId }],
    }));
    return id;
  },
  updateCode: (id, updates) =>
    set((s) => ({
      codes: s.codes.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  removeCode: (id) =>
    set((s) => ({
      codes: s.codes.filter((c) => c.id !== id && c.parentId !== id),
      segments: s.segments.filter((seg) => seg.codeId !== id),
      activeCodeId: s.activeCodeId === id ? null : s.activeCodeId,
    })),
  setActiveCode: (id) => set({ activeCodeId: id }),

  // Segment actions
  addSegment: (documentId, codeId, startOffset, endOffset, text) => {
    const id = uid();
    const { coderId } = get();
    set((s) => ({
      segments: [...s.segments, { id, documentId, codeId, startOffset, endOffset, text, coderId, createdAt: new Date() }],
    }));
    return id;
  },
  removeSegment: (id) =>
    set((s) => ({ segments: s.segments.filter((seg) => seg.id !== id) })),
  updateSegmentMemo: (id, memo) =>
    set((s) => ({
      segments: s.segments.map((seg) => (seg.id === id ? { ...seg, memo } : seg)),
    })),

  // Selection
  setSelectedRange: (range) => set({ selectedRange: range }),
  applyCodeToSelection: (codeId) => {
    const { selectedRange, activeDocumentId, activeCodeId } = get();
    const resolvedCode = codeId ?? activeCodeId;
    if (!selectedRange || !activeDocumentId || !resolvedCode) return;

    // Check for duplicate: same doc, same code, same range
    const { segments } = get();
    const dup = segments.find(
      (s) =>
        s.documentId === activeDocumentId &&
        s.codeId === resolvedCode &&
        s.startOffset === selectedRange.start &&
        s.endOffset === selectedRange.end,
    );
    if (dup) return;

    get().addSegment(activeDocumentId, resolvedCode, selectedRange.start, selectedRange.end, selectedRange.text);
    set({ selectedRange: null });
  },

  // Memo actions
  addMemo: (content, opts) => {
    const id = uid();
    set((s) => ({
      memos: [...s.memos, { id, content, createdAt: new Date(), ...opts }],
    }));
    return id;
  },
  removeMemo: (id) =>
    set((s) => ({ memos: s.memos.filter((m) => m.id !== id) })),

  // Filter
  setFilterCodeId: (id) => set({ filterCodeId: id }),

  // Computed helpers
  getActiveDocument: () => {
    const { documents, activeDocumentId } = get();
    return documents.find((d) => d.id === activeDocumentId);
  },
  getDocumentSegments: (documentId) => get().segments.filter((s) => s.documentId === documentId),
  getCodeSegments: (codeId) => get().segments.filter((s) => s.codeId === codeId),
  getCodeById: (id) => get().codes.find((c) => c.id === id),
  getRootCodes: () => get().codes.filter((c) => !c.parentId),
  getChildCodes: (parentId) => get().codes.filter((c) => c.parentId === parentId),
  getCodeFrequencies: () => {
    const freq = new Map<string, number>();
    for (const s of get().segments) {
      freq.set(s.codeId, (freq.get(s.codeId) ?? 0) + 1);
    }
    return freq;
  },
}));

// ---------------------------------------------------------------------------
// Default color palette for new codes
// ---------------------------------------------------------------------------

export const CODE_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#6366f1", // indigo
  "#10b981", // emerald
];
