"use client";

import { useRef } from "react";
import { Upload, FileText, Users, Download, Trash2 } from "lucide-react";
import { useCodingStore } from "@/stores/coding-store";

export function CodingToolbar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const documents = useCodingStore((s) => s.documents);
  const activeDocumentId = useCodingStore((s) => s.activeDocumentId);
  const setActiveDocument = useCodingStore((s) => s.setActiveDocument);
  const addDocument = useCodingStore((s) => s.addDocument);
  const removeDocument = useCodingStore((s) => s.removeDocument);
  const segments = useCodingStore((s) => s.segments);
  const codes = useCodingStore((s) => s.codes);

  const docSegCount = activeDocumentId
    ? segments.filter((s) => s.documentId === activeDocumentId).length
    : 0;

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const text = await file.text();
      addDocument(file.name, text);
    }
  };

  return (
    <div className="border-b px-4 py-2 flex items-center gap-3 bg-[var(--background)]">
      {/* Document selector */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileText size={16} className="text-[var(--muted)] shrink-0" />
        {documents.length > 0 ? (
          <select
            value={activeDocumentId ?? ""}
            onChange={(e) => setActiveDocument(e.target.value || null)}
            className="text-sm bg-transparent border rounded px-2 py-1 min-w-0 max-w-[240px] truncate"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-[var(--muted)]">No documents loaded</span>
        )}

        {activeDocumentId && (
          <button
            onClick={() => {
              if (window.confirm("Remove this document and all its coded segments?")) {
                removeDocument(activeDocumentId);
              }
            }}
            className="p-1 rounded hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--destructive)]"
            title="Remove document"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
        {documents.length > 0 && (
          <>
            <span>{documents.length} doc{documents.length !== 1 ? "s" : ""}</span>
            <span>{codes.length} code{codes.length !== 1 ? "s" : ""}</span>
            <span>{docSegCount} segment{docSegCount !== 1 ? "s" : ""}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".txt,.csv,.tsv,.md"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border hover:bg-[var(--accent)] transition-colors"
        >
          <Upload size={14} />
          Upload
        </button>
      </div>
    </div>
  );
}
