import type { MetadataRoute } from "next";
import { getSiteUrl } from "./lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return [
    {
      url: new URL("/", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
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
      url: new URL("/privacy", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
