"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { BookOpen, CalendarDays, ChevronRight } from "lucide-react";
import type { DailyBlog } from "@/app/lib/blogs";

export default function DailyBlogsSection() {
  const [blogs, setBlogs] = useState<DailyBlog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadBlogs = async () => {
      try {
        const res = await fetch("/api/blogs?limit=3", { cache: "no-store" });
        const data = (await res.json()) as DailyBlog[] | { error?: string };
        if (!active) return;
        setBlogs(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setBlogs([]);
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
    <section className="mt-14 w-full rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-5 shadow-xl sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--md-text-muted)]">
            <BookOpen className="h-3.5 w-3.5 text-[var(--md-secondary)]" />
            Daily Blog
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--md-text)] sm:text-3xl">
            Fresh articles for creators and editors
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--md-text-muted)]">
            Publish daily updates, tips, and creator insights so your homepage stays active and content-rich for visitors and search crawlers.
          </p>
        </div>
        <Link
          href="/blogs"
          className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text)] transition-all hover:bg-[var(--md-surface-2)]"
        >
          View all blogs
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-5"
            >
              <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--md-surface-3)]" />
              <div className="mt-4 h-6 w-4/5 animate-pulse rounded-full bg-[var(--md-surface-3)]" />
              <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-[var(--md-surface-3)]" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-[var(--md-surface-3)]" />
            </div>
          ))}

        {!loading &&
          blogs.map((blog) => (
            <article
              key={blog.id}
              className="group rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-5 transition-all hover:-translate-y-1 hover:border-[rgba(124,131,255,0.45)]"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--md-text-muted)]">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(blog.published_at || blog.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[var(--md-text)]">
                <Link href={`/blogs/${blog.slug}`} className="transition-colors group-hover:text-white">
                  {blog.title}
                </Link>
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--md-text-muted)]">
                {blog.excerpt || "Daily editorial tips and creator guidance."}
              </p>
              {Array.isArray(blog.tags) && blog.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {blog.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--md-outline)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--md-text-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <Link
                href={`/blogs/${blog.slug}`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--md-secondary)]"
              >
                Read article
                <ChevronRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
      </div>

      {!loading && blogs.length === 0 && (
        <div className="mt-6 rounded-[22px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 text-sm text-[var(--md-text-muted)]">
          No published blogs yet. Use the admin dashboard to upload your first daily blog.
        </div>
      )}
    </section>
  );
}

