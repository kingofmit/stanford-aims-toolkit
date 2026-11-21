"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  MessageSquareCode,
  Brain,
  BarChart3,
  Sparkles,
  Download,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/data", label: "Data", icon: FileText },
  { href: "/coding", label: "Coding", icon: MessageSquareCode },
  { href: "/topics", label: "Topics", icon: Brain },
  { href: "/survey", label: "Survey", icon: BarChart3 },
  { href: "/analysis", label: "Text Analysis", icon: Sparkles },
  { href: "/export", label: "Export", icon: Download },
];

export function AppNav() {
  const pathname = usePathname();

  return (
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
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === href
                ? "bg-[var(--accent)] text-[var(--foreground)] font-medium"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]"
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
