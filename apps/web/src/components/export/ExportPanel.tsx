"use client";

import { useState } from "react";
import {
  FileSpreadsheet, Braces, FileText, BarChart, Terminal, Code, BookOpen, Copy, Download, Check,
} from "lucide-react";
import {
  CSVExporter, JSONExporter, SPSSExporter, LaTeXExporter, RExporter, StataExporter,
  MethodsSectionGenerator, generateCitation,
} from "@aims/export";

// ---------------------------------------------------------------------------
// Sample dataset
// ---------------------------------------------------------------------------
const HEADERS = ["participant", "age", "trust_govt", "trust_media", "trust_science"];
const ROWS: (string | number)[][] = [
  ["P001", 34, 3.2, 2.8, 4.5],
  ["P002", 28, 2.1, 3.5, 4.8],
  ["P003", 45, 4.0, 2.2, 3.9],
  ["P004", 52, 1.8, 1.9, 4.2],
  ["P005", 31, 3.7, 3.1, 4.6],
];

// ---------------------------------------------------------------------------
// Format definitions
// ---------------------------------------------------------------------------
type Format = "csv" | "json" | "latex" | "spss" | "stata" | "r" | "bibtex";

const FORMATS: { id: Format; label: string; desc: string; ext: string; icon: React.ReactNode }[] = [
  { id: "csv",    label: "CSV",      desc: "Universal data format",          ext: "csv",    icon: <FileSpreadsheet size={18} /> },
  { id: "json",   label: "JSON",     desc: "Structured data with metadata",  ext: "json",   icon: <Braces size={18} /> },
  { id: "latex",  label: "LaTeX",    desc: "Publication-ready tables",       ext: "tex",    icon: <FileText size={18} /> },
  { id: "spss",   label: "SPSS",     desc: "SPSS syntax file",               ext: "sps",    icon: <BarChart size={18} /> },
  { id: "stata",  label: "Stata",    desc: "Stata do-file",                  ext: "do",     icon: <Terminal size={18} /> },
  { id: "r",      label: "R Script", desc: "Tidyverse R script",             ext: "R",      icon: <Code size={18} /> },
  { id: "bibtex", label: "BibTeX",   desc: "Citation for AIMS Toolkit",      ext: "bib",    icon: <BookOpen size={18} /> },
];

// ---------------------------------------------------------------------------
// Preview generators
// ---------------------------------------------------------------------------
function buildPreview(format: Format): string {
  switch (format) {
    case "csv":
      return new CSVExporter().export(HEADERS, ROWS);
    case "json":
      return new JSONExporter().export(
        ROWS.map((row) => Object.fromEntries(HEADERS.map((h, i) => [h, row[i]]))),
        { pretty: true, includeMetadata: true },
      );
    case "latex":
      return new LaTeXExporter().exportTable(HEADERS, ROWS, {
        caption: "Trust in Institutions Survey Data",
        label: "tab:trust_data",
      });
    case "spss": {
      const exporter = new SPSSExporter();
      const vars = exporter.buildVariableDefinitions(
        HEADERS.map((h, i) => ({
          name: h,
          type: i === 0 ? "string" : "numeric",
          label: h.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        })),
      );
      return exporter.generateSyntax(vars, ROWS);
    }
    case "stata":
      return new StataExporter().generateDoFile(HEADERS, ROWS, [
        "summarize",
        "correlate trust_govt trust_media trust_science",
      ]);
    case "r":
      return new RExporter().generateScript(
        { headers: HEADERS, rows: ROWS },
        [{ method: "descriptive" }, { method: "correlation" }],
      );
    case "bibtex":
      return generateCitation("bibtex");
  }
}

// ---------------------------------------------------------------------------
// Analysis methods for the methods section generator
// ---------------------------------------------------------------------------
const ANALYSIS_OPTIONS = [
  { id: "descriptive", label: "Descriptive statistics",  pkg: "descriptive" },
  { id: "correlation", label: "Correlation analysis",    pkg: "correlation" },
  { id: "ttest",       label: "T-test",                  pkg: "comparison"  },
  { id: "anova",       label: "ANOVA",                   pkg: "comparison"  },
  { id: "regression",  label: "Regression",              pkg: "regression"  },
  { id: "sentiment",   label: "Sentiment analysis",      pkg: "sentiment"   },
  { id: "topic",       label: "Topic modeling",          pkg: "topics"      },
];

