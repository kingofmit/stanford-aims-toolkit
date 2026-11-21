"use client";

import { useState } from "react";
import {
  MessageSquare,
  Hash,
  Trash2,
  Pencil,
  Filter,
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
  Plus,
} from "lucide-react";
import { useCodingStore } from "@/stores/coding-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function truncate(text: string, max = 100): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\u2026";
}

// ---------------------------------------------------------------------------
// SegmentPanel
// ---------------------------------------------------------------------------

export function SegmentPanel() {
  const [tab, setTab] = useState<"segments" | "memos">("segments");
  const [memoInput, setMemoInput] = useState("");
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingMemoText, setEditingMemoText] = useState("");
  const [statsOpen, setStatsOpen] = useState(false);

  const documents = useCodingStore((s) => s.documents);
  const codes = useCodingStore((s) => s.codes);
  const segments = useCodingStore((s) => s.segments);
  const memos = useCodingStore((s) => s.memos);
  const filterCodeId = useCodingStore((s) => s.filterCodeId);
  const activeDocumentId = useCodingStore((s) => s.activeDocumentId);

  const setFilterCodeId = useCodingStore((s) => s.setFilterCodeId);
  const setActiveDocument = useCodingStore((s) => s.setActiveDocument);
  const removeSegment = useCodingStore((s) => s.removeSegment);
  const updateSegmentMemo = useCodingStore((s) => s.updateSegmentMemo);
  const addMemo = useCodingStore((s) => s.addMemo);
  const removeMemo = useCodingStore((s) => s.removeMemo);
  const getCodeById = useCodingStore((s) => s.getCodeById);
  const getCodeFrequencies = useCodingStore((s) => s.getCodeFrequencies);

  // Derived data
  const filteredSegments = filterCodeId
    ? segments.filter((s) => s.codeId === filterCodeId)
    : segments;

  const filterCode = filterCodeId ? getCodeById(filterCodeId) : undefined;

  const docMap = new Map(documents.map((d) => [d.id, d]));
  const codeMap = new Map(codes.map((c) => [c.id, c]));

  // Stats
  const codeFrequencies = getCodeFrequencies();
  const codedDocIds = new Set(segments.map((s) => s.documentId));
  const sortedFrequencies = Array.from(codeFrequencies.entries())
    .map(([codeId, count]) => ({ code: codeMap.get(codeId), count }))
    .filter((f) => f.code)
    .sort((a, b) => b.count - a.count);
  const maxFrequency = sortedFrequencies.length > 0 ? sortedFrequencies[0].count : 1;

  // Handlers
  function handleSegmentClick(segment: (typeof segments)[0]) {
    if (segment.documentId !== activeDocumentId) {
      setActiveDocument(segment.documentId);
    }
    // The transcript panel can listen for a highlighted segment via store if
    // extended later; for now switching the active document is the primary action.
  }

  function handleSegmentMemoSave(segmentId: string, text: string) {
    updateSegmentMemo(segmentId, text);
    setEditingMemoId(null);
    setEditingMemoText("");
  }

  function handleAddMemo() {
    const trimmed = memoInput.trim();
    if (!trimmed) return;
    addMemo(trimmed, { documentId: activeDocumentId ?? undefined });
    setMemoInput("");
  }

  return (
    <div className="flex h-full flex-col" style={{ color: "var(--foreground)" }}>
      {/* ---- Tab bar ---- */}
      <div
        className="flex border-b text-sm font-medium"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setTab("segments")}
          className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 transition-colors"
          style={{
            borderBottom: tab === "segments" ? "2px solid var(--foreground)" : "2px solid transparent",
            color: tab === "segments" ? "var(--foreground)" : "var(--muted)",
          }}
        >
          <Hash size={14} />
          Segments
        </button>
        <button
          onClick={() => setTab("memos")}
          className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 transition-colors"
          style={{
            borderBottom: tab === "memos" ? "2px solid var(--foreground)" : "2px solid transparent",
            color: tab === "memos" ? "var(--foreground)" : "var(--muted)",
          }}
        >
          <MessageSquare size={14} />
          Memos
        </button>
      </div>

      {/* ---- Tab content ---- */}
      <div className="flex-1 overflow-y-auto">
        {tab === "segments" ? (
          <SegmentsTab
            segments={filteredSegments}
            codes={codes}
            codeMap={codeMap}
            docMap={docMap}
            filterCodeId={filterCodeId}
            filterCode={filterCode}
            totalSegments={segments.length}
            setFilterCodeId={setFilterCodeId}
            onSegmentClick={handleSegmentClick}
            removeSegment={removeSegment}
            editingMemoId={editingMemoId}
            editingMemoText={editingMemoText}
            setEditingMemoId={setEditingMemoId}
            setEditingMemoText={setEditingMemoText}
            onSegmentMemoSave={handleSegmentMemoSave}
          />
        ) : (
          <MemosTab
            memos={memos}
            docMap={docMap}
            memoInput={memoInput}
            setMemoInput={setMemoInput}
            onAddMemo={handleAddMemo}
            removeMemo={removeMemo}
          />
        )}
      </div>

      {/* ---- Coding stats (always visible at bottom) ---- */}
      <div
        className="border-t text-xs"
        style={{ borderColor: "var(--border)", background: "var(--background)" }}
      >
        <button
          onClick={() => setStatsOpen(!statsOpen)}
          className="flex w-full items-center gap-1.5 px-3 py-2 font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--foreground)" }}
        >
          {statsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <BarChart3 size={12} />
          Coding Stats
        </button>

        {statsOpen && (
          <div className="space-y-2 px-3 pb-3">
            <div className="flex justify-between" style={{ color: "var(--muted)" }}>
              <span>Total segments</span>
              <span style={{ color: "var(--foreground)" }}>{segments.length}</span>
            </div>
            <div className="flex justify-between" style={{ color: "var(--muted)" }}>
              <span>Codes used</span>
              <span style={{ color: "var(--foreground)" }}>{codeFrequencies.size}</span>
            </div>
            <div className="flex justify-between" style={{ color: "var(--muted)" }}>
              <span>Documents coded</span>
              <span style={{ color: "var(--foreground)" }}>
                {codedDocIds.size} of {documents.length}
              </span>
            </div>

            {sortedFrequencies.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <span className="font-medium" style={{ color: "var(--muted)" }}>
                  Code frequencies
                </span>
                {sortedFrequencies.map(({ code, count }) => (
                  <div key={code!.id} className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: code!.color }}
                    />
                    <span className="flex-1 truncate" style={{ color: "var(--foreground)" }}>
                      {code!.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.max((count / maxFrequency) * 48, 4)}px`,
                          backgroundColor: code!.color,
                        }}
                      />
                      <span style={{ color: "var(--muted)" }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SegmentsTab
// ---------------------------------------------------------------------------

interface SegmentsTabProps {
  segments: ReturnType<typeof useCodingStore.getState>["segments"];
  codes: ReturnType<typeof useCodingStore.getState>["codes"];
  codeMap: Map<string, ReturnType<typeof useCodingStore.getState>["codes"][0]>;
  docMap: Map<string, ReturnType<typeof useCodingStore.getState>["documents"][0]>;
  filterCodeId: string | null;
  filterCode: ReturnType<typeof useCodingStore.getState>["codes"][0] | undefined;
  totalSegments: number;
  setFilterCodeId: (id: string | null) => void;
  onSegmentClick: (segment: ReturnType<typeof useCodingStore.getState>["segments"][0]) => void;
  removeSegment: (id: string) => void;
  editingMemoId: string | null;
  editingMemoText: string;
  setEditingMemoId: (id: string | null) => void;
  setEditingMemoText: (text: string) => void;
  onSegmentMemoSave: (segmentId: string, text: string) => void;
}

function SegmentsTab({
  segments,
  codes,
  codeMap,
  docMap,
  filterCodeId,
  filterCode,
  totalSegments,
  setFilterCodeId,
  onSegmentClick,
  removeSegment,
  editingMemoId,
  editingMemoText,
  setEditingMemoId,
  setEditingMemoText,
  onSegmentMemoSave,
}: SegmentsTabProps) {
  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: "var(--border)" }}
      >
        <Filter size={12} style={{ color: "var(--muted)" }} />
        <select
          value={filterCodeId ?? ""}
          onChange={(e) => setFilterCodeId(e.target.value || null)}
          className="flex-1 rounded border px-2 py-1 text-xs"
          style={{
            borderColor: "var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          <option value="">All codes</option>
          {codes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="shrink-0 text-xs" style={{ color: "var(--muted)" }}>
          {segments.length} segment{segments.length !== 1 ? "s" : ""}
          {filterCode ? ` with \u2018${filterCode.name}\u2019` : ""}
        </span>
      </div>

      {/* Segment list */}
      {segments.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs" style={{ color: "var(--muted)" }}>
          {totalSegments === 0
            ? "No coded segments yet. Select text in a transcript and click a code to start."
            : "No segments match this filter."}
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {segments.map((seg) => {
            const code = codeMap.get(seg.codeId);
            const doc = docMap.get(seg.documentId);
            const isEditingMemo = editingMemoId === seg.id;

            return (
              <div
                key={seg.id}
                onClick={() => onSegmentClick(seg)}
                className="group relative cursor-pointer overflow-hidden rounded-md border transition-colors hover:opacity-90"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--background)",
                }}
              >
                {/* Color bar */}
                <div
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: code?.color ?? "#888" }}
                />

                <div className="py-2 pl-3.5 pr-2">
                  {/* Code badge + remove button */}
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: (code?.color ?? "#888") + "1a",
                        color: code?.color ?? "#888",
                      }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: code?.color ?? "#888" }}
                      />
                      {code?.name ?? "Unknown"}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSegment(seg.id);
                      }}
                      className="hidden rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:inline-flex"
                      title="Remove segment"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Segment text */}
                  <p className="text-xs leading-relaxed" style={{ color: "var(--foreground)" }}>
                    &ldquo;{truncate(seg.text)}&rdquo;
                  </p>

                  {/* Segment memo */}
                  {isEditingMemo ? (
                    <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        autoFocus
                        value={editingMemoText}
                        onChange={(e) => setEditingMemoText(e.target.value)}
                        onBlur={() => onSegmentMemoSave(seg.id, editingMemoText)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSegmentMemoSave(seg.id, editingMemoText);
                          }
                        }}
                        className="w-full resize-none rounded border px-2 py-1 text-xs"
                        style={{
                          borderColor: "var(--border)",
                          background: "var(--background)",
                          color: "var(--foreground)",
                        }}
                        rows={2}
                        placeholder="Write a memo for this segment..."
                      />
                    </div>
                  ) : seg.memo ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMemoId(seg.id);
                        setEditingMemoText(seg.memo ?? "");
                      }}
                      className="mt-1.5 flex items-start gap-1 text-left text-[11px] leading-snug"
                      style={{ color: "var(--muted)" }}
                    >
                      <Pencil size={10} className="mt-0.5 shrink-0" />
                      <span>{seg.memo}</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMemoId(seg.id);
                        setEditingMemoText("");
                      }}
                      className="mt-1 hidden items-center gap-1 text-[10px] group-hover:inline-flex"
                      style={{ color: "var(--muted)" }}
                    >
                      <Plus size={10} />
                      Add memo
                    </button>
                  )}

                  {/* Document name */}
                  {doc && (
                    <div
                      className="mt-1.5 flex items-center gap-1 text-[10px]"
                      style={{ color: "var(--muted)" }}
                    >
                      <FileText size={10} />
                      {doc.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MemosTab
// ---------------------------------------------------------------------------

interface MemosTabProps {
  memos: ReturnType<typeof useCodingStore.getState>["memos"];
  docMap: Map<string, ReturnType<typeof useCodingStore.getState>["documents"][0]>;
  memoInput: string;
  setMemoInput: (val: string) => void;
  onAddMemo: () => void;
  removeMemo: (id: string) => void;
}

function MemosTab({ memos, docMap, memoInput, setMemoInput, onAddMemo, removeMemo }: MemosTabProps) {
  return (
    <div className="flex flex-col">
      {/* Add memo form */}
      <div className="border-b p-3" style={{ borderColor: "var(--border)" }}>
        <textarea
          value={memoInput}
          onChange={(e) => setMemoInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onAddMemo();
            }
          }}
          className="w-full resize-none rounded border px-2.5 py-2 text-xs"
          style={{
            borderColor: "var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
          rows={3}
          placeholder="Write an analytic memo..."
        />
        <button
          onClick={onAddMemo}
          disabled={!memoInput.trim()}
          className="mt-1.5 rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40"
          style={{
            backgroundColor: "var(--foreground)",
            color: "var(--background)",
          }}
        >
          Add Memo
        </button>
      </div>

      {/* Memo list */}
      {memos.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs" style={{ color: "var(--muted)" }}>
          No memos yet. Write analytic memos as you code.
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {[...memos].reverse().map((memo) => {
            const doc = memo.documentId ? docMap.get(memo.documentId) : undefined;

            return (
              <div
                key={memo.id}
                className="group rounded-md border p-2.5"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--background)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="flex-1 whitespace-pre-wrap text-xs leading-relaxed"
                    style={{ color: "var(--foreground)" }}
                  >
                    {memo.content}
                  </p>
                  <button
                    onClick={() => removeMemo(memo.id)}
                    className="hidden shrink-0 rounded p-0.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:inline-flex"
                    title="Delete memo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div
                  className="mt-1.5 flex items-center gap-2 text-[10px]"
                  style={{ color: "var(--muted)" }}
                >
                  <span>{relativeTime(memo.createdAt)}</span>
                  {doc && (
                    <>
                      <span>&middot;</span>
                      <span className="flex items-center gap-0.5">
                        <FileText size={9} />
                        {doc.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
