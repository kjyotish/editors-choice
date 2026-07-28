export type SongItem = {
  id: string;
  title: string;
  artist_name: string | null;
  category: string;
  rating: number;
  youtube_url: string;
  youtube_embed_url: string;
  thumbnail_url: string | null;
  search_text: string;
  published: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type SongCategory = {
  key: string;
  label: string;
  description: string;
};

export const songCategoryKeys = ["travel", "golden_hour", "bridal", "food"] as const;
export type SongCategoryKey = (typeof songCategoryKeys)[number];

export const songCategories: SongCategory[] = [
  {
    key: "travel",
    label: "Travel",
    description: "Road trip, vlog, and destination edits.",
  },
  {
    key: "golden_hour",
    label: "Golden Hour",
    description: "Warm sunset mood and dreamy transitions.",
  },
  {
    key: "bridal",
    label: "Bridal",
    description: "Romantic wedding and pre-wedding edits.",
  },
  {
    key: "food",
    label: "Food",
    description: "Tasteful, playful, and social-first food cuts.",
  },
];

const youtubeIdPatterns = [
  /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/i,
  /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/i,
  /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/i,
  /(?:youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
];

export function getSongCategoryLabel(category: string) {
  return songCategories.find((item) => item.key === category)?.label ?? category;
}

export function isValidSongCategory(category: string): category is SongCategoryKey {
  return songCategoryKeys.includes(category as SongCategoryKey);
}

export function normalizeSongSearchText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildSongSearchText({
  title,
  artistName,
  category,
  searchTerms,
}: {
  title: string;
  artistName?: string | null;
  category: string;
  searchTerms?: string | null;
  }) {
  return normalizeSongSearchText([title, artistName, category, searchTerms].filter(Boolean).join(" "));
}

export function clampSongRating(value: number) {
  if (!Number.isFinite(value)) return 5;
  const rounded = Math.round(value);
  return Math.min(Math.max(rounded, 1), 10);
}

export function getYouTubeVideoId(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  for (const pattern of youtubeIdPatterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  try {
    const parsed = new URL(trimmed);
    const directId = parsed.searchParams.get("v");
    if (directId) return directId;
  } catch {
    // Fall through.
  }

  return "";
}

export function getYouTubeEmbedUrl(url: string) {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : url.trim();
}

export function getYouTubeThumbnailUrl(url: string) {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}
