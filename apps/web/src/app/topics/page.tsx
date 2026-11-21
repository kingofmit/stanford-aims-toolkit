"use client";

import { AppNav } from "@/components/layout/AppNav";
import { TopicExplorer } from "@/components/topics/TopicExplorer";

export default function TopicsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppNav />
      <main className="flex-1 overflow-hidden">
        <TopicExplorer />
      </main>
    </div>
  );
}
