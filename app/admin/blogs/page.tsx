"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { BookOpenText, LayoutGrid, Sparkles } from "lucide-react";
import BlogManager, { type BlogItem } from "./BlogManager";

export default function AdminBlogsPage() {
  const [items, setItems] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadBlogs = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/blogs?all=1", { cache: "no-store" });
        const data = (await res.json()) as BlogItem[] | { error?: string };
        if (!active) return;
        if (!Array.isArray(data)) {
          throw new Error(typeof data?.error === "string" ? data.error : "Failed to load blogs.");
        }
        setItems(data);
        setLoadError(null);
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load blogs.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadBlogs();
    return () => {
      active = false;
    };
  }, []);

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
              <Link href="/admin/blogs" className="flex items-center gap-2 rounded-[12px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-[var(--md-text)]">
                <BookOpenText className="h-4 w-4" />
                Daily Blogs
              </Link>
              <Link href="/admin/inspiration" className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[var(--md-text-muted)] transition-colors hover:bg-[var(--md-surface-2)] hover:text-[var(--md-text)]">
                <Sparkles className="h-4 w-4" />
                Inspiration Content
              </Link>
            </nav>
          </aside>

          <section className="space-y-6">
            {loadError && (
              <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {loadError}
              </div>
            )}
            <BlogManager items={items} loading={loading} />
          </section>
        </div>
      </div>
    </PageShell>
  );
}

