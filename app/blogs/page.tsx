import Link from "next/link";
import PageShell from "@/app/components/PageShell";
import { getSupabaseAdminOrThrow } from "@/app/lib/authServer";
import type { DailyBlog } from "@/app/lib/blogs";
import { BookOpen, CalendarDays, ChevronRight } from "lucide-react";

export const revalidate = 300;

async function getBlogs() {
  const supabaseAdmin = getSupabaseAdminOrThrow();
  const { data, error } = await supabaseAdmin
    .from("daily_blogs")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as DailyBlog[];
}

export default async function BlogsPage() {
  const blogs = await getBlogs();

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-xl sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--md-text-muted)]">
            <BookOpen className="h-3.5 w-3.5 text-[var(--md-secondary)]" />
            Creator Blog
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--md-text)] sm:text-4xl">
            Articles for creators and video editors
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--md-text-muted)]">
            Read practical posts about song selection, editing workflow, creative direction, and
            publishing ideas for short-form video content.
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          {blogs.map((blog) => (
            <article
              key={blog.id}
              className="rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--md-text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(blog.published_at || blog.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {Array.isArray(blog.tags) && blog.tags.length > 0 && (
                  <span>{blog.tags.slice(0, 3).join(" • ")}</span>
                )}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--md-text)]">
                <Link href={`/blogs/${blog.slug}`}>{blog.title}</Link>
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--md-text-muted)]">
                {blog.excerpt}
              </p>
              <Link
                href={`/blogs/${blog.slug}`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--md-secondary)]"
              >
                Read full article
                <ChevronRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        {blogs.length === 0 && (
          <div className="mt-8 rounded-[24px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface)] p-6 text-sm text-[var(--md-text-muted)]">
            No articles are published yet.
          </div>
        )}
      </section>
    </PageShell>
  );
}

