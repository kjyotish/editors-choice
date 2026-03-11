import type { Metadata } from "next";
import { headers } from "next/headers";

type InspirationSeo = {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  title?: string | null;
  summary?: string | null;
};

const buildOrigin = async () => {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const origin = await buildOrigin();
    if (!origin) {
      return {
        title: "Inspiration Library",
        description: "Professional inspiration, tips, and ideas for video edits.",
      };
    }
    const res = await fetch(`${origin}/api/inspiration-content`, {
      next: { revalidate: 300 },
    });
    const data = (await res.json()) as InspirationSeo[];
    const first = data?.[0];
    const title = first?.seo_title || "Inspiration Library";
    const description =
      first?.seo_description ||
      first?.summary ||
      "Professional inspiration, tips, and ideas for video edits.";
    const keywords = first?.seo_keywords || [];
    return {
      title,
      description,
      keywords,
      openGraph: {
        title,
        description,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Inspiration Library",
      description: "Professional inspiration, tips, and ideas for video edits.",
    };
  }
}

export default function InspirationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
