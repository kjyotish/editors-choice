import type { NextConfig } from "next";

const scriptSource = process.env.NODE_ENV === "production"
  ? "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; ${scriptSource}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com https://img.youtube.com https://i.ytimg.com https://is*.mzstatic.com; media-src 'self' blob: https://res.cloudinary.com; connect-src 'self' https://*.supabase.co https://www.google-analytics.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://drive.google.com; font-src 'self' data:; upgrade-insecure-requests` },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
  images: {
    dangerouslyAllowSVG: false,
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "is1-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is2-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is3-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is4-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is5-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is1.mzstatic.com" },
      { protocol: "https", hostname: "is2.mzstatic.com" },
      { protocol: "https", hostname: "is3.mzstatic.com" },
      { protocol: "https", hostname: "is4.mzstatic.com" },
      { protocol: "https", hostname: "is5.mzstatic.com" },
    ],
  },
};

export default nextConfig;
