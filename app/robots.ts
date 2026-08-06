import { MetadataRoute } from "next";

function getSiteUrl() {
  return new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com"
  );
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/privacy", "/terms"],
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