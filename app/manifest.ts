import type { MetadataRoute } from "next";
import { getSiteUrl } from "./lib/site";

export default function manifest(): MetadataRoute.Manifest {
  const siteUrl = getSiteUrl();

  return {
    name: "Editors Choice",
    short_name: "Editors Choice",
    description:
      "Find trending songs and music for reels and video edits.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [
      {
        src: new URL("/icon.png", siteUrl).toString(),
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: new URL("/favicon.ico", siteUrl).toString(),
        sizes: "48x48 32x32 16x16",
        type: "image/x-icon",
      },
      {
        src: new URL("/icon.svg", siteUrl).toString(),
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
