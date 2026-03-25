import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "./lib/supabaseAdmin";
import { getSiteUrl } from "./lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const supabaseAdmin = getSupabaseAdmin();

  let blogEntries: MetadataRoute.Sitemap = [
    {
      url: new URL("/blogs", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
  ];

  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("daily_blogs")
      .select("slug, updated_at, published_at, created_at")
      .eq("published", true)
      .order("published_at", { ascending: false, nullsFirst: false });

    blogEntries = blogEntries.concat(
      (data || []).map((blog) => ({
        url: new URL(`/blogs/${blog.slug}`, siteUrl).toString(),
        lastModified: new Date(blog.updated_at || blog.published_at || blog.created_at),
        changeFrequency: "weekly",
        priority: 0.8,
      })),
    );
  }

  return [
    {
      url: new URL("/", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...blogEntries,
    {
      url: new URL("/inspiration", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: new URL("/help", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: new URL("/contact", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL("/about", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: new URL("/terms", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: new URL("/privacy", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}

