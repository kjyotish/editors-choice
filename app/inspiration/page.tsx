"use client";
import {
  Lightbulb,
  Film,
  Sparkles,
  Music,
  Wand2,
  Camera,
  Download,
  ExternalLink,
  Lock,
  Search,
} from "lucide-react";
import Link from "next/link";
import PageShell from "../components/PageShell";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Block =
  | { type: "title" | "subtitle" | "paragraph"; text: string }
  | { type: "video" | "music" | "image" | "svg"; url: string; caption?: string }
  | { type: "chips" | "keywords"; items: string[] }
  | { type: "custom"; data: Record<string, unknown> };

type InspirationItem = {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  blocks: Block[];
  keywords: string[] | null;
  view_count: number;
};

type InspirationResponse = {
  items: InspirationItem[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

const CACHE_KEY = "ec_inspiration_pages";
const CACHE_AT_KEY = "ec_inspiration_pages_at";
const CACHE_META_KEY = "ec_inspiration_pages_meta";
const CACHE_TTL_MS = 10 * 60 * 1000;

const isSafeImageUrl = (value: string) => {
  const normalized = normalizeMediaUrl(value);
  if (!normalized) return false;
  if (normalized.startsWith("data:image/")) return true;
  if (normalized.startsWith("/")) return true;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const normalizeMediaUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.|youtu\.be|youtube\.com|vimeo\.com|drive\.google\.com|res\.cloudinary\.com|cloudinary\.com)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

const getYouTubeEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(normalizeMediaUrl(url));
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/watch")) {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/").filter(Boolean)[1];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return url;
      }
    }
  } catch {
    return null;
  }
  return null;
};

const isPortraitVideoUrl = (url: string) => {
  const normalized = normalizeMediaUrl(url).toLowerCase();
  return (
    normalized.includes("/shorts/") ||
    normalized.includes("instagram.com/reel") ||
    normalized.includes("instagram.com/p/") ||
    normalized.includes("tiktok.com/")
  );
};

const getVimeoEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(normalizeMediaUrl(url));
    if (!parsed.hostname.includes("vimeo.com")) return null;
    const id = parsed.pathname.split("/").filter(Boolean).pop();
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
};

const getGoogleDriveEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(normalizeMediaUrl(url));
    if (!parsed.hostname.includes("drive.google.com")) return null;

    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) {
      return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    }

    const id = parsed.searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  } catch {
    return null;
  }
};

const isCloudinaryVideoUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("res.cloudinary.com") &&
      /\/video\/upload\//i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
};

const isDirectMediaFile = (url: string) =>
  /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || isCloudinaryVideoUrl(url);

const isDirectAudioFile = (url: string) => /\.(mp3|wav|aac|m4a|ogg|flac)(\?.*)?$/i.test(url);

