"use client";

import { useState, useCallback } from "react";
import { FileText, Upload, Shield } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";

export default function DataPage() {
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      }
    },
    [],
  );

  return (
    <div className="flex flex-col min-h-screen">
      <AppNav />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6">Data</h2>
        {files.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-[var(--muted)] mb-4">
              {files.length} file{files.length !== 1 ? "s" : ""} loaded
            </p>
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 border border-[var(--border-bright)] rounded-lg bg-[var(--card)]"
              >
                <FileText size={16} className="text-[var(--primary)]" />
                <span className="text-sm font-medium">{f.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border border-[var(--border-bright)] border-dashed rounded-2xl p-16 text-center hover:border-[var(--primary)] hover:bg-[var(--glow)] transition-all cursor-pointer"
          >
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.json,.txt,.docx,.doc,.rtf,.pdf"
              onChange={handleFileInput}
              className="hidden"
              id="data-upload"
            />
            <label htmlFor="data-upload" className="cursor-pointer">
              <div className="w-14 h-14 rounded-xl bg-[var(--accent)] border border-[var(--border-bright)] flex items-center justify-center mx-auto mb-5">
                <Upload size={26} className="text-[var(--primary)]" />
              </div>
              <p className="text-lg font-semibold mb-1">Drop your data here</p>
              <p className="text-sm text-[var(--muted)]">
                CSV, Excel, JSON, Word documents, or plain text
              </p>
              <p className="text-xs text-[var(--muted)] mt-3 flex items-center justify-center gap-1.5">
                <Shield size={11} />
                All processing happens locally in your browser
              </p>
            </label>
          </div>
        )}
      </main>
    </div>
  );
}
