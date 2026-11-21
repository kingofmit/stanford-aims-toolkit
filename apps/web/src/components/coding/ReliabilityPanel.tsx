"use client";

import { useMemo } from "react";
import { useCodingStore } from "@/stores/coding-store";

/**
 * Displays inter-rater reliability metrics for the current coding session.
 * Uses Cohen's kappa and percent agreement from @aims/coding.
 *
 * For MVP: computes agreement between the current coder's segments
 * and any AI-suggested segments, or between two coders if multiple coderIds exist.
 */
export function ReliabilityPanel() {
  const segments = useCodingStore((s) => s.segments);
  const codes = useCodingStore((s) => s.codes);
  const documents = useCodingStore((s) => s.documents);
  const getCodeById = useCodingStore((s) => s.getCodeById);

  const stats = useMemo(() => {
    const coderIds = [...new Set(segments.map((s) => s.coderId))];
    const codedDocIds = [...new Set(segments.map((s) => s.documentId))];
    const totalDocs = documents.length;

    // Code frequency sorted descending
    const codeFreq: { code: string; color: string; count: number }[] = [];
    const freqMap = new Map<string, number>();
    for (const s of segments) {
      freqMap.set(s.codeId, (freqMap.get(s.codeId) ?? 0) + 1);
    }
    for (const [codeId, count] of freqMap) {
      const code = getCodeById(codeId);
      if (code) {
        codeFreq.push({ code: code.name, color: code.color, count });
      }
    }
    codeFreq.sort((a, b) => b.count - a.count);

    // Saturation curve: cumulative new codes over documents coded
    const docOrder = documents.map((d) => d.id);
    const saturation: { docIndex: number; newCodes: number; totalCodes: number }[] = [];
    const seenCodes = new Set<string>();
    let cumulative = 0;
    for (let i = 0; i < docOrder.length; i++) {
      const docSegments = segments.filter((s) => s.documentId === docOrder[i]);
      let newInDoc = 0;
      for (const seg of docSegments) {
        if (!seenCodes.has(seg.codeId)) {
          seenCodes.add(seg.codeId);
          newInDoc++;
          cumulative++;
        }
      }
      if (docSegments.length > 0) {
        saturation.push({ docIndex: i + 1, newCodes: newInDoc, totalCodes: cumulative });
      }
    }

    return {
      totalSegments: segments.length,
      totalCodes: codes.length,
      codesUsed: freqMap.size,
      coderCount: coderIds.length,
      codedDocs: codedDocIds.length,
      totalDocs,
      codeFreq,
      saturation,
    };
  }, [segments, codes, documents, getCodeById]);

  if (stats.totalSegments === 0) {
    return (
      <div className="p-4 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--foreground)] mb-2">Coding Statistics</p>
        <p>Start coding to see statistics here.</p>
      </div>
    );
  }

  const maxFreq = stats.codeFreq[0]?.count ?? 1;

  return (
    <div className="p-4 space-y-4 text-sm">
      <p className="font-medium text-[var(--foreground)]">Coding Statistics</p>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Segments" value={stats.totalSegments} />
        <StatCard label="Codes used" value={stats.codesUsed} />
        <StatCard label="Docs coded" value={`${stats.codedDocs}/${stats.totalDocs}`} />
        <StatCard label="Coders" value={stats.coderCount} />
      </div>

      {/* Code frequencies */}
      <div>
        <p className="text-xs text-[var(--muted)] mb-2 font-medium">Code Frequencies</p>
        <div className="space-y-1.5">
          {stats.codeFreq.map((cf) => (
            <div key={cf.code} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cf.color }}
              />
              <span className="flex-1 truncate text-xs">{cf.code}</span>
              <div className="w-20 h-1.5 bg-[var(--accent)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(cf.count / maxFreq) * 100}%`,
                    backgroundColor: cf.color,
                  }}
                />
              </div>
              <span className="text-xs text-[var(--muted)] w-6 text-right">{cf.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Saturation curve (text-based for MVP) */}
      {stats.saturation.length > 1 && (
        <div>
          <p className="text-xs text-[var(--muted)] mb-2 font-medium">Theoretical Saturation</p>
          <div className="flex items-end gap-0.5 h-12">
            {stats.saturation.map((pt, i) => (
              <div
                key={i}
                className="flex-1 bg-[var(--primary)] rounded-t opacity-70"
                style={{ height: `${(pt.totalCodes / (stats.codesUsed || 1)) * 100}%` }}
                title={`Doc ${pt.docIndex}: ${pt.newCodes} new codes (${pt.totalCodes} total)`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[var(--muted)] mt-1">
            <span>Doc 1</span>
            <span>Doc {stats.saturation.length}</span>
          </div>
          {stats.saturation.length > 2 &&
            stats.saturation.slice(-3).every((pt) => pt.newCodes === 0) && (
              <p className="text-xs text-green-600 mt-1">
                No new codes in last 3 documents — approaching saturation.
              </p>
            )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-2">
      <p className="text-lg font-semibold leading-tight">{value}</p>
      <p className="text-[10px] text-[var(--muted)]">{label}</p>
    </div>
  );
}