const isHttpMediaUrl = (url: string) => {
  try {
    const parsed = new URL(normalizeMediaUrl(url));
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "inspiration-media";

const getFileExtension = (url: string, fallback: string) => {
  try {
    const pathname = new URL(normalizeMediaUrl(url)).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match?.[1] ? `.${match[1].toLowerCase()}` : fallback;
  } catch {
    return fallback;
  }
};

const getDownloadFilename = (
  itemTitle: string,
  blockType: "image" | "svg" | "video" | "music",
  index: number,
  url: string,
) => {
  const fallbackExtension =
    blockType === "music"
      ? ".mp3"
      : blockType === "video"
        ? ".mp4"
        : blockType === "svg"
          ? ".svg"
          : ".jpg";
  return `${slugify(itemTitle)}-${blockType}-${index + 1}${getFileExtension(url, fallbackExtension)}`;
};

const buildProtectedDownloadHref = (url: string, filename: string) =>
  `/api/media-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

const getEmbedType = (url: string) => {
  const normalizedUrl = normalizeMediaUrl(url);
  const youtube = getYouTubeEmbedUrl(url);
  if (youtube) {
    return {
      type: "youtube" as const,
      src: youtube,
      aspectClass: isPortraitVideoUrl(url) ? "pt-[177.78%]" : "pt-[56.25%]",
      frameClass: isPortraitVideoUrl(url) ? "mx-auto max-w-[22rem]" : "w-full",
    };
  }

  const vimeo = getVimeoEmbedUrl(url);
  if (vimeo) {
    return {
      type: "vimeo" as const,
      src: vimeo,
      aspectClass: "pt-[56.25%]",
      frameClass: "w-full",
    };
  }

  const googleDrive = getGoogleDriveEmbedUrl(url);
  if (googleDrive) {
    return {
      type: "drive" as const,
      src: googleDrive,
      aspectClass: isPortraitVideoUrl(url) ? "pt-[177.78%]" : "pt-[56.25%]",
      frameClass: isPortraitVideoUrl(url) ? "mx-auto max-w-[22rem]" : "w-full",
    };
  }

  if (isDirectMediaFile(normalizedUrl)) {
    return {
      type: "direct" as const,
      src: normalizedUrl,
      aspectClass: "",
      frameClass: isPortraitVideoUrl(url) ? "mx-auto max-w-[22rem]" : "w-full",
    };
  }

  return { type: "external" as const, src: normalizedUrl, aspectClass: "", frameClass: "w-full" };
};

const inspirationSets = [
  {
    title: "Cinematic Travel",
    description:
      "Slow push-ins, wide establishing shots, and clean match cuts. Pair with ambient or orchestral builds.",
    tags: ["golden hour", "drone", "wide shots"],
    icon: Film,
  },
  {
    title: "Gym Reels",
    description:
      "Hard cuts on beat drops, close-ups on motion, and aggressive speed ramps.",
    tags: ["energetic", "bass hit", "speed ramp"],
    icon: Sparkles,
  },
  {
    title: "Bridal & Makeup",
    description:
      "Soft fades, glow highlights, and micro slow-mo for detail reveals.",
    tags: ["romantic", "soft light", "beauty"],
    icon: Wand2,
  },
  {
    title: "Food & Cafe",
    description:
      "Macro shots, quick whip pans, and subtle sound design for sizzle.",
    tags: ["warm tones", "macro", "texture"],
    icon: Camera,
  },
];

const editRecipes = [
  {
    title: "3-Beat Hook",
    description:
      "Open with the strongest shot, cut to a tight detail on beat 2, then reveal the full scene on beat 3.",
  },
  {
    title: "Momentum Stack",
    description:
      "Chain 5-7 fast cuts (0.3-0.6s) before the chorus, then slow to 1.2-1.6s for impact.",
  },
  {
    title: "Texture Sandwich",
    description:
      "Wide shot -> texture/detail -> wide shot. Keeps viewers grounded while showing craft.",
  },
];

const musicStarters = [
  "Search with the category + feeling + one depth tag.",
  "Use a viral hashtag for discovery, then switch to classic for evergreen picks.",
  "If a song feels close, try changing only the language to widen results.",
];

const PAGE_SIZE = 6;

// Editing inspiration page to spark ideas and structure.
export default function InspirationPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseAnonKey, supabaseUrl]);
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [keywordQuery, setKeywordQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [preferSimpleMedia, setPreferSimpleMedia] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const mediaElementsRef = useRef(new Map<string, HTMLMediaElement>());
  const viewedPostsRef = useRef(new Set<string>());
  const pendingViewedPostsRef = useRef(new Set<string>());
  const isRequestingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const registerMediaElement =
    (key: string) => (element: HTMLMediaElement | null) => {
      if (element) {
        mediaElementsRef.current.set(key, element);
        return;
      }
      mediaElementsRef.current.delete(key);
    };

  const pauseOtherMedia = (activeKey: string) => {
    mediaElementsRef.current.forEach((element, key) => {
      if (key !== activeKey && !element.paused) {
        element.pause();
      }
    });
  };

  const updateCachedItems = (nextItems: InspirationItem[]) => {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(nextItems));
    } catch {
      // ignore cache write failures
    }
  };

  const startProtectedDownload = (sourceUrl: string, filename: string) => {
    const normalized = normalizeMediaUrl(sourceUrl);
    if (!normalized || typeof window === "undefined") return;

    if (!hasSession) {
      window.location.href = `/login?redirectTo=${encodeURIComponent("/inspiration")}`;
      return;
    }

    const resolvedUrl = normalized.startsWith("/")
      ? `${window.location.origin}${normalized}`
      : normalized;
    const link = document.createElement("a");
    link.href = buildProtectedDownloadHref(resolvedUrl, filename);
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const incrementPostView = async (id: string) => {
    if (viewedPostsRef.current.has(id) || pendingViewedPostsRef.current.has(id)) {
      return;
    }

    pendingViewedPostsRef.current.add(id);

    try {
      const res = await fetch("/api/inspiration-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "increment-view" }),
      });

      if (!res.ok) return;

      const data = (await res.json()) as { id?: string; view_count?: number };
      if (!data?.id || typeof data.view_count !== "number") return;

      viewedPostsRef.current.add(data.id);

      setItems((prev) => {
        const nextItems = prev.map((item) =>
          item.id === data.id ? { ...item, view_count: data.view_count || 0 } : item,
        );
        updateCachedItems(nextItems);
        return nextItems;
      });
    } catch {
      // ignore view update failures
    } finally {
      pendingViewedPostsRef.current.delete(id);
    }
  };

  const stats = useMemo(() => {
    const totals = { posts: items.length, videos: 0, music: 0, images: 0, words: 0 };
    items.forEach((item) => {
      item.blocks?.forEach((block) => {
        if (block.type === "video") totals.videos += 1;
        if (block.type === "music") totals.music += 1;
        if (block.type === "image" || block.type === "svg") totals.images += 1;
        if (block.type === "paragraph") {
          totals.words += block.text.split(/\s+/).filter(Boolean).length;
        }
      });
    });
    return totals;
  }, [items]);

  const handleSearch = (value: string) => {
    setKeywordQuery(value.trim());
    setOffset(0);
    setHasMore(true);
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const loadPage = async (
    nextOffset: number,
    nextQuery: string,
    signal?: AbortSignal,
  ) => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;

    try {
      setLoading(true);

      const params = new URLSearchParams({
        offset: String(nextOffset),
        limit: String(PAGE_SIZE),
      });
      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      const res = await fetch(`/api/inspiration-content?${params}`, { signal });
      const data = (await res.json()) as InspirationResponse;
      if (!Array.isArray(data?.items)) {
        return;
      }

      setItems(data.items);
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(data.items));
        window.localStorage.setItem(CACHE_AT_KEY, String(Date.now()));
        window.localStorage.setItem(
          CACHE_META_KEY,
          JSON.stringify({
            total: data.total,
            offset: nextOffset,
            hasMore: data.hasMore,
            query: nextQuery,
          }),
        );
      } catch {
        // ignore cache write failures
      }
      setTotal(data.total || 0);
      setOffset(nextOffset);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    } finally {
      isRequestingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    const updateMediaMode = () => {
      setPreferSimpleMedia(window.innerWidth < 768);
    };

    updateMediaMode();
    window.addEventListener("resize", updateMediaMode);
    return () => window.removeEventListener("resize", updateMediaMode);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setHasSession(false);
      setAuthChecked(true);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.session));
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setAuthChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(CACHE_KEY);
      const cachedAt = window.localStorage.getItem(CACHE_AT_KEY);
      const cachedMeta = window.localStorage.getItem(CACHE_META_KEY);
      if (cached && cachedAt && cachedMeta && Date.now() - Number(cachedAt) < CACHE_TTL_MS) {
        const parsedItems = JSON.parse(cached) as InspirationItem[];
        const parsedMeta = JSON.parse(cachedMeta) as {
          total?: number;
          offset?: number;
          hasMore?: boolean;
          pageSize?: number;
          query?: string;
        };
        if (Array.isArray(parsedItems)) {
          setItems(parsedItems);
          setTotal(Number(parsedMeta.total || parsedItems.length));
          setOffset(Number(parsedMeta.offset || 0));
          setHasMore(Boolean(parsedMeta.hasMore));
          setKeywordQuery(String(parsedMeta.query || ""));
          setSearchInput(String(parsedMeta.query || ""));
          setLoading(false);
          initialLoadDoneRef.current = true;
          return;
        }
      }
    } catch {
      // ignore cache read failures
    }

    const controller = new AbortController();
    initialLoadDoneRef.current = true;
    loadPage(0, "", controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void loadPage(offset, keywordQuery, controller.signal);
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [keywordQuery, offset]);

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto w-full flex-1">
        <header className="mb-12">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-5 backdrop-blur-xl">
                <Lightbulb className="w-4 h-4 text-[var(--md-secondary)]" />
                <span className="text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.3em]">
                  Editing Inspiration
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3">
                Inspiration Library
              </h1>
              <p className="text-[var(--md-text-muted)] text-base max-w-2xl">
                Professional-grade ideas, tips, and creative references for video edits.
                Curated to keep your content fresh, clear, and on-trend.
              </p>
            </div>
            <div className="bg-[var(--md-surface)] border border-[var(--md-outline)] rounded-[22px] p-5 sm:p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-[var(--md-text-muted)]">Posts</div>
                  <div className="text-2xl font-semibold">{loading ? "..." : total || stats.posts}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--md-text-muted)]">Words</div>
                  <div className="text-2xl font-semibold">{stats.words}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--md-text-muted)]">Videos</div>
                  <div className="text-2xl font-semibold">{stats.videos}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--md-text-muted)]">Media</div>
                  <div className="text-2xl font-semibold">
                    {stats.images + stats.music}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-[var(--md-text-muted)]">
                Content loads progressively and is cached on your device for faster revisit sessions.
              </p>
            </div>
          </div>
        </header>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold">
              Latest Inspiration
            </h2>
            <span className="text-xs text-[var(--md-text-muted)]">
              {loading ? "Loading..." : `${items.length} shown${total ? ` of ${total}` : ""}`}
            </span>
          </div>
          <form
            className="mb-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch(searchInput);
            }}
          >
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="enter editing type... "
              className="w-full rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--md-primary)]"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[var(--md-primary)] bg-[var(--md-primary)] px-5 py-3 text-sm font-medium text-white transition-all hover:opacity-90 sm:min-w-[120px]"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>
          <div className="mb-4 flex items-center gap-2 rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-3 text-xs text-[var(--md-text-muted)]">
            <Lock className="h-4 w-4 text-[var(--md-primary)]" />
            <span>
              {authChecked && hasSession
                ? "You are signed in. Media downloads are enabled."
                : "Sign in or create an email account before downloading media."}
            </span>
          </div>
          {items.length === 0 && !loading ? (
            <div className="text-sm text-[var(--md-text-muted)] border border-[var(--md-outline)] rounded-[18px] p-6 bg-[var(--md-surface-2)]">
              No inspiration posts yet.
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                {items.map((item) => {
                  const mediaBlocks = (item.blocks || []).filter(
                    (block) =>
                      block.type === "video" ||
                      block.type === "image" ||
                      block.type === "svg" ||
                      block.type === "music",
                  );
                  const contentBlocks = (item.blocks || []).filter(
                    (block) =>
                      block.type !== "video" &&
                      block.type !== "image" &&
                      block.type !== "svg" &&
                      block.type !== "music",
                  );

                  return (
                    <article
                      key={item.id}
                      className="w-full min-w-0 bg-[var(--md-surface)] border border-[var(--md-outline)] rounded-[18px] p-5 shadow-sm space-y-4"
                    >
                      {mediaBlocks.length > 0 && (
                        <div className="space-y-3">
                          {mediaBlocks.map((block, index) => {
                            if (block.type === "image" || block.type === "svg") {
                              const mediaUrl = normalizeMediaUrl(block.url);
                              if (!isSafeImageUrl(mediaUrl)) {
                                return (
                                  <div key={`media-${index}`} className="space-y-2 rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-4 text-sm text-[var(--md-text)]">
                                    <a
                                      href={mediaUrl || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-3 transition-colors hover:text-[var(--md-primary)]"
                                    >
                                      <span className="min-w-0">
                                        <span className="block font-medium">Open image reference</span>
                                        <span className="block truncate text-xs text-[var(--md-text-muted)]">
                                          {mediaUrl || "Invalid image URL"}
                                        </span>
                                      </span>
                                      <ExternalLink className="h-4 w-4 shrink-0 text-[var(--md-primary)]" />
                                    </a>
                                    {isHttpMediaUrl(mediaUrl) && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          startProtectedDownload(
                                            mediaUrl,
                                            getDownloadFilename(item.title, block.type, index, mediaUrl),
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--md-primary)] px-3 py-2 text-xs font-medium text-[var(--md-primary)] transition-colors hover:bg-[var(--md-primary)] hover:text-white"
                                      >
                                        <Download className="h-4 w-4" />
                                        Download
                                      </button>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={`media-${index}`}
                                  className="w-full overflow-hidden rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]"
                                >
                                  <Image
                                    unoptimized
                                    src={mediaUrl}
                                    alt={block.caption || item.title}
                                    width={1200}
                                    height={900}
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="block h-auto max-h-[32rem] w-full object-cover"
                                  />
                                  <div className="flex flex-wrap gap-2 border-t border-[var(--md-outline)] px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        startProtectedDownload(
                                          mediaUrl,
                                          getDownloadFilename(item.title, block.type, index, mediaUrl),
                                        )
                                      }
                                      className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--md-primary)] px-3 py-2 text-xs font-medium text-[var(--md-primary)] transition-colors hover:bg-[var(--md-primary)] hover:text-white"
                                    >
                                      <Download className="h-4 w-4" />
                                      Download
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            if (block.type === "video") {
                              const media = getEmbedType(block.url);
                              return (
                                <div key={`media-${index}`} className="space-y-2">
                                  {media.type === "direct" ? (
                                    <div
                                      className={`overflow-hidden rounded-[14px] border border-[var(--md-outline)] ${media.frameClass}`}
                                    >
                                      <video
                                        ref={registerMediaElement(`${item.id}-video-${index}`)}
                                        controls
                                        controlsList="nodownload"
                                        disablePictureInPicture
                                        playsInline
                                        preload="metadata"
                                        onPlay={() => {
                                          pauseOtherMedia(`${item.id}-video-${index}`);
                                          void incrementPostView(item.id);
                                        }}
                                        crossOrigin="anonymous"
                                        onContextMenu={(event) => event.preventDefault()}
                                        onError={() => {
                                          window.open(media.src, "_blank", "noopener,noreferrer");
                                        }}
                                        src={media.src}
                                        className="mx-auto block h-auto max-h-[48rem] w-auto max-w-full object-contain"
                                      />
                                    </div>
                                  ) : media.type === "youtube" ||
                                    media.type === "vimeo" ||
                                    media.type === "drive" ? (
                                    preferSimpleMedia ? (
                                      <a
                                        href={media.src}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-4 text-sm text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)]"
                                      >
                                        <span className="min-w-0">
                                          <span className="block font-medium">Open embedded video</span>
                                          <span className="block truncate text-xs text-[var(--md-text-muted)]">
                                            {media.src}
                                          </span>
                                        </span>
                                        <ExternalLink className="h-4 w-4 shrink-0 text-[var(--md-primary)]" />
                                      </a>
                                    ) : (
                                      <div
                                        className={`overflow-hidden rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] ${media.frameClass}`}
                                      >
                                        <div className={`relative w-full ${media.aspectClass}`}>
                                          <iframe
                                            src={media.src}
                                            title={block.caption || item.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            loading="lazy"
                                            referrerPolicy="strict-origin-when-cross-origin"
                                            className="absolute inset-0 h-full w-full"
                                          />
                                        </div>
                                      </div>
                                    )
                                  ) : (
                                    <a
                                      href={media.src}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-4 text-sm text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)]"
                                    >
                                      <span className="min-w-0">
                                        <span className="block font-medium">Open video reference</span>
                                        <span className="block truncate text-xs text-[var(--md-text-muted)]">
                                          {media.src}
                                        </span>
                                      </span>
                                      <ExternalLink className="h-4 w-4 shrink-0 text-[var(--md-primary)]" />
                                    </a>
                                  )}
                                  {block.caption && (
                                    <p className="text-xs text-[var(--md-text-muted)]">
                                      {block.caption}
                                    </p>
                                  )}
                                  {media.type === "direct" && (
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          startProtectedDownload(
                                            media.src,
                                            getDownloadFilename(item.title, block.type, index, media.src),
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--md-primary)] px-3 py-2 text-xs font-medium text-[var(--md-primary)] transition-colors hover:bg-[var(--md-primary)] hover:text-white"
                                      >
                                        <Download className="h-4 w-4" />
                                        Download
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            if (block.type === "music") {
                              const mediaUrl = normalizeMediaUrl(block.url);
                              return (
                                <div key={`media-${index}`} className="space-y-2">
                                  <audio
                                    ref={registerMediaElement(`${item.id}-audio-${index}`)}
                                    controls
                                    preload="metadata"
                                    src={mediaUrl}
                                    onPlay={() => pauseOtherMedia(`${item.id}-audio-${index}`)}
                                    className="w-full"
                                  />
                                  {block.caption && (
                                    <p className="text-xs text-[var(--md-text-muted)]">
                                      {block.caption}
                                    </p>
                                  )}
                                  {(mediaUrl.startsWith("/") || isHttpMediaUrl(mediaUrl) || isDirectAudioFile(mediaUrl)) && (
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          startProtectedDownload(
                                            mediaUrl,
                                            getDownloadFilename(item.title, block.type, index, mediaUrl),
                                          )
                                        }
                                        className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--md-primary)] px-3 py-2 text-xs font-medium text-[var(--md-primary)] transition-colors hover:bg-[var(--md-primary)] hover:text-white"
                                      >
                                        <Download className="h-4 w-4" />
                                        Download
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                        {item.subtitle && (
                          <p className="text-sm text-[var(--md-text-muted)]">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      {item.summary && (
                        <p className="text-sm text-[var(--md-text-muted)] leading-relaxed">
                          {item.summary}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(item.keywords) &&
                          item.keywords.map((keyword) => (
                            <button
                              key={`${item.id}-${keyword}`}
                              type="button"
                              onClick={() => {
                                setSearchInput(keyword);
                                handleSearch(keyword);
                              }}
                              className="rounded-full border border-[var(--md-outline)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--md-text-muted)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-text)]"
                            >
                              {keyword}
                            </button>
                          ))}
                        {Array.from(new Set((item.blocks || []).map((block) => block.type))).map(
                          (type) => (
                            <span
                              key={type}
                              className="px-3 py-1 rounded-full text-[11px] border border-[var(--md-outline)] text-[var(--md-text-muted)]"
                            >
                              {type}
                            </span>
                          ),
                        )}
                      </div>
                      <div className="space-y-3">
                        {contentBlocks.map((block, index) => {
                          if (block.type === "title") {
                            return (
                              <h4 key={index} className="text-base font-semibold">
                                {block.text}
                              </h4>
                            );
                          }
                          if (block.type === "subtitle") {
                            return (
                              <h5
                                key={index}
                                className="text-sm font-semibold text-[var(--md-text-muted)]"
                              >
                                {block.text}
                              </h5>
                            );
                          }
                          if (block.type === "paragraph") {
                            return (
                              <p
                                key={index}
                                className="text-sm text-[var(--md-text-muted)] leading-relaxed"
                              >
                                {block.text}
                              </p>
                            );
                          }
                          if (block.type === "chips" || block.type === "keywords") {
                            return (
                              <div key={index} className="flex flex-wrap gap-2">
                                {block.items.map((itemText) => (
                                  <span
                                    key={itemText}
                                    className="px-3 py-1 rounded-full text-[11px] bg-[var(--md-surface-2)] border border-[var(--md-outline)] text-[var(--md-text-muted)]"
                                  >
                                    {itemText}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          if (block.type === "custom") {
                            return (
                              <pre
                                key={index}
                                className="text-xs text-[var(--md-text-muted)] bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[12px] p-3 overflow-auto"
                              >
                                {JSON.stringify(block.data, null, 2)}
                              </pre>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
              {total > PAGE_SIZE && (
                <div className="mt-8 flex flex-col gap-3 border border-[var(--md-outline)] rounded-[18px] bg-[var(--md-surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[var(--md-text-muted)]">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                      disabled={offset === 0 || loading}
                      className="rounded-[12px] border border-[var(--md-outline)] px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:border-[var(--md-primary)]"
                    >
                      Previous
                    </button>
                    {pageNumbers.map((pageNumber) => {
                      const isActive = pageNumber === currentPage;
                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setOffset((pageNumber - 1) * PAGE_SIZE)}
                          disabled={loading}
                          className={
                            isActive
                              ? "rounded-[12px] border border-[var(--md-primary)] bg-[var(--md-primary)] px-3 py-2 text-sm text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                              : "rounded-[12px] border border-[var(--md-outline)] px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:border-[var(--md-primary)]"
                          }
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                      disabled={!hasMore || loading}
                      className="rounded-[12px] border border-[var(--md-primary)] bg-[var(--md-primary)] px-4 py-2 text-sm text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
                    >
                      Next Page
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {inspirationSets.map((set) => {
            const Icon = set.icon;
            return (
              <div
                key={set.title}
                className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[24px] p-6 shadow-lg sm:backdrop-blur-xl flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[14px] bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[var(--md-primary)]" />
                  </div>
                  <h2 className="text-lg font-semibold">{set.title}</h2>
                </div>
                <p className="text-sm text-[var(--md-text-muted)] leading-relaxed">
                  {set.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {set.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.25em] bg-[rgba(124,131,255,0.12)] text-[var(--md-text-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="bg-[var(--md-surface-3)] border border-[var(--md-outline)] rounded-[26px] p-6 sm:backdrop-blur-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center">
                <Film className="w-5 h-5 text-[var(--md-primary)]" />
              </div>
              <h3 className="text-lg font-semibold">Edit Recipes</h3>
            </div>
            <div className="space-y-4">
              {editRecipes.map((recipe) => (
                <div
                  key={recipe.title}
                  className="border border-[var(--md-outline)] rounded-[20px] p-4 bg-[var(--md-surface-2)]"
                >
                  <h4 className="text-sm font-semibold mb-1">
                    {recipe.title}
                  </h4>
                  <p className="text-sm text-[var(--md-text-muted)]">
                    {recipe.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[26px] p-6 sm:backdrop-blur-xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center">
                <Music className="w-5 h-5 text-[var(--md-primary)]" />
              </div>
              <h3 className="text-lg font-semibold">Music Starters</h3>
            </div>
            <ul className="space-y-3 text-sm text-[var(--md-text-muted)]">
              {musicStarters.map((tip) => (
                <li key={tip} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--md-primary)]" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-90 transition-opacity"
            >
              Start Finding Songs
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

