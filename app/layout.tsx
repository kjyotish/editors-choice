import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { getSiteUrl } from "./lib/site";

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
    "Find trending songs and music for reels and video edits. Built for video editors and creators - gym reels, bridal makeup, travel vlogs, road trips, cinematic, and social media content.";
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
    const siteUrl = origin || getSiteUrl().toString();
    if (!origin) {
      return {
        metadataBase: new URL(siteUrl),
        title: baseTitle,
        description: baseDescription,
        keywords: baseKeywords,
        alternates: {
          canonical: "/",
        },
        manifest: "/manifest.webmanifest",
        icons: {
          icon: [
            { url: "/favicon.ico", sizes: "any" },
            { url: "/icon.svg", type: "image/svg+xml" },
          ],
          shortcut: "/favicon.ico",
        },
      };
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
      metadataBase: new URL(siteUrl),
      title: baseTitle,
      description: baseDescription,
      keywords,
      alternates: {
        canonical: "/",
      },
      manifest: "/manifest.webmanifest",
      icons: {
        icon: [
          { url: "/favicon.ico", sizes: "any" },
          { url: "/icon.svg", type: "image/svg+xml" },
        ],
        shortcut: "/favicon.ico",
      },
      openGraph: {
        title: baseTitle,
        description: baseDescription,
        type: "website",
        url: "/",
      },
      twitter: {
        card: "summary_large_image",
        title: baseTitle,
        description: baseDescription,
      },
    };
  } catch {
    return {
      metadataBase: getSiteUrl(),
      title: baseTitle,
      description: baseDescription,
      keywords: baseKeywords,
      alternates: {
        canonical: "/",
      },
      manifest: "/manifest.webmanifest",
      icons: {
        icon: [
          { url: "/favicon.ico", sizes: "any" },
          { url: "/icon.svg", type: "image/svg+xml" },
        ],
        shortcut: "/favicon.ico",
      },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RWDNNPBPN2"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-RWDNNPBPN2');`}
        </Script>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
