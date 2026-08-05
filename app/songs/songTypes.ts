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
  description: string | null;
};

export const defaultSongCategories: SongCategory[] = [
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

export const songCategories = defaultSongCategories;

const defaultCategoryOrder = new Map(
  defaultSongCategories.map((category, index) => [category.key, index]),
);

const youtubeIdPatterns = [
  /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/i,
  /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/i,
  /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/i,
  /(?:youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
];

export function getSongCategoryLabel(
  category: string,
  categories: SongCategory[] = songCategories,
) {
  return getSongCategoryLabelFromCategories(category, categories);
}

export function getSongCategoryLabelFromCategories(category: string, categories: SongCategory[]) {
  const matched = categories.find((item) => item.key === category);
  if (matched?.label) return matched.label;
  return createSongCategoryLabel(category);
}

export function mergeSongCategories(...collections: SongCategory[][]) {
  const map = new Map<string, SongCategory>();

  for (const collection of collections) {
    for (const category of collection) {
      if (!category?.key) continue;
      if (!map.has(category.key)) {
        map.set(category.key, {
          key: category.key,
          label: category.label || createSongCategoryLabel(category.key),
          description: category.description ?? null,
        });
      }
    }
  }

  return Array.from(map.values()).sort((left, right) => {
    const leftDefault = defaultCategoryOrder.get(left.key);
    const rightDefault = defaultCategoryOrder.get(right.key);

    if (leftDefault !== undefined || rightDefault !== undefined) {
      if (leftDefault === undefined) return 1;
      if (rightDefault === undefined) return -1;
      return leftDefault - rightDefault;
    }

    return left.label.localeCompare(right.label);
  });
}

export function normalizeSongCategoryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function createSongCategoryLabel(value: string) {
  const normalized = value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return "";

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isValidSongCategory(category: string) {
  return normalizeSongCategoryKey(category).length > 0;
}

export function formatSongTimestamp(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
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
