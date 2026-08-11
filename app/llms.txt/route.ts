import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { getSiteUrl } from "@/app/lib/site";

export const revalidate = 300;

export async function GET() {
  const siteUrl = getSiteUrl();
  const supabaseAdmin = getSupabaseAdmin();
  const lines = [
    "# Editors Choice",
    "> A creative resource for video editors and content creators, with song discovery, AI prompts, commercials, and editorial guides.",
    "",
    "## Core pages",
    `- [Home](${new URL("/", siteUrl)})`,
    `- [AI Prompts](${new URL("/ai-prompts", siteUrl)})`,
    `- [Commercial](${new URL("/inspiration", siteUrl)})`,
    `- [Blogs](${new URL("/blogs", siteUrl)})`,
    "",
    "## Published content",
  ];

  if (supabaseAdmin) {
    const [prompts, blogs, inspiration] = await Promise.all([
      supabaseAdmin.from("ai_prompts").select("id, title").eq("published", true).order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("daily_blogs").select("slug, title").eq("published", true).order("published_at", { ascending: false }).limit(100),
      supabaseAdmin.from("inspiration_content").select("id, title").eq("published", true).order("created_at", { ascending: false }).limit(100),
    ]);
    for (const prompt of prompts.data || []) lines.push(`- [${prompt.title}](${new URL(`/ai-prompts/${prompt.id}`, siteUrl)})`);
    for (const blog of blogs.data || []) lines.push(`- [${blog.title}](${new URL(`/blogs/${blog.slug}`, siteUrl)})`);
    for (const item of inspiration.data || []) lines.push(`- [${item.title}](${new URL(`/inspiration/${item.id}`, siteUrl)})`);
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
