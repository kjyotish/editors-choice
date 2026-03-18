import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { getSiteUrl, siteIdentity } from "./lib/site";

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
  const baseTitle =
    "Find Trending Songs | Recommended for Editors or Creators | Editors Choice";
  const baseDescription = siteIdentity.description;
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
        applicationName: siteIdentity.name,
        authors: [{ name: siteIdentity.creatorName }],
        creator: siteIdentity.creatorName,
        publisher: siteIdentity.name,
        category: siteIdentity.category,
        alternates: {
          canonical: "/",
        },
        manifest: "/manifest.webmanifest",
        icons: {
          icon: [
            { url: "/favicon.ico", type: "image/x-icon", sizes: "48x48" },
            { url: "/icon.png", type: "image/png", sizes: "512x512" },
          ],
          shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
          apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
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
      applicationName: siteIdentity.name,
      authors: [{ name: siteIdentity.creatorName }],
      creator: siteIdentity.creatorName,
      publisher: siteIdentity.name,
      category: siteIdentity.category,
      alternates: {
        canonical: "/",
      },
      manifest: "/manifest.webmanifest",
      icons: {
        icon: [
          { url: "/favicon.ico", type: "image/x-icon", sizes: "48x48" },
          { url: "/icon.png", type: "image/png", sizes: "512x512" },
        ],
        shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
        apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
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
      applicationName: siteIdentity.name,
      authors: [{ name: siteIdentity.creatorName }],
      creator: siteIdentity.creatorName,
      publisher: siteIdentity.name,
      category: siteIdentity.category,
      alternates: {
        canonical: "/",
      },
      manifest: "/manifest.webmanifest",
      icons: {
        icon: [
          { url: "/favicon.ico", type: "image/x-icon", sizes: "48x48" },
          { url: "/icon.png", type: "image/png", sizes: "512x512" },
        ],
        shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
        apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
      },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = getSiteUrl();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": new URL("/#organization", siteUrl).toString(),
    name: siteIdentity.name,
    alternateName: siteIdentity.alternateName,
    url: siteUrl.toString(),
    logo: new URL("/icon.png", siteUrl).toString(),
    image: new URL("/icon.png", siteUrl).toString(),
    description: siteIdentity.description,
    email: siteIdentity.email,
    sameAs: [...siteIdentity.socialLinks],
    founder: {
      "@type": "Person",
      name: siteIdentity.creatorName,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: siteIdentity.email,
        availableLanguage: ["en"],
      },
    ],
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": new URL("/#website", siteUrl).toString(),
    url: siteUrl.toString(),
    name: siteIdentity.name,
    alternateName: siteIdentity.alternateName,
    description: siteIdentity.description,
    publisher: {
      "@id": new URL("/#organization", siteUrl).toString(),
    },
    inLanguage: "en",
  };
  const webApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteIdentity.name,
    alternateName: siteIdentity.alternateName,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: siteUrl.toString(),
    description: siteIdentity.description,
    publisher: {
      "@id": new URL("/#organization", siteUrl).toString(),
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationJsonLd) }}
        />
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

