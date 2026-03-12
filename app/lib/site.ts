const DEFAULT_SITE_URL = "http://localhost:3000";

export const siteIdentity = {
  name: "Editors Choice",
  alternateName: "SongFinder AI",
  description:
    "Find trending songs and music for reels and video edits. Built for video editors and creators - gym reels, bridal makeup, travel vlogs, road trips, cinematic, and social media content.",
  category: "Music discovery for creators",
  creatorName: "Jyotish Kumar",
  email: "kjyotish124@gmail.com",
  socialLinks: [
    "https://www.instagram.com/jk__editings?igsh=MWxieXpodWMzcnRp",
    "https://github.com/kjyotish",
    "https://www.linkedin.com/in/jyotish-kumar-aa723823a",
  ],
} as const;

const ensureProtocol = (value: string) => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
};

export const getSiteUrl = () => {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    DEFAULT_SITE_URL;

  return new URL(ensureProtocol(candidate));
};
