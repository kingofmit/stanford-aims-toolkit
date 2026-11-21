"use client";

import { CodingToolbar } from "./CodingToolbar";
import { CodebookPanel } from "./CodebookPanel";
import { TranscriptViewer } from "./TranscriptViewer";
import { SegmentPanel } from "./SegmentPanel";
import { ReliabilityPanel } from "./ReliabilityPanel";
import { useCodingStore } from "@/stores/coding-store";
import { useState } from "react";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";

export function CodingWorkspace() {
  const documents = useCodingStore((s) => s.documents);
  const [showStats, setShowStats] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <CodingToolbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Codebook */}
        <div
          className={`border-r flex flex-col shrink-0 transition-all duration-200 ${
            leftCollapsed ? "w-10" : "w-72"
          }`}
        >
          {leftCollapsed ? (
            <button
              onClick={() => setLeftCollapsed(false)}
              className="p-2 hover:bg-[var(--accent)] h-full flex items-start justify-center pt-4"
              title="Show codebook"
            >
              <ChevronRight size={16} />
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                  Codebook
                </span>
                <button
                  onClick={() => setLeftCollapsed(true)}
                  className="p-1 rounded hover:bg-[var(--accent)]"
                  title="Collapse"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CodebookPanel />
              </div>
            </>
          )}
        </div>

        {/* Center Panel: Transcript */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <TranscriptViewer />
        </div>

        {/* Right Panel: Segments + Stats */}
        <div
          className={`border-l flex flex-col shrink-0 transition-all duration-200 ${
            rightCollapsed ? "w-10" : "w-80"
          }`}
        >
          {rightCollapsed ? (
            <button
              onClick={() => setRightCollapsed(false)}
              className="p-2 hover:bg-[var(--accent)] h-full flex items-start justify-center pt-4"
              title="Show segments"
            >
              <ChevronLeft size={16} />
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                  Segments
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className={`p-1 rounded hover:bg-[var(--accent)] ${showStats ? "text-[var(--primary)]" : ""}`}
                    title="Coding statistics"
                  >
                    <BarChart3 size={14} />
                  </button>
                  <button
                    onClick={() => setRightCollapsed(true)}
                    className="p-1 rounded hover:bg-[var(--accent)]"
                    title="Collapse"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {showStats ? <ReliabilityPanel /> : <SegmentPanel />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      {documents.length > 0 && (
        <div className="border-t px-4 py-1.5 text-[10px] text-[var(--muted)] flex items-center gap-4 bg-[var(--background)]">
          <span>Select text + click code to apply</span>
          <span>
            <kbd className="px-1 py-0.5 border rounded text-[9px]">1</kbd>-
            <kbd className="px-1 py-0.5 border rounded text-[9px]">9</kbd> Quick-apply code
          </span>
          <span>
            <kbd className="px-1 py-0.5 border rounded text-[9px]">Esc</kbd> Clear selection
          </span>
        </div>
      )}
    </div>
  );
}
