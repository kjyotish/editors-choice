import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "./lib/supabaseAdmin";
import { getSiteUrl } from "./lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const supabaseAdmin = getSupabaseAdmin();

  const entries: MetadataRoute.Sitemap = [
    {
      url: new URL("/", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: new URL("/ai-prompts", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: new URL("/blogs", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  if (supabaseAdmin) {
    const [blogResult, promptResult] = await Promise.all([
      supabaseAdmin
        .from("daily_blogs")
        .select("slug, updated_at, published_at, created_at")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false }),
      supabaseAdmin
        .from("ai_prompts")
        .select("id, updated_at, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false }),
    ]);

    const blogEntries = (blogResult.data || []).map((blog) => ({
      url: new URL(`/blogs/${blog.slug}`, siteUrl).toString(),
      lastModified: new Date(blog.updated_at || blog.published_at || blog.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const promptEntries = (promptResult.data || []).map((prompt) => ({
      url: new URL(`/ai-prompts/${prompt.id}`, siteUrl).toString(),
      lastModified: new Date(prompt.updated_at || prompt.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    entries.push(...blogEntries, ...promptEntries);
  }

  return entries;
}

