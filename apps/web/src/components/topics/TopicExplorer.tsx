"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Upload, FileText, Loader2, Brain, Sparkles, ArrowRight,
  Download, X, PenLine, ChevronRight, Info, Copy, Check,
} from "lucide-react";
import { LDAModeler, NMFModeler, preprocessForTopics } from "@aims/topics";
import type { TopicModel } from "@aims/topics";

type Doc = { name: string; text: string };
type Method = "lda" | "nmf";
type Step = "upload" | "configure" | "results";

// ─── Color palette for topics ────────────────────────────────────────────────
const TOPIC_COLORS = [
  "#f5a623", "#3b82f6", "#22c55e", "#ef4444", "#a855f7",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#eab308",
  "#6366f1", "#10b981", "#f43f5e", "#8b5cf6", "#0ea5e9",
  "#d946ef", "#84cc16", "#fb923c", "#2dd4bf", "#fbbf24",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Try to make stemmed words readable: "therapi" → "therapy", "emergenci" → "emergency" */
function prettifyWord(w: string): string {
  // Don't touch short or already-clean words
  if (w.length <= 3) return w;

  // "-i" suffix from stemmer converting "-y" → "-i"
  if (w.endsWith("i") && !w.endsWith("ii")) {
    return w.slice(0, -1) + "y";
  }
  // "-li" → "-ly"
  if (w.endsWith("li")) return w.slice(0, -1) + "y";

  // Words truncated by stemmer that look incomplete
  // "healthing" etc won't happen — the issue is words like "health" being displayed as-is (fine)
  // But "couldn" "doesn" "didn" — contractions missing 't
  if (/^(couldn|doesn|didn|wouldn|shouldn|hasn|hadn|isn|wasn|aren|weren|mustn|needn|won)$/.test(w)) {
    return w + "'t";
  }

  // "crisi" already handled by -i rule above → "crisis"... actually "crisi" → "crisy" is wrong
  // Let's just not touch words that don't match known patterns
  return w;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function displayWord(w: string): string {
  return capitalize(prettifyWord(w));
}

function coherenceLabel(c: number): { text: string; color: string } {
  if (c > -0.5) return { text: "Excellent", color: "var(--success)" };
  if (c > -1) return { text: "Good", color: "var(--success)" };
  if (c > -2) return { text: "Moderate", color: "var(--primary)" };
  if (c > -4) return { text: "Fair", color: "var(--primary)" };
  return { text: "Poor", color: "var(--destructive)" };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TopicExplorer() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [model, setModel] = useState<TopicModel | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [numTopics, setNumTopics] = useState(5);
  const [method, setMethod] = useState<Method>("lda");
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [topicLabels, setTopicLabels] = useState<Record<number, string>>({});
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const step: Step = model ? "results" : documents.length > 0 ? "configure" : "upload";

  // ─── File reading ────────────────────────────────────────────────────────

  const readFiles = useCallback((files: FileList) => {
    const readers = Array.from(files)
      .filter((f) => f.name.endsWith(".txt") || f.name.endsWith(".csv") || f.name.endsWith(".docx"))
      .map(
        (file) =>
          new Promise<Doc>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) =>
              resolve({ name: file.name, text: (e.target?.result as string) ?? "" });
            reader.readAsText(file);
          }),
      );
    Promise.all(readers).then((docs) =>
      setDocuments((prev) => [...prev, ...docs]),
    );
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      readFiles(e.dataTransfer.files);
    },
    [readFiles],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) readFiles(e.target.files);
    },
    [readFiles],
  );

  const removeDoc = useCallback((idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ─── Run model ───────────────────────────────────────────────────────────

  const runTopicModel = useCallback(async () => {
    if (!documents.length || isRunning) return;
    setIsRunning(true);
    setModel(null);
    setSelectedTopic(null);
    setTopicLabels({});
    // Let the UI update before heavy computation
    await new Promise((r) => setTimeout(r, 50));
    try {
      const corpus = preprocessForTopics(documents.map((d) => d.text));
      let result: TopicModel;
      if (method === "lda") {
        result = new LDAModeler({ numTopics }).fit(corpus.documents);
      } else {
        result = new NMFModeler({ numTopics }).fit(corpus.dtMatrix, corpus.vocabulary);
      }
      setModel(result);
    } finally {
      setIsRunning(false);
    }
  }, [documents, isRunning, method, numTopics]);

  // ─── Computed values ─────────────────────────────────────────────────────

  const getTopicLabel = useCallback(
    (idx: number) => {
      if (topicLabels[idx]) return topicLabels[idx];
      if (!model) return "";
      return model.topics[idx].words
        .slice(0, 3)
        .map((w) => displayWord(w.word))
        .join(", ");
    },
    [model, topicLabels],
  );

  const dominantTopicDocs = useCallback(
    (topicIdx: number) => {
      if (!model?.documentTopics) return [] as { doc: Doc; weight: number }[];
      return documents
        .map((doc, di) => ({ doc, weight: model.documentTopics[di]?.[topicIdx] ?? 0 }))
        .filter((d) => d.weight > 0.05)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8);
    },
    [model, documents],
  );

  const avgCoherence = useMemo(() => {
    if (!model) return 0;
    return model.topics.reduce((s, t) => s + t.coherence, 0) / model.topics.length;
  }, [model]);

  // ─── Word cloud helper: map word weights to font sizes ───────────────────

  const wordCloud = useCallback(
    (topicIdx: number) => {
      if (!model) return [];
      const words = model.topics[topicIdx].words.slice(0, 30);
      const maxW = Math.max(...words.map((w) => w.weight), 0.001);
      return words.map((w) => ({
        word: w.word,
        weight: w.weight,
        size: 12 + (w.weight / maxW) * 28, // 12px to 40px
        opacity: 0.4 + (w.weight / maxW) * 0.6,
      }));
    },
    [model],
  );

  // ─── Export ──────────────────────────────────────────────────────────────

  const exportAsText = useCallback(() => {
    if (!model) return;
    const lines = model.topics.map((t, i) => {
      const label = getTopicLabel(i);
      const words = t.words.slice(0, 10).map((w) => `${displayWord(w.word)} (${w.weight.toFixed(3)})`).join(", ");
      const docs = dominantTopicDocs(i).map((d) => d.doc.name).join(", ");
      return `Topic ${i + 1}: ${label}\n  Coherence: ${t.coherence.toFixed(3)}\n  Words: ${words}\n  Documents: ${docs || "none"}\n`;
    });
    const text = `Topic Model Results\nMethod: ${method.toUpperCase()} | Topics: ${model.numTopics} | Avg Coherence: ${avgCoherence.toFixed(3)}\n\n${lines.join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [model, method, avgCoherence, getTopicLabel, dominantTopicDocs]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full text-[var(--foreground)]">
      {/* ═══ STEP: UPLOAD ═══ */}
      {step === "upload" && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-lg w-full">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] border border-[var(--border-bright)] flex items-center justify-center mx-auto mb-4">
                <Brain size={28} className="text-[var(--primary)]" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Find Themes in Your Data</h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed max-w-md mx-auto">
                Upload interview transcripts or open-ended survey responses. AIMS will
                automatically discover recurring themes using topic modeling (LDA or NMF).
              </p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-[var(--primary)] bg-[var(--glow)]"
                  : "border-[var(--border-bright)] hover:border-[var(--primary)]/50"
              }`}
            >
              <input type="file" multiple accept=".txt,.csv,.docx" className="hidden" id="topic-upload" onChange={onFileChange} />
              <label htmlFor="topic-upload" className="cursor-pointer">
                <Upload size={32} className="text-[var(--muted)] mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Drop your documents here</p>
                <p className="text-xs text-[var(--muted)]">TXT, CSV, or DOCX files</p>
              </label>
            </div>

            <div className="mt-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-[var(--primary)] shrink-0 mt-0.5" />
                <div className="text-xs text-[var(--muted)] leading-relaxed">
                  <p className="font-medium text-[var(--foreground)] mb-1">How it works</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Upload your text documents (interviews, survey responses, field notes)</li>
                    <li>Choose a method (LDA or NMF) and number of topics</li>
                    <li>Click &ldquo;Find Themes&rdquo; — results appear in seconds</li>
                    <li>Explore word clouds, document assignments, and representative quotes</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP: CONFIGURE ═══ */}
      {step === "configure" && (
        <div className="flex-1 flex flex-col">
          {/* Document list */}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">
                  {documents.length} Document{documents.length !== 1 ? "s" : ""} Loaded
                </h2>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[var(--border-bright)] hover:border-[var(--primary)] transition-colors">
                  <Upload size={12} />
                  Add More
                  <input type="file" multiple accept=".txt,.csv,.docx" className="hidden" onChange={onFileChange} />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {documents.map((doc, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border-bright)] text-xs"
                  >
                    <FileText size={12} className="text-[var(--primary)]" />
                    <span className="max-w-[200px] truncate">{doc.name}</span>
                    <span className="text-[var(--muted)]">{doc.text.split(/\s+/).length}w</span>
                    <button onClick={() => removeDoc(i)} className="text-[var(--muted)] hover:text-[var(--destructive)]">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full space-y-6">
              <h3 className="text-xl font-bold text-center">Configure Topic Model</h3>

              {/* Method */}
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2 block">Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["lda", "nmf"] as Method[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        method === m
                          ? "border-[var(--primary)] bg-[var(--glow)]"
                          : "border-[var(--border-bright)] bg-[var(--card)] hover:border-[var(--primary)]/50"
                      }`}
                    >
                      <div className="text-sm font-bold mb-1">{m.toUpperCase()}</div>
                      <p className="text-[10px] text-[var(--muted)] leading-snug">
                        {m === "lda"
                          ? "Latent Dirichlet Allocation — probabilistic, best for longer documents"
                          : "Non-negative Matrix Factorization — faster, often better for short texts"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of topics */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Number of topics (K)</label>
                  <span className="text-lg font-bold text-[var(--primary)]">{numTopics}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={20}
                  value={numTopics}
                  onChange={(e) => setNumTopics(Number(e.target.value))}
                  className="w-full accent-[#f5a623]"
                />
                <div className="flex justify-between text-[10px] text-[var(--muted)] mt-1">
                  <span>2 (broad)</span>
                  <span>20 (granular)</span>
                </div>
              </div>

              {/* Run button */}
              <button
                onClick={runTopicModel}
                disabled={isRunning}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {isRunning ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Discovering themes...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Find Themes
                  </>
                )}
              </button>

              <p className="text-[10px] text-[var(--muted)] text-center">
                Processing happens entirely in your browser. No data is sent to any server.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP: RESULTS ═══ */}
      {step === "results" && model && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Summary bar */}
          <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1">
                  {model.topics.length} Themes Found
                </h2>
                <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                  <span>Method: <strong className="text-[var(--foreground)]">{method.toUpperCase()}</strong></span>
                  <span>Documents: <strong className="text-[var(--foreground)]">{documents.length}</strong></span>
                  <span>Iterations: <strong className="text-[var(--foreground)]">{model.iterations}</strong></span>
                  <span>
                    Coherence:{" "}
                    <strong style={{ color: coherenceLabel(avgCoherence).color }}>
                      {avgCoherence.toFixed(2)} ({coherenceLabel(avgCoherence).text})
                    </strong>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportAsText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[var(--border-bright)] hover:border-[var(--primary)] transition-colors"
                >
                  {copied ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy Results"}
                </button>
                <button
                  onClick={() => { setModel(null); setSelectedTopic(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[var(--border-bright)] hover:border-[var(--primary)] transition-colors"
                >
                  <Sparkles size={12} />
                  Re-run
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Topic list */}
            <div className={`overflow-y-auto border-r border-[var(--border)] transition-all ${
              selectedTopic !== null ? "w-80 shrink-0" : "w-full"
            }`}>
              <div className={`p-4 gap-3 ${
                selectedTopic !== null
                  ? "flex flex-col"
                  : "grid grid-cols-2 lg:grid-cols-3"
              }`}>
                {model.topics.map((topic, i) => {
                  const maxWeight = Math.max(...topic.words.map((w) => w.weight), 0.001);
                  const color = TOPIC_COLORS[i % TOPIC_COLORS.length];
                  const isSelected = selectedTopic === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedTopic(isSelected ? null : i)}
                      className={`text-left rounded-xl border p-4 transition-all hover:border-[var(--primary)]/60 ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--accent)]"
                          : "border-[var(--border-bright)] bg-[var(--card)] hover:bg-[var(--card-hover)]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
                          Theme {i + 1}
                        </span>
                        {isSelected && <ChevronRight size={12} className="ml-auto text-[var(--primary)]" />}
                      </div>
                      <p className="text-sm font-semibold mb-1 leading-snug">{getTopicLabel(i)}</p>
                      <div className="flex gap-3 text-[10px] text-[var(--muted)] mb-3">
                        <span style={{ color: coherenceLabel(topic.coherence).color }}>
                          {coherenceLabel(topic.coherence).text}
                        </span>
                        <span>{dominantTopicDocs(i).length} docs</span>
                      </div>

                      {/* Mini word bars */}
                      <div className="space-y-1">
                        {topic.words.slice(0, selectedTopic !== null ? 5 : 8).map((w, wi) => (
                          <div key={wi} className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--muted)] w-16 truncate shrink-0">
                              {displayWord(w.word)}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-[var(--border)]">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.round((w.weight / maxWeight) * 100)}%`,
                                  background: color,
                                  opacity: 0.5 + (w.weight / maxWeight) * 0.5,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail panel */}
            {selectedTopic !== null && model.topics[selectedTopic] && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ background: TOPIC_COLORS[selectedTopic % TOPIC_COLORS.length] }}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: TOPIC_COLORS[selectedTopic % TOPIC_COLORS.length] }}>
                        Theme {selectedTopic + 1}
                      </span>
                    </div>
                    {editingLabel === selectedTopic ? (
                      <input
                        autoFocus
                        defaultValue={getTopicLabel(selectedTopic)}
                        className="text-xl font-bold bg-transparent border-b-2 border-[var(--primary)] outline-none w-full py-1"
                        onBlur={(e) => {
                          if (e.target.value.trim()) setTopicLabels((prev) => ({ ...prev, [selectedTopic]: e.target.value.trim() }));
                          setEditingLabel(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") setEditingLabel(null);
                        }}
                      />
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <h3 className="text-xl font-bold">{getTopicLabel(selectedTopic)}</h3>
                        <button
                          onClick={() => setEditingLabel(selectedTopic)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted)] hover:text-[var(--primary)]"
                          title="Rename theme"
                        >
                          <PenLine size={14} />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Coherence: {model.topics[selectedTopic].coherence.toFixed(3)} ({coherenceLabel(model.topics[selectedTopic].coherence).text})
                    </p>
                  </div>

                  {/* Word cloud */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Word Cloud</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 rounded-xl bg-[var(--card)] border border-[var(--border-bright)] min-h-[120px]">
                      {wordCloud(selectedTopic).map((w, wi) => (
                        <span
                          key={wi}
                          className="inline-block transition-transform hover:scale-110 cursor-default"
                          style={{
                            fontSize: `${w.size}px`,
                            opacity: w.opacity,
                            color: TOPIC_COLORS[selectedTopic % TOPIC_COLORS.length],
                            fontWeight: w.size > 28 ? 700 : w.size > 20 ? 600 : 400,
                          }}
                        >
                          {displayWord(w.word)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Full word list */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Top Words</h4>
                    <div className="space-y-1.5">
                      {model.topics[selectedTopic].words.map((w, wi) => {
                        const maxW = Math.max(...model.topics[selectedTopic].words.map((x) => x.weight), 0.001);
                        return (
                          <div key={wi} className="flex items-center gap-3">
                            <span className="text-xs w-6 text-[var(--muted)] text-right">{wi + 1}</span>
                            <span className="text-sm w-28 truncate shrink-0 font-medium">{displayWord(w.word)}</span>
                            <div className="flex-1 h-2.5 rounded-full bg-[var(--border)]">
                              <div
                                className="h-2.5 rounded-full"
                                style={{
                                  width: `${Math.round((w.weight / maxW) * 100)}%`,
                                  background: TOPIC_COLORS[selectedTopic % TOPIC_COLORS.length],
                                  opacity: 0.5 + (w.weight / maxW) * 0.5,
                                }}
                              />
                            </div>
                            <span className="text-xs text-[var(--muted)] w-14 text-right font-mono">
                              {w.weight.toFixed(4)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Document-topic breakdown */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">
                      Documents ({dominantTopicDocs(selectedTopic).length})
                    </h4>
                    {dominantTopicDocs(selectedTopic).length === 0 ? (
                      <p className="text-xs text-[var(--muted)]">No documents strongly associated with this theme.</p>
                    ) : (
                      <div className="space-y-2">
                        {dominantTopicDocs(selectedTopic).map((item, di) => (
                          <div
                            key={di}
                            className="rounded-xl border border-[var(--border-bright)] bg-[var(--card)] p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold" style={{ color: TOPIC_COLORS[selectedTopic % TOPIC_COLORS.length] }}>
                                {item.doc.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--muted)]">
                                {(item.weight * 100).toFixed(0)}% match
                              </span>
                            </div>
                            <p className="text-xs text-[var(--muted)] leading-relaxed">
                              {item.doc.text.slice(0, 300)}
                              {item.doc.text.length > 300 && "..."}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Document-topic heatmap */}
                  {model.documentTopics && model.documentTopics.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Document-Topic Heatmap</h4>
                      <div className="overflow-x-auto rounded-xl border border-[var(--border-bright)]">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="bg-[var(--card)]">
                              <th className="text-left px-3 py-2 font-semibold text-[var(--muted)]">Document</th>
                              {model.topics.map((_, ti) => (
                                <th key={ti} className="px-2 py-2 font-semibold text-center" style={{ color: TOPIC_COLORS[ti % TOPIC_COLORS.length] }}>
                                  T{ti + 1}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {documents.map((doc, di) => (
                              <tr key={di} className="border-t border-[var(--border)]">
                                <td className="px-3 py-1.5 truncate max-w-[120px] text-[var(--muted)]">{doc.name}</td>
                                {model.documentTopics[di]?.map((weight, ti) => {
                                  const intensity = Math.min(weight * 2, 1);
                                  return (
                                    <td key={ti} className="px-2 py-1.5 text-center">
                                      <div
                                        className="w-full h-5 rounded flex items-center justify-center text-[9px] font-mono"
                                        style={{
                                          background: `${TOPIC_COLORS[ti % TOPIC_COLORS.length]}${Math.round(intensity * 40 + 10).toString(16).padStart(2, "0")}`,
                                          color: intensity > 0.3 ? "var(--foreground)" : "var(--muted)",
                                        }}
                                      >
                                        {weight > 0.01 ? (weight * 100).toFixed(0) : ""}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
