"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Search } from "lucide-react";
import { analyzeSentiment, vaderSentiment, detectEmotions } from "@aims/sentiment";
import { readability, analyzeDictionary, concordance, MORAL_FOUNDATIONS, COGNITIVE_PROCESSES, textStats } from "@aims/nlp";

type Doc = { name: string; content: string };
type TabId = "sentiment" | "readability" | "dictionary" | "concordance";

const TABS: { id: TabId; label: string }[] = [
  { id: "sentiment", label: "Sentiment" },
  { id: "readability", label: "Readability" },
  { id: "dictionary", label: "Dictionary" },
  { id: "concordance", label: "Concordance" },
];
const EMOTIONS = ["joy", "anger", "sadness", "fear", "surprise", "disgust"] as const;
const EMO_COLORS: Record<string, string> = { joy: "#facc15", anger: "#f87171", sadness: "#60a5fa", fear: "#a78bfa", surprise: "#fb923c", disgust: "#4ade80" };

const scoreColor = (s: number) => s > 0.05 ? "#4ade80" : s < -0.05 ? "#f87171" : "#6b7280";
const gradeColor = (g: number) => g <= 8 ? "#4ade80" : g <= 12 ? "#facc15" : "#f87171";
const audience = (g: number) => g <= 6 ? "General public" : g <= 9 ? "Middle school" : g <= 12 ? "High school" : g <= 16 ? "College" : "Graduate";

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: "var(--muted)" }}>
      <FileText size={32} strokeWidth={1.2} />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

function DocCard({ doc, children }: { doc: Doc; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 space-y-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText size={14} className="text-[var(--muted)]" />
        {doc.name}
      </div>
      {children}
    </div>
  );
}

