import { MetadataRoute } from "next";
import { getSiteUrl } from "./lib/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/login", "/reset-password"],
      },

      // OpenAI / ChatGPT
      {
        userAgent: "GPTBot",
        allow: "/",
      },

      // Google
      {
        userAgent: "Googlebot",
        allow: "/",
      },

      // Bing / Copilot
      {
        userAgent: "Bingbot",
        allow: "/",
      },

      // Anthropic Claude
      {
        userAgent: "ClaudeBot",
        allow: "/",
      },

      // Perplexity
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },

      // Common Crawl
      {
        userAgent: "CCBot",
        allow: "/",
      },

      // Apple
      {
        userAgent: "Applebot",
        allow: "/",
      },
    ],

    sitemap: `${siteUrl.toString()}/sitemap.xml`,

    host: siteUrl.toString(),
  };
}
