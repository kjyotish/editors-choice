"use client";
import React, { useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import TrendInsights from "../components/TrendInsights";
import { createBrowserClient } from "@supabase/ssr";
import { LogOut } from "lucide-react";

// Admin dashboard for managing trend insights.
export default function DashboardPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [message, setMessage] = useState("");
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  const handleLogout = async () => {
    if (!supabase) {
      setMessage("Supabase keys are missing. Check environment variables.");
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto w-full flex-1">
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)] hover:text-[var(--md-text)] hover:border-[rgba(124,131,255,0.5)] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
        <TrendInsights
          showCreate
          showDelete
          heading="Insights Dashboard"
          subheading="Upload, review, and remove market + psychology insights for creators."
        />
        {message && (
          <div className="mt-4 text-sm rounded-[16px] p-4 border text-red-300 border-red-500/20 bg-red-500/10">
            {message}
          </div>
        )}
      </div>
    </PageShell>
  );
}
