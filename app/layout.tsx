import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

type InspirationSeo = {
  seo_keywords?: string[] | null;
};

const buildOrigin = async () => {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
};

export async function generateMetadata(): Promise<Metadata> {
  const baseTitle = "Editors Choice";
  const baseDescription =
    "Find trending songs and music for reels and video edits. Built for video editors and creators?gym reels, bridal makeup, travel vlogs, road trips, cinematic, and social media content.";
  const baseKeywords = [
    "reels music",
    "trending songs",
    "latest songs",
    "video editing music",
    "video editors",
    "social media creators",
    "music for video editing",
    "songs for reels",
    "editor songs",
    "music for editors",
  ];

  try {
    const origin = await buildOrigin();
    if (!origin) {
      return { title: baseTitle, description: baseDescription, keywords: baseKeywords };
    }
    const res = await fetch(`${origin}/api/inspiration-content`, {
      next: { revalidate: 300 },
    });
    const data = (await res.json()) as InspirationSeo[];
    const keywordSet = new Set(baseKeywords);
    data?.forEach((item) => {
      item?.seo_keywords?.forEach((word) => keywordSet.add(word));
    });
    const keywords = Array.from(keywordSet).slice(0, 25);
    return {
      title: baseTitle,
      description: baseDescription,
      keywords,
      openGraph: {
        title: baseTitle,
        description: baseDescription,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: baseTitle,
        description: baseDescription,
      },
    };
  } catch {
    return { title: baseTitle, description: baseDescription, keywords: baseKeywords };
  }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