// ---------------------------------------------------------------------------
// Citation formats
// ---------------------------------------------------------------------------
type CiteFmt = "apa" | "bibtex" | "ris";
const CITE_FMTS: { id: CiteFmt; label: string }[] = [
  { id: "apa",    label: "APA"    },
  { id: "bibtex", label: "BibTeX" },
  { id: "ris",    label: "RIS"    },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

function CopyBtn({ text, small }: { text: string; small?: boolean }) {
  const { copied, copy } = useCopy();
  const sz = small ? "text-xs px-2 py-1 gap-1" : "text-sm px-3 py-1.5 gap-1.5";
  return (
    <button
      onClick={() => copy(text)}
      className={`inline-flex items-center rounded-md border font-medium transition-colors ${sz}`}
      style={{
        background: copied ? "rgba(34,197,94,.12)" : "var(--accent)",
        borderColor: copied ? "var(--success)" : "var(--border-bright)",
        color: copied ? "var(--success)" : "var(--foreground)",
      }}
    >
      {copied ? <Check size={small ? 12 : 14} /> : <Copy size={small ? 12 : 14} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ExportPanel() {
  const [selectedFormat, setSelectedFormat] = useState<Format>("csv");
  const [preview] = useState<string>("");
  const [citeFmt, setCiteFmt] = useState<CiteFmt>("apa");

  // Methods section state
  const [dataDesc, setDataDesc] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [checkedMethods, setCheckedMethods] = useState<Set<string>>(new Set());
  const [methodsOutput, setMethodsOutput] = useState("");

  void preview; // consumed indirectly through buildPreview

  const currentPreview = buildPreview(selectedFormat);
  const fmt = FORMATS.find((f) => f.id === selectedFormat)!;
  const citationText = generateCitation(citeFmt);

  const handleDownload = () => {
    const blob = new Blob([currentPreview], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aims_export.${fmt.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleMethod = (id: string) =>
    setCheckedMethods((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const generateMethods = () => {
    const steps = ANALYSIS_OPTIONS.filter((o) => checkedMethods.has(o.id)).map((o) => ({
      method: o.label,
      package: o.pkg,
    }));
    if (!dataDesc.trim() || !sampleSize || steps.length === 0) return;
    const gen = new MethodsSectionGenerator();
    const result = gen.generate({
      dataDescription: dataDesc.trim(),
      sampleSize: parseInt(sampleSize, 10) || 0,
      analysisSteps: steps,
      toolVersion: "1.0",
    });
    setMethodsOutput(result.fullText);
  };

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Export Results</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          Export your data and analysis results in multiple formats for publication or further analysis.
        </p>
      </div>

      {/* Format selector + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Format cards */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>Format</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => {
              const active = f.id === selectedFormat;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormat(f.id)}
                  className="text-left rounded-lg border p-3 transition-colors hover:border-[var(--border-bright)]"
                  style={{
                    background: active ? "rgba(245,166,35,.07)" : "var(--card)",
                    borderColor: active ? "var(--primary)" : "var(--border)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1" style={{ color: active ? "var(--primary)" : "var(--muted)" }}>
                    {f.icon}
                    <span className="font-medium text-sm" style={{ color: active ? "var(--primary)" : "var(--foreground)" }}>
                      {f.label}
                    </span>
                  </div>
                  <p className="text-xs leading-tight" style={{ color: "var(--muted)" }}>{f.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview pane */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Preview</p>
            <div className="flex items-center gap-2">
              <CopyBtn text={currentPreview} />
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
                style={{ background: "var(--primary)", borderColor: "var(--primary)", color: "#0c0c0f" }}
              >
                <Download size={14} />
                Download
              </button>
            </div>
          </div>
          <pre
            className="flex-1 rounded-lg border p-3 text-xs overflow-auto font-mono leading-relaxed"
            style={{
              background: "var(--accent)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
              minHeight: "260px",
              maxHeight: "320px",
              whiteSpace: "pre",
            }}
          >
            {currentPreview}
          </pre>
        </div>
      </div>

      {/* Methods Section Generator */}
      <div className="rounded-lg border p-4 space-y-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Methods Section Generator</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Generate an APA-style methods paragraph for your paper.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Data description</label>
            <input
              value={dataDesc}
              onChange={(e) => setDataDesc(e.target.value)}
              placeholder="e.g., Survey data were collected via MTurk..."
              className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
              style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Sample size (N)</label>
            <input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(e.target.value)}
              placeholder="e.g., 342"
              className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
              style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>Analysis methods used</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ANALYSIS_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checkedMethods.has(opt.id)}
                  onChange={() => toggleMethod(opt.id)}
                  className="accent-[var(--primary)] w-3.5 h-3.5"
                />
                <span className="text-xs" style={{ color: "var(--foreground)" }}>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={generateMethods}
          disabled={!dataDesc.trim() || !sampleSize || checkedMethods.size === 0}
          className="rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ background: "var(--primary)", color: "#0c0c0f" }}
        >
          Generate Methods Section
        </button>

        {methodsOutput && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>Generated text</p>
              <CopyBtn text={methodsOutput} small />
            </div>
            <pre
              className="rounded-md border p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap"
              style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {methodsOutput}
            </pre>
          </div>
        )}
      </div>

      {/* Citation section */}
      <div className="rounded-lg border p-4 space-y-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Cite AIMS Toolkit</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Use this citation when publishing work that used this toolkit.</p>
          </div>
          <div className="flex items-center gap-1 rounded-md border p-0.5" style={{ borderColor: "var(--border)", background: "var(--accent)" }}>
            {CITE_FMTS.map((cf) => (
              <button
                key={cf.id}
                onClick={() => setCiteFmt(cf.id)}
                className="rounded px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background: citeFmt === cf.id ? "var(--primary)" : "transparent",
                  color: citeFmt === cf.id ? "#0c0c0f" : "var(--muted)",
                }}
              >
                {cf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-start">
          <pre
            className="flex-1 rounded-md border p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap"
            style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            {citationText}
          </pre>
          <CopyBtn text={citationText} small />
        </div>
      </div>
    </div>
  );
}
