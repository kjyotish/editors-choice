const DEFAULT_SITE_URL = "http://localhost:3000";

export const siteIdentity = {
  name: "Editors Choice",
  alternateName: "SongFinder AI",
  description:
    "Creative resources for video editors and content creators: curated song discovery, AI prompts, editing inspiration, and practical workflow guides.",
  category: "Creative tools and editorial resources for video editors",
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
