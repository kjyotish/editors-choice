import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Editors Choice",
  description:
    "Find trending, latest, and personalized songs for reels and video edits—gym reels, bridal makeup, travel vlogs, road trips, cinematic, music, food videos, and social media content. Built for video editors, influencers, and creators.",
  keywords: [
    "reels music",
    "trending songs",
    "latest songs",
    "personalized music",
    "video editing music",
    "gym reel songs",
    "bridal makeup reel songs",
    "travel vlog music",
    "road trip music",
    "cinematic music",
    "food video music",
    "social media reel editing",
    "video editors",
    "social media influencers",
    "video creators",
  ],
};

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
