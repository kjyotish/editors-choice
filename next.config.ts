import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
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
