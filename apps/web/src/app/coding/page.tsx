"use client";

import Link from "next/link";
import { CodingWorkspace } from "@/components/coding/CodingWorkspace";

export default function CodingPage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="border-b px-4 py-2 flex items-center gap-3 bg-[var(--background)] shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <img src="/aims-logo.png" alt="AIMS" className="w-6 h-6 object-contain" />
          <span>AIMS</span>
        </Link>
        <div className="h-4 w-px bg-[var(--border)]" />
        <span className="text-sm font-medium">Qualitative Coding</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodingWorkspace />
      </div>
    </div>
  );
}
