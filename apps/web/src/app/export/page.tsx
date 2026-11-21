"use client";

import { AppNav } from "@/components/layout/AppNav";
import { ExportPanel } from "@/components/export/ExportPanel";

export default function ExportPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppNav />
      <main className="flex-1 overflow-hidden">
        <ExportPanel />
      </main>
    </div>
  );
}
