import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/app/components/PageShell";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { getSiteUrl } from "@/app/lib/site";

type ContentBlock =
  | { type: "title" | "subtitle" | "paragraph"; text: string }
  | { type: "chips" | "keywords"; items: string[] }
  | { type: "video" | "music" | "image" | "svg"; url: string; caption?: string }
  | { type: "custom"; data: Record<string, unknown> };

type InspirationPost = {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  blocks: ContentBlock[];
  keywords: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  created_at: string;
  updated_at: string | null;
};

async function getPost(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;

  const { data } = await supabaseAdmin
    .from("inspiration_content")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();

  return data as unknown as InspirationPost | null;
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: "Inspiration not found" };

  const canonical = new URL(`/inspiration/${post.id}`, getSiteUrl()).toString();
  const title = post.seo_title || `${post.title} | Editors Choice Inspiration`;
  const description = post.seo_description || post.summary || post.subtitle || post.title;

  return {
    title,
    description,
    keywords: post.seo_keywords || post.keywords || [],
    alternates: { canonical },
    openGraph: { title, description, type: "article", url: canonical },
    twitter: { card: "summary", title, description },
  };
}

export default async function InspirationDetailPage({ params }: Props) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  const canonical = new URL(`/inspiration/${post.id}`, getSiteUrl()).toString();
  const description = post.seo_description || post.summary || post.subtitle || post.title;
  const visibleBlocks = Array.isArray(post.blocks) ? post.blocks : [];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: post.title,
    description,
    url: canonical,
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: { "@type": "Organization", name: "Editors Choice" },
    keywords: (post.seo_keywords || post.keywords || []).join(", "),
  };

  return (
    <PageShell>
      <article className="mx-auto w-full max-w-4xl rounded-[30px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-6 shadow-xl sm:p-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Link href="/inspiration" className="text-sm font-medium text-[var(--md-primary)] hover:underline">
          ← Back to inspiration
        </Link>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">Inspiration</p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--md-text)] sm:text-4xl">{post.title}</h1>
        {post.subtitle && <p className="mt-3 text-lg text-[var(--md-text-muted)]">{post.subtitle}</p>}
        {post.summary && <p className="mt-5 text-base leading-7 text-[var(--md-text-muted)]">{post.summary}</p>}
        {Array.isArray(post.keywords) && post.keywords.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {post.keywords.map((keyword) => <span key={keyword} className="rounded-full border border-[var(--md-outline)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--md-text-muted)]">{keyword}</span>)}
          </div>
        )}
        <div className="mt-8 space-y-5">
          {visibleBlocks.map((block, index) => {
            if (block.type === "title") return <h2 key={index} className="text-2xl font-semibold">{block.text}</h2>;
            if (block.type === "subtitle") return <h3 key={index} className="text-lg font-semibold text-[var(--md-text-muted)]">{block.text}</h3>;
            if (block.type === "paragraph") return <p key={index} className="whitespace-pre-wrap text-[15px] leading-8 text-[var(--md-text)]">{block.text}</p>;
            if (block.type === "chips" || block.type === "keywords") return <div key={index} className="flex flex-wrap gap-2">{block.items.map((item) => <span key={item} className="rounded-full border border-[var(--md-outline)] px-3 py-1 text-xs text-[var(--md-text-muted)]">{item}</span>)}</div>;
            if ("url" in block && block.url) return <a key={index} href={block.url} target="_blank" rel="noreferrer" className="block rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4 text-sm text-[var(--md-primary)] hover:underline">{block.caption || `Open ${block.type} reference`}</a>;
            return null;
          })}
        </div>
      </article>
    </PageShell>
  );
}
