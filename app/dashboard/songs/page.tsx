"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { createBrowserClient } from "@supabase/ssr";
import { BookOpenText, LayoutGrid, LogOut, Music, Sparkles } from "lucide-react";
import SongManager from "@/app/admin/songs/SongManager";
import type { SongItem } from "@/app/songs/songTypes";

export const dynamic = "force-dynamic";

export default function DashboardSongsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseAnonKey, supabaseUrl]);

  useEffect(() => {
    let active = true;

    const loadSongs = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/songs?all=1", { cache: "no-store" });
        const data = (await res.json()) as SongItem[] | { error?: string };
        if (!active) return;
        if (!Array.isArray(data)) {
          throw new Error(typeof data?.error === "string" ? data.error : "Failed to load songs.");
        }
        setItems(data);
        setLoadError(null);
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load songs.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadSongs();
    return () => {
      active = false;
    };
  }, []);

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
      <div className="mx-auto flex w-full max-w-6xl flex-1">
        <div className="grid w-full gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
              Admin
            </div>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/dashboard" className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[var(--md-text-muted)] transition-colors hover:bg-[var(--md-surface-2)] hover:text-[var(--md-text)]">
                <LayoutGrid className="h-4 w-4" />
                Dashboard
              </Link>
              <Link href="/dashboard/songs" className="flex items-center gap-2 rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-[var(--md-text)]">
                <Music className="h-4 w-4" />
                Song Upload
              </Link>
              <Link href="/dashboard/ai-prompts" className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[var(--md-text-muted)] transition-colors hover:bg-[var(--md-surface-2)] hover:text-[var(--md-text)]">
                <Sparkles className="h-4 w-4" />
                AI Prompt Upload
              </Link>
              <Link href="/admin/blogs" className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[var(--md-text-muted)] transition-colors hover:bg-[var(--md-surface-2)] hover:text-[var(--md-text)]">
                <BookOpenText className="h-4 w-4" />
                Daily Blogs
              </Link>
              <Link href="/admin/inspiration" className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[var(--md-text-muted)] transition-colors hover:bg-[var(--md-surface-2)] hover:text-[var(--md-text)]">
                <Sparkles className="h-4 w-4" />
                Inspiration Content
              </Link>
            </nav>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)] transition-all hover:border-[rgba(124,131,255,0.5)] hover:text-[var(--md-text)]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>

            {loadError && (
              <div className="mb-4 rounded-[12px] border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {loadError}
              </div>
            )}

            <SongManager items={items} loading={loading} />

            {message && (
              <div className="mt-4 rounded-[16px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                {message}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