export function TextAnalyzer() {
  const [texts, setTexts] = useState<Doc[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("sentiment");
  const [keyword, setKeyword] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.name.endsWith(".txt")) return;
      const reader = new FileReader();
      reader.onload = (e) => setTexts((prev) => [...prev, { name: file.name, content: e.target?.result as string }]);
      reader.readAsText(file);
    });
  }, []);

  /* ── Sentiment ── */
  function SentimentTab() {
    if (!texts.length) return <Empty msg="Upload documents to analyze sentiment." />;
    const avg = texts.reduce((s, t) => s + analyzeSentiment(t.content).score, 0) / texts.length;
    return (
      <div className="space-y-4">
        <div className="rounded-lg border p-4 flex gap-6" style={{ background: "var(--card)", borderColor: "var(--border-bright)" }}>
          <div>
            <div className="text-xs text-[var(--muted)]">Avg AFINN</div>
            <div className="text-2xl font-bold" style={{ color: scoreColor(avg) }}>{avg > 0 ? "+" : ""}{avg.toFixed(2)}</div>
          </div>
          <div className="w-px" style={{ background: "var(--border)" }} />
          <div>
            <div className="text-xs text-[var(--muted)]">Documents</div>
            <div className="text-2xl font-bold">{texts.length}</div>
          </div>
        </div>
        {texts.map((doc, i) => {
          const af = analyzeSentiment(doc.content);
          const vd = vaderSentiment(doc.content);
          const em = detectEmotions(doc.content);
          const maxEm = Math.max(...EMOTIONS.map((e) => em[e] ?? 0), 1);
          return (
            <DocCard key={i} doc={doc}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted)] w-24">AFINN score</span>
                <span className="text-sm font-semibold w-12" style={{ color: scoreColor(af.score) }}>{af.score > 0 ? "+" : ""}{af.score.toFixed(1)}</span>
                <div className="flex gap-1 flex-wrap flex-1">
                  {af.positive?.slice(0, 5).map((w) => <span key={w} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#16a34a33", color: "#4ade80" }}>{w}</span>)}
                  {af.negative?.slice(0, 5).map((w) => <span key={w} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#dc262633", color: "#f87171" }}>{w}</span>)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted)] w-24">VADER compound</span>
                <span className="text-sm font-semibold w-12" style={{ color: scoreColor(vd.compound) }}>{vd.compound.toFixed(3)}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${((vd.compound + 1) / 2) * 100}%`, background: scoreColor(vd.compound) }} />
                </div>
                <span className="text-[10px] text-[var(--muted)]">{vd.compound > 0.05 ? "Positive" : vd.compound < -0.05 ? "Negative" : "Neutral"}</span>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1.5">Emotions</div>
                <div className="flex gap-2 items-end h-10">
                  {EMOTIONS.map((e) => (
                    <div key={e} className="flex flex-col items-center gap-0.5 flex-1">
                      <div className="w-full flex items-end h-8">
                        <div className="w-full rounded-t" style={{ height: `${Math.max(((em[e] ?? 0) / maxEm) * 100, 4)}%`, background: EMO_COLORS[e], opacity: 0.85 }} />
                      </div>
                      <span className="text-[9px] text-[var(--muted)] capitalize">{e}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DocCard>
          );
        })}
      </div>
    );
  }

  /* ── Readability ── */
  function ReadabilityTab() {
    if (!texts.length) return <Empty msg="Upload documents to analyze readability." />;
    return (
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--accent)" }}>
              {["Document", "FK Grade", "Flesch Ease", "SMOG", "Coleman-Liau", "ARI", "Audience"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {texts.map((doc, i) => {
              const r = readability(doc.content);
              const fk = r.fleschKincaid ?? 0;
              const c = gradeColor(fk);
              return (
                <tr key={i} className="border-t" style={{ borderColor: "var(--border)", background: i % 2 ? "var(--accent)" : "transparent" }}>
                  <td className="px-3 py-2 font-medium max-w-[140px] truncate">{doc.name}</td>
                  <td className="px-3 py-2"><span className="text-xs px-1.5 py-0.5 rounded" style={{ color: c, background: `${c}22` }}>{fk.toFixed(1)}</span></td>
                  <td className="px-3 py-2 text-[var(--muted)]">{r.fleschReadingEase?.toFixed(1) ?? "—"}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{r.smog?.toFixed(1) ?? "—"}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{r.colemanLiau?.toFixed(1) ?? "—"}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{r.automatedReadability?.toFixed(1) ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-[var(--muted)]">{audience(fk)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /* ── Dictionary ── */
  function DictionaryTab() {
    if (!texts.length) return <Empty msg="Upload documents to run dictionary analysis." />;
    return (
      <div className="space-y-4">
        {texts.map((doc, i) => {
          const total = textStats(doc.content).wordCount || 1;
          const renderDict = (label: string, dict: typeof MORAL_FOUNDATIONS) => {
            const res = analyzeDictionary(doc.content, dict);
            return (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--primary)" }}>{label}</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(res.categories).map(([cat, { count, words }]) => {
                    const pct = ((count / total) * 100).toFixed(2);
                    return (
                      <div key={cat} className="rounded p-2 border" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium capitalize">{cat}</span>
                          <span className="text-xs text-[var(--muted)]">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1 rounded-full mb-1.5" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(parseFloat(pct) * 20, 100)}%`, background: "var(--primary)" }} />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {words.slice(0, 5).map((w) => <span key={w} className="text-[9px] px-1 py-0.5 rounded" style={{ background: "var(--border-bright)", color: "var(--muted)" }}>{w}</span>)}
                          {words.length > 5 && <span className="text-[9px] text-[var(--muted)]">+{words.length - 5}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          };
          return (
            <DocCard key={i} doc={doc}>
              <span className="text-xs text-[var(--muted)]">({total} words)</span>
              {renderDict("Moral Foundations", MORAL_FOUNDATIONS)}
              {renderDict("Cognitive Processes", COGNITIVE_PROCESSES)}
            </DocCard>
          );
        })}
      </div>
    );
  }

  /* ── Concordance ── */
  function ConcordanceTab() {
    const results = keyword.trim() && texts.length
      ? concordance(texts.map((d) => d.content), keyword.trim()).map((r) => ({ ...r, name: texts[r.documentIndex]?.name ?? "" }))
      : [];
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Enter keyword…"
            className="flex-1 px-3 py-2 rounded-lg border text-sm bg-transparent outline-none focus:ring-1"
            style={{ borderColor: "var(--border-bright)", color: "var(--foreground)" } as React.CSSProperties} />
          <div className="px-3 py-2 rounded-lg border text-xs text-[var(--muted)] flex items-center" style={{ borderColor: "var(--border)" }}>
            {results.length} hit{results.length !== 1 ? "s" : ""}
          </div>
        </div>
        {!texts.length && <Empty msg="Upload documents to search concordance." />}
        {texts.length > 0 && keyword.trim() && !results.length && (
          <div className="text-center py-8 text-sm text-[var(--muted)]">No matches for "{keyword}"</div>
        )}
        {results.length > 0 && (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--accent)" }}>
                  {["Doc", "Left context", "Keyword", "Right context"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)", background: i % 2 ? "var(--accent)" : "transparent" }}>
                    <td className="px-3 py-1.5 text-xs text-[var(--muted)] truncate max-w-[100px]" title={r.name}>{r.name}</td>
                    <td className="px-3 py-1.5 text-right text-xs text-[var(--muted)] max-w-[180px] truncate">{r.left}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className="font-semibold text-xs px-1.5 py-0.5 rounded" style={{ color: "var(--primary)", background: "var(--primary)22" }}>{r.keyword ?? keyword}</span>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-[var(--muted)] max-w-[180px] truncate">{r.right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > 100 && (
              <div className="px-3 py-2 text-xs text-[var(--muted)] border-t" style={{ borderColor: "var(--border)" }}>
                Showing first 100 of {results.length} matches
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "sentiment": return <SentimentTab />;
      case "readability": return <ReadabilityTab />;
      case "dictionary": return <DictionaryTab />;
      case "concordance": return <ConcordanceTab />;
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ color: "var(--foreground)" }}>
      {/* Upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        className="mx-4 mt-4 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 py-5 cursor-pointer transition-colors"
        style={{ borderColor: isDragging ? "var(--primary)" : "var(--border-bright)", background: isDragging ? "var(--primary)11" : "transparent" }}
        onClick={() => document.getElementById("txa-input")?.click()}
      >
        <Upload size={20} style={{ color: isDragging ? "var(--primary)" : "var(--muted)" }} />
        <p className="text-sm" style={{ color: isDragging ? "var(--primary)" : "var(--muted)" }}>
          Drop <span className="font-medium">.txt</span> files here, or click to browse
        </p>
        <input id="txa-input" type="file" accept=".txt" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {/* Loaded chips */}
      {texts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 mt-2">
          {texts.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <FileText size={11} className="text-[var(--muted)]" />
              {t.name}
              <button onClick={() => setTexts((p) => p.filter((_, j) => j !== i))} className="text-[var(--muted)] hover:text-[var(--foreground)] ml-0.5">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 px-4 mt-4 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-3 py-2 text-xs font-medium transition-colors -mb-px border-b-2"
            style={{ borderColor: activeTab === tab.id ? "var(--primary)" : "transparent", color: activeTab === tab.id ? "var(--primary)" : "var(--muted)" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{renderTab()}</div>
    </div>
  );
}
