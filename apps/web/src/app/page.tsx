"use client";

import Link from "next/link";
import {
  Upload,
  FileText,
  BarChart3,
  MessageSquareCode,
  Brain,
  Download,
  Sparkles,
  Shield,
  ArrowRight,
  Zap,
  Lock,
  Github,
  BookOpen,
  CheckCircle2,
  XCircle,
  Table,
  Braces,
  Terminal,
  Code,
  GraduationCap,
  Quote,
  FileSpreadsheet,
} from "lucide-react";
import { useCallback, useState } from "react";

const NAV_ITEMS = [
  { href: "/data", label: "Data", icon: FileText },
  { href: "/coding", label: "Coding", icon: MessageSquareCode },
  { href: "/topics", label: "Topics", icon: Brain },
  { href: "/survey", label: "Survey", icon: BarChart3 },
  { href: "/analysis", label: "Text Analysis", icon: Sparkles },
  { href: "/export", label: "Export", icon: Download },
];

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
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
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between bg-[var(--background)]/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3">
          <img src="/aims-logo.png" alt="AIMS" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-base font-semibold leading-tight tracking-tight">
              STANFORD AIMS
            </h1>
            <p className="text-[10px] text-[var(--muted)] tracking-widest uppercase">
              AI Methods for Social Scientists
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden py-24 px-8">
          <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-10%] right-[15%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)" }} />
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(245,166,35,0.04) 0%, transparent 60%)" }} />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--primary)]/30 text-xs font-medium text-[var(--primary)] mb-8" style={{ background: "rgba(245,166,35,0.08)" }}>
              <Sparkles size={13} />
              Built at Stanford CASBS for Behavioral Researchers
            </div>

            <h2 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
              AI Methods for<br />
              <span className="bg-gradient-to-r from-[#f5a623] via-[#f7c948] to-[#f5a623] bg-clip-text text-transparent">Social Scientists</span>
            </h2>

            <p className="text-xl text-[var(--muted)] leading-relaxed max-w-2xl mx-auto mb-10">
              The open-source platform that replaces NVivo, SPSS, and LIWC.
              Topic modeling, qualitative coding, survey analysis, and sentiment
              detection — all in your browser, all free.
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <Link
                href="/coding"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                Start Coding Transcripts
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/survey"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-[var(--border-bright)] hover:border-[var(--primary)] hover:bg-[var(--accent)] transition-all"
              >
                Analyze Survey Data
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1.5"><Lock size={12} /> Data never leaves your browser</span>
              <span className="flex items-center gap-1.5"><Github size={12} /> MIT License</span>
              <span className="flex items-center gap-1.5"><Zap size={12} /> No account required</span>
            </div>
          </div>
        </section>

        {/* ═══ TOOLS GRID ═══ */}
        <section className="px-8 pb-20">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-center text-sm font-semibold text-[var(--muted)] uppercase tracking-widest mb-8">
              Everything you need in one toolkit
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <ToolCard
                icon={<Brain size={24} />}
                title="Find Themes"
                subtitle="Topic Modeling"
                description="Upload transcripts, click one button. LDA and NMF discover themes automatically with coherence scoring."
                href="/topics"
              />
              <ToolCard
                icon={<MessageSquareCode size={24} />}
                title="Code Transcripts"
                subtitle="Qualitative Coding"
                description="NVivo-style 3-panel coding workspace. Create codes, select text, apply. Keyboard shortcuts for speed."
                href="/coding"
                highlighted
              />
              <ToolCard
                icon={<BarChart3 size={24} />}
                title="Analyze Survey"
                subtitle="Statistical Analysis"
                description="T-tests, ANOVA, regression, correlation matrices, Cronbach's alpha — with real p-values and plain-English interpretation."
                href="/survey"
              />
              <ToolCard
                icon={<Sparkles size={24} />}
                title="Text Analysis"
                subtitle="NLP & Sentiment"
                description="VADER sentiment, Flesch-Kincaid readability, Moral Foundations dictionary, KWIC concordance search."
                href="/analysis"
              />
            </div>
          </div>
        </section>

        {/* ═══ REPLACES SECTION ═══ */}
        <section className="px-8 py-20 border-t border-[var(--border)]">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-center text-3xl font-bold mb-3">
              One tool replaces <span className="text-[var(--primary)]">all of these</span>
            </h3>
            <p className="text-center text-[var(--muted)] mb-12 text-sm">
              Stop paying for fragmented software. AIMS does it all — for free.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: "NVivo", price: "$2,499/yr", replaces: "Qualitative coding" },
                { name: "ATLAS.ti", price: "$590", replaces: "Qualitative analysis" },
                { name: "SPSS", price: "$99/mo", replaces: "Survey statistics" },
                { name: "LIWC", price: "$99/yr", replaces: "Dictionary analysis" },
                { name: "Dedoose", price: "$15/mo", replaces: "Mixed methods" },
                { name: "R/Python", price: "Free but complex", replaces: "Topic modeling, NLP" },
              ].map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]"
                >
                  <XCircle size={18} className="text-[var(--destructive)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold">{tool.name}</div>
                    <div className="text-xs text-[var(--muted)]">{tool.price}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">{tool.replaces}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-5 rounded-xl border-2 border-[var(--primary)] text-center" style={{ background: "rgba(245,166,35,0.06)" }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 size={20} className="text-[var(--success)]" />
                <span className="text-lg font-bold">Stanford AIMS Toolkit</span>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Free, open-source, browser-based. All of the above in one place.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ PRIVACY + UPLOAD ═══ */}
        <section className="px-8 py-20 border-t border-[var(--border)]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start gap-6 mb-12">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent)] border border-[var(--border-bright)] flex items-center justify-center shrink-0">
                <Shield size={24} className="text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">IRB-compliant by design</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  Your research data never leaves your computer. Every computation runs locally
                  in your browser using JavaScript — no server, no cloud, no data transfer.
                  Safe for human subjects research without special IRB protocols.
                </p>
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border border-[var(--border-bright)] border-dashed rounded-2xl p-12 text-center hover:border-[var(--primary)] hover:bg-[var(--glow)] transition-all cursor-pointer"
            >
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.json,.txt,.docx,.doc,.rtf,.pdf"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="w-14 h-14 rounded-xl bg-[var(--accent)] border border-[var(--border-bright)] flex items-center justify-center mx-auto mb-5">
                  <Upload size={26} className="text-[var(--primary)]" />
                </div>
                <p className="text-lg font-semibold mb-1">Drop your data to get started</p>
                <p className="text-sm text-[var(--muted)]">
                  CSV, Excel, JSON, Word documents, or plain text
                </p>
              </label>
            </div>
          </div>
        </section>

        {/* ═══ EXPORT SECTION ═══ */}
        <section className="px-8 py-16 border-t border-[var(--border)]">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-3">Publish-ready output</h3>
            <p className="text-[var(--muted)] text-sm mb-8">Export to every format your reviewers and collaborators need.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {([
                { name: "CSV", icon: Table },
                { name: "SPSS", icon: BarChart3 },
                { name: "Stata", icon: Terminal },
                { name: "R Script", icon: Code },
                { name: "LaTeX Tables", icon: FileSpreadsheet },
                { name: "APA Methods", icon: GraduationCap },
                { name: "BibTeX", icon: Quote },
                { name: "JSON", icon: Braces },
              ] as const).map(({ name, icon: Ico }) => (
                <span key={name} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-bright)] bg-[var(--card)] text-xs font-medium">
                  <Ico size={14} className="text-[var(--primary)]" />
                  {name}
                </span>
              ))}
            </div>
            <Link
              href="/export"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-bright)] hover:border-[var(--primary)] hover:bg-[var(--accent)] transition-all"
            >
              <Download size={15} />
              Open Export Panel
            </Link>
          </div>
        </section>

        {/* ═══ AUTHOR ═══ */}
        <section className="px-8 py-16 border-t border-[var(--border)]">
          <div className="max-w-2xl mx-auto text-center">
            <img src="/aims-logo.png" alt="AIMS" className="w-16 h-16 object-contain mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-1">Ahmed Allem, Ph.D. Candidate</h3>
            <p className="text-sm text-[var(--primary)] mb-4">Stanford Center for Advanced Study in the Behavioral Sciences</p>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
              AIMS Toolkit is built by Ahmed Allem as part of the AI Methods for Social Scientists
              initiative at Stanford CASBS. The goal: give every behavioral researcher access to
              powerful computational methods — no coding skills required, no expensive licenses,
              no data privacy compromises.
            </p>
            <a
              href="https://kingallem.com/open-source"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-all"
            >
              <BookOpen size={16} />
              More Open-Source Projects
              <ArrowRight size={14} />
            </a>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="border-t border-[var(--border)] px-6 py-6 text-center">
          <p className="text-xs text-[var(--muted)]">
            Stanford AIMS Toolkit — Center for Advanced Study in the Behavioral Sciences
          </p>
          <p className="text-[10px] text-[var(--muted)] mt-1">
            Open source under MIT License &middot; Built with TypeScript, React 19, Next.js &middot; 8 packages, 265 tests
          </p>
          <p className="text-[10px] mt-2">
            <a href="https://kingallem.com/open-source" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
              kingallem.com/open-source
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  subtitle,
  description,
  href,
  highlighted,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-left p-6 rounded-2xl border transition-all group hover:scale-[1.02] active:scale-[0.98] block ${
        highlighted
          ? "border-[var(--primary)] bg-gradient-to-b from-[rgba(245,166,35,0.1)] to-[var(--card)]"
          : "border-[var(--border-bright)] bg-[var(--card)] hover:border-[var(--primary)]/50"
      }`}
    >
      <div className="w-11 h-11 rounded-xl bg-[var(--accent)] border border-[var(--border-bright)] flex items-center justify-center mb-4 text-[var(--primary)] group-hover:border-[var(--primary)]/40 transition-colors">
        {icon}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--primary)] mb-1">
        {subtitle}
      </div>
      <h3 className="font-bold text-base mb-2">{title}</h3>
      <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">
        {description}
      </p>
      <span className="text-xs text-[var(--primary)] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ArrowRight size={12} />
      </span>
    </Link>
  );
}
