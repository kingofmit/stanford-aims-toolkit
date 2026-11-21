"use client";

import { useRef, useCallback, useMemo, useEffect, useState } from "react";
import { FileText, ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { useCodingStore } from "@/stores/coding-store";
import type { CodedSegment } from "@/stores/coding-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TextChunk {
  start: number;
  end: number;
  text: string;
  codeIds: string[];
  segmentIds: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeChunks(text: string, segments: CodedSegment[]): TextChunk[] {
  if (text.length === 0) return [];

  // Collect all boundary positions
  const boundaries = new Set<number>([0, text.length]);
  for (const seg of segments) {
    boundaries.add(Math.max(0, seg.startOffset));
    boundaries.add(Math.min(text.length, seg.endOffset));
  }
  const sorted = Array.from(boundaries).sort((a, b) => a - b);

  // Build chunks between boundaries
  const chunks: TextChunk[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;

    const activeCodes: string[] = [];
    const activeSegments: string[] = [];
    for (const seg of segments) {
      if (seg.startOffset <= start && seg.endOffset >= end) {
        if (!activeCodes.includes(seg.codeId)) activeCodes.push(seg.codeId);
        activeSegments.push(seg.id);
      }
    }
    chunks.push({
      start,
      end,
      text: text.slice(start, end),
      codeIds: activeCodes,
      segmentIds: activeSegments,
    });
  }
  return chunks;
}

/** Convert hex color to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Walk text nodes in a container to compute absolute character offset */
function getTextOffset(
  container: HTMLElement,
  targetNode: Node,
  offsetInNode: number,
): number {
  let total = 0;
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
  );
  let current = walker.nextNode();
  while (current) {
    if (current === targetNode) {
      return total + offsetInNode;
    }
    total += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  return total;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DocumentSelector() {
  const documents = useCodingStore((s) => s.documents);
  const activeDocumentId = useCodingStore((s) => s.activeDocumentId);
  const setActiveDocument = useCodingStore((s) => s.setActiveDocument);
  const segments = useCodingStore((s) => s.segments);

  const doc = documents.find((d) => d.id === activeDocumentId);
  const docIndex = documents.findIndex((d) => d.id === activeDocumentId);
  const docSegmentCount = activeDocumentId
    ? segments.filter((s) => s.documentId === activeDocumentId).length
    : 0;

  const wordCount = useMemo(() => {
    if (!doc) return 0;
    return doc.text.split(/\s+/).filter(Boolean).length;
  }, [doc]);

  const goToPrev = useCallback(() => {
    if (docIndex > 0) setActiveDocument(documents[docIndex - 1].id);
  }, [docIndex, documents, setActiveDocument]);

  const goToNext = useCallback(() => {
    if (docIndex < documents.length - 1)
      setActiveDocument(documents[docIndex + 1].id);
  }, [docIndex, documents, setActiveDocument]);

  if (documents.length === 0) return null;

  return (
    <div className="flex items-center gap-3 border-b px-4 py-2" style={{ borderColor: "var(--border)" }}>
      {/* Navigation arrows */}
      <button
        onClick={goToPrev}
        disabled={docIndex <= 0}
        className="rounded p-1 transition-colors hover:bg-[var(--accent)] disabled:opacity-30"
        aria-label="Previous document"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Dropdown */}
      <select
        value={activeDocumentId ?? ""}
        onChange={(e) => setActiveDocument(e.target.value || null)}
        className="flex-1 truncate rounded border bg-transparent px-2 py-1 text-sm"
        style={{ borderColor: "var(--border)" }}
      >
        {documents.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <button
        onClick={goToNext}
        disabled={docIndex >= documents.length - 1}
        className="rounded p-1 transition-colors hover:bg-[var(--accent)] disabled:opacity-30"
        aria-label="Next document"
      >
        <ChevronRight size={16} />
      </button>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
        <span>{wordCount.toLocaleString()} words</span>
        <span className="opacity-40">|</span>
        <span>{docSegmentCount} segment{docSegmentCount !== 1 ? "s" : ""} coded</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip for coded chunks
// ---------------------------------------------------------------------------

function ChunkTooltip({
  codeIds,
  position,
}: {
  codeIds: string[];
  position: { x: number; y: number };
}) {
  const getCodeById = useCodingStore((s) => s.getCodeById);
  const codes = codeIds.map((id) => getCodeById(id)).filter(Boolean);
  if (codes.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 rounded border px-2 py-1 text-xs shadow-md"
      style={{
        left: position.x,
        top: position.y - 32,
        background: "var(--background)",
        borderColor: "var(--border)",
        color: "var(--foreground)",
      }}
    >
      {codes.map((c) => (
        <span key={c!.id} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: c!.color }}
          />
          {c!.name}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state / drop zone
// ---------------------------------------------------------------------------

function EmptyState() {
  const addDocument = useCodingStore((s) => s.addDocument);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      Array.from(files).forEach((file) => {
        if (!file.name.endsWith(".txt") && !file.name.endsWith(".docx")) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            addDocument(file.name, reader.result);
          }
        };
        reader.readAsText(file);
      });
    },
    [addDocument],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 p-8"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div
        className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors"
        style={{
          borderColor: isDragging ? "var(--primary)" : "var(--border)",
          background: isDragging ? "var(--accent)" : "transparent",
        }}
      >
        <FileText size={40} style={{ color: "var(--muted)" }} />
        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          Upload transcripts to start coding.
          <br />
          Drop <code>.txt</code> or <code>.docx</code> files here.
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          <Upload size={14} className="mr-1.5 inline-block" />
          Choose Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.docx"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection highlight indicator
// ---------------------------------------------------------------------------

function SelectionIndicator() {
  const selectedRange = useCodingStore((s) => s.selectedRange);
  const setSelectedRange = useCodingStore((s) => s.setSelectedRange);
  const activeCodeId = useCodingStore((s) => s.activeCodeId);
  const applyCodeToSelection = useCodingStore((s) => s.applyCodeToSelection);
  const getCodeById = useCodingStore((s) => s.getCodeById);

  if (!selectedRange) return null;

  const activeCode = activeCodeId ? getCodeById(activeCodeId) : undefined;
  const previewText =
    selectedRange.text.length > 80
      ? selectedRange.text.slice(0, 80) + "..."
      : selectedRange.text;

  return (
    <div
      className="flex items-center gap-2 border-t px-4 py-2 text-xs"
      style={{ borderColor: "var(--border)", background: "var(--accent)" }}
    >
      <span style={{ color: "var(--muted)" }}>
        Selected: &ldquo;{previewText}&rdquo;
      </span>
      <span className="ml-auto flex items-center gap-2">
        {activeCode ? (
          <button
            onClick={() => applyCodeToSelection()}
            className="rounded px-2 py-0.5 text-xs font-medium text-white"
            style={{ background: activeCode.color }}
          >
            Apply &ldquo;{activeCode.name}&rdquo;
          </button>
        ) : (
          <span style={{ color: "var(--muted)" }}>
            Select a code to apply, or press 1-9
          </span>
        )}
        <button
          onClick={() => setSelectedRange(null)}
          className="rounded p-0.5 hover:bg-[var(--border)]"
          aria-label="Clear selection"
        >
          <X size={12} />
        </button>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TranscriptViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    codeIds: string[];
    x: number;
    y: number;
  } | null>(null);

  // Store state
  const documents = useCodingStore((s) => s.documents);
  const activeDocumentId = useCodingStore((s) => s.activeDocumentId);
  const setSelectedRange = useCodingStore((s) => s.setSelectedRange);
  const getDocumentSegments = useCodingStore((s) => s.getDocumentSegments);
  const getCodeById = useCodingStore((s) => s.getCodeById);
  const codes = useCodingStore((s) => s.codes);
  const applyCodeToSelection = useCodingStore((s) => s.applyCodeToSelection);
  const addDocument = useCodingStore((s) => s.addDocument);

  const doc = documents.find((d) => d.id === activeDocumentId);
  const segments = activeDocumentId
    ? getDocumentSegments(activeDocumentId)
    : [];

  // Memoize chunks
  const chunks = useMemo(
    () => (doc ? computeChunks(doc.text, segments) : []),
    [doc, segments],
  );

  // ---------------------------------------------------------------------------
  // Text selection handler
  // ---------------------------------------------------------------------------

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;

    const range = selection.getRangeAt(0);

    // Ensure selection is inside our container
    if (!containerRef.current.contains(range.startContainer)) return;
    if (!containerRef.current.contains(range.endContainer)) return;

    const startOffset = getTextOffset(
      containerRef.current,
      range.startContainer,
      range.startOffset,
    );
    const endOffset = getTextOffset(
      containerRef.current,
      range.endContainer,
      range.endOffset,
    );

    if (startOffset === endOffset) return;

    const start = Math.min(startOffset, endOffset);
    const end = Math.max(startOffset, endOffset);

    setSelectedRange({
      start,
      end,
      text: selection.toString(),
    });

    // Clear browser selection so it doesn't interfere with highlight rendering
    selection.removeAllRanges();
  }, [setSelectedRange]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        setSelectedRange(null);
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        // Find code with this shortcut
        const code = codes.find((c) => c.shortcut === num);
        if (code) {
          applyCodeToSelection(code.id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [codes, applyCodeToSelection, setSelectedRange]);

  // ---------------------------------------------------------------------------
  // Drag-and-drop on the transcript area
  // ---------------------------------------------------------------------------

  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      Array.from(e.dataTransfer.files).forEach((file) => {
        if (!file.name.endsWith(".txt") && !file.name.endsWith(".docx")) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            addDocument(file.name, reader.result);
          }
        };
        reader.readAsText(file);
      });
    },
    [addDocument],
  );

  // ---------------------------------------------------------------------------
  // Chunk hover / tooltip handlers
  // ---------------------------------------------------------------------------

  const handleChunkMouseEnter = useCallback(
    (codeIds: string[], e: React.MouseEvent) => {
      if (codeIds.length === 0) return;
      setTooltip({ codeIds, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleChunkMouseMove = useCallback(
    (codeIds: string[], e: React.MouseEvent) => {
      if (codeIds.length === 0) return;
      setTooltip({ codeIds, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleChunkMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  /** Compute inline style for a chunk based on its active codes */
  const chunkStyle = useCallback(
    (codeIds: string[]): React.CSSProperties => {
      if (codeIds.length === 0) return {};

      const colors = codeIds
        .map((id) => getCodeById(id))
        .filter(Boolean)
        .map((c) => c!.color);

      if (colors.length === 0) return {};

      if (colors.length === 1) {
        return {
          backgroundColor: hexToRgba(colors[0], 0.22),
          borderRadius: "2px",
        };
      }

      // Multiple overlapping codes: use first code's color + double underline
      return {
        backgroundColor: hexToRgba(colors[0], 0.18),
        textDecorationLine: "underline",
        textDecorationStyle: "double",
        textDecorationColor: hexToRgba(colors[1], 0.5),
        textUnderlineOffset: "3px",
        borderRadius: "2px",
      };
    },
    [getCodeById],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // No documents loaded
  if (documents.length === 0) {
    return <EmptyState />;
  }

  // No active document (shouldn't happen normally, but handle it)
  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ color: "var(--muted)" }}>Select a document to view.</p>
      </div>
    );
  }

  // Split text into paragraphs for rendering while preserving offsets
  // We render all chunks in a single container to keep offset math correct,
  // but we insert visual line breaks where the text has newlines.

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Document selector bar */}
      <DocumentSelector />

      {/* Drag overlay */}
      {isDraggingFile && (
        <div
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed"
          style={{
            borderColor: "var(--primary)",
            background: "rgba(139, 26, 26, 0.06)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            Drop transcript file to add
          </p>
        </div>
      )}

      {/* Transcript body */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto px-6 py-6"
          style={{ maxWidth: "720px" }}
        >
          <div
            ref={containerRef}
            onMouseUp={handleMouseUp}
            className="whitespace-pre-wrap leading-relaxed"
            style={{
              fontSize: "16px",
              lineHeight: "1.7",
              cursor: "text",
              wordBreak: "break-word",
            }}
          >
            {chunks.map((chunk) => {
              const hasCodes = chunk.codeIds.length > 0;
              return (
                <span
                  key={`${chunk.start}-${chunk.end}`}
                  data-offset={chunk.start}
                  data-segment-ids={
                    chunk.segmentIds.length > 0
                      ? chunk.segmentIds.join(",")
                      : undefined
                  }
                  style={chunkStyle(chunk.codeIds)}
                  className={hasCodes ? "cursor-pointer transition-opacity hover:opacity-80" : ""}
                  onMouseEnter={
                    hasCodes
                      ? (e) => handleChunkMouseEnter(chunk.codeIds, e)
                      : undefined
                  }
                  onMouseMove={
                    hasCodes
                      ? (e) => handleChunkMouseMove(chunk.codeIds, e)
                      : undefined
                  }
                  onMouseLeave={hasCodes ? handleChunkMouseLeave : undefined}
                >
                  {chunk.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selection indicator bar */}
      <SelectionIndicator />

      {/* Tooltip */}
      {tooltip && (
        <ChunkTooltip
          codeIds={tooltip.codeIds}
          position={{ x: tooltip.x, y: tooltip.y }}
        />
      )}
    </div>
  );
}
