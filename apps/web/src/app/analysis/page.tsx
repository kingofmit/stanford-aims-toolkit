"use client";

import { AppNav } from "@/components/layout/AppNav";
import { TextAnalyzer } from "@/components/analysis/TextAnalyzer";

export default function AnalysisPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppNav />
      <main className="flex-1 overflow-hidden">
        <TextAnalyzer />
      </main>
    </div>
  );
}
