"use client";

import { AppNav } from "@/components/layout/AppNav";
import { SurveyDashboard } from "@/components/survey/SurveyDashboard";

export default function SurveyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppNav />
      <main className="flex-1 overflow-hidden">
        <SurveyDashboard />
      </main>
    </div>
  );
}
