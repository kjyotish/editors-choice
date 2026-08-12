"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Search, Share2, Sparkles } from "lucide-react";
import {
  defaultSongCategories,
  formatSongTimestamp,
  getSongCategoryLabel,
  mergeSongCategories,
  type SongItem,
  type SongCategory,
} from "./songTypes";

type SongSearchClientProps = {
  initialCategory?: string;
};

function SongResultCard({
  item,
  categories,
  playerId,
  registerPlayer,
}: {
  item: SongItem;
  categories: SongCategory[];
  playerId: string;
  registerPlayer: (playerId: string, element: HTMLIFrameElement | null) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(item.youtube_url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const shareSong = async () => {
    const shareText = `${item.title}${item.artist_name ? ` - ${item.artist_name}` : ""}\n${item.youtube_url}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: item.youtube_url,
        });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const previewUrl = item.youtube_embed_url || item.youtube_url;
  const playerUrl = (() => {
    try {
      const url = new URL(previewUrl);
      if (!/(^|\.)youtube\.com$/i.test(url.hostname)) return previewUrl;
      url.searchParams.set("enablejsapi", "1");
      url.searchParams.set("origin", window.location.origin);
      return url.toString();
    } catch {
      return previewUrl;
    }
  })();

  return (
    <article className="group overflow-hidden rounded-[26px] border border-[var(--md-outline)] bg-[var(--md-surface)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--md-primary)] hover:shadow-[0_20px_70px_rgba(15,23,42,0.16)]">
      <div className="relative border-b border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-4 sm:px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,131,255,0.14),transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--md-primary)]" />
              {getSongCategoryLabel(item.category, categories)}
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[var(--md-text)]">
              {item.title}
            </h2>
            {item.artist_name ? (
              <p className="mt-1 text-sm text-[var(--md-text-muted)]">{item.artist_name}</p>
            ) : null}
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--md-text-muted)]">
              Uploaded {formatSongTimestamp(item.created_at)}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--md-text-muted)]">
              Rating {item.rating}/10
            </p>
          </div>
          <button
            type="button"
            onClick={shareSong}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--md-text)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div className="overflow-hidden rounded-[20px] border border-[var(--md-outline)] bg-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {previewUrl ? (
            <iframe
              ref={(element) => registerPlayer(playerId, element)}
              src={playerUrl}
              title={`${item.title} preview`}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center text-sm text-[var(--md-text-muted)]">
              Video preview unavailable
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={item.youtube_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--md-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-on-primary)] transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90"
          >
            Open YouTube
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>
    </article>
  );
}

function SongResultSkeleton() {
  return (
    <article className="overflow-hidden rounded-[26px] border border-[var(--md-outline)] bg-[var(--md-surface)] shadow-sm">
      <div className="relative border-b border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-4 sm:px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,131,255,0.14),transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="skeleton-line h-6 w-28 rounded-full" />
            <div className="skeleton-line mt-4 h-5 w-3/4 rounded-full" />
            <div className="skeleton-line mt-3 h-4 w-1/2 rounded-full" />
            <div className="skeleton-line mt-3 h-3 w-36 rounded-full" />
            <div className="skeleton-line mt-2 h-3 w-24 rounded-full" />
          </div>
          <div className="skeleton-line h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div className="skeleton-block aspect-video rounded-[20px]" />

        <div className="flex flex-wrap gap-2">
          <div className="skeleton-line h-9 w-28 rounded-full" />
          <div className="skeleton-line h-9 w-28 rounded-full" />
        </div>
      </div>
    </article>
  );
}

export default function SongSearchClient({ initialCategory = "" }: SongSearchClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [results, setResults] = useState<SongItem[]>([]);
  const [categories, setCategories] = useState<SongCategory[]>(defaultSongCategories);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playersRef = useRef(new Map<string, HTMLIFrameElement>());

  const pausePlayer = useCallback((player: HTMLIFrameElement) => {
    const targetOrigin = new URL(player.src).origin;
    player.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
      targetOrigin,
    );
  }, []);

  const registerPlayer = useCallback((playerId: string, element: HTMLIFrameElement | null) => {
    if (element) {
      playersRef.current.set(playerId, element);
      element.addEventListener("load", () => {
        element.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
          new URL(element.src).origin,
        );
      }, { once: true });
    } else {
      playersRef.current.delete(playerId);
    }
  }, []);

  useEffect(() => {
    const handlePlayerEvent = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com" && event.origin !== "https://www.youtube-nocookie.com") return;
      let payload: { event?: string; info?: number } | null = null;
      try {
        payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      // YouTube reports 1 when a video starts playing.
      if (payload?.event !== "onStateChange" || payload.info !== 1) return;
      for (const player of playersRef.current.values()) {
        if (player.contentWindow !== event.source) pausePlayer(player);
      }
    };

    window.addEventListener("message", handlePlayerEvent);
    // Clicking a cross-origin iframe does not reliably expose YouTube's player
    // events. Focus is reliable, so use it as a fallback for native controls.
    const handleWindowBlur = () => {
      window.setTimeout(() => {
        const focusedPlayer = document.activeElement;
        if (!(focusedPlayer instanceof HTMLIFrameElement)) return;
        for (const player of playersRef.current.values()) {
          if (player !== focusedPlayer) pausePlayer(player);
        }
      }, 0);
    };
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("message", handlePlayerEvent);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [pausePlayer]);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const response = await fetch("/api/song-categories", { cache: "no-store" });
        const data = (await response.json()) as SongCategory[] | { error?: string };
        if (!active) return;
        if (Array.isArray(data)) {
          setCategories(mergeSongCategories(defaultSongCategories, data));
        }
      } catch {
        if (!active) return;
        setCategories(defaultSongCategories);
      }
    };

    void loadCategories();
    return () => {
      active = false;
    };
  }, []);

  const runSearch = async (
    event?: React.FormEvent,
    overrideQuery?: string,
    overrideCategory?: string,
  ) => {
    event?.preventDefault();
    const trimmedQuery = (overrideQuery ?? query).trim();
    const selectedCategory = (overrideCategory ?? category).trim();

    if (!trimmedQuery && !selectedCategory) {
      setError("Pick a category or type a song name to search.");
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (trimmedQuery) params.set("query", trimmedQuery);
      if (selectedCategory) params.set("category", selectedCategory);
      params.set("limit", "24");

      const response = await fetch(`/api/songs?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as SongItem[] | { error?: string };

      if (!response.ok) {
        const errorMessage =
          !Array.isArray(data) && typeof data.error === "string"
            ? data.error
            : "Failed to load songs.";
        throw new Error(errorMessage);
      }

      if (!Array.isArray(data)) {
        throw new Error("Failed to load songs.");
      }

      setResults(data);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Failed to load songs.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (itemKey: string) => {
    const nextCategory = category === itemKey ? "" : itemKey;
    setCategory(nextCategory);

    if (!query.trim() && !nextCategory) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }

    await runSearch(undefined, query, nextCategory);
  };

  return (
    <div className="mx-auto w-full max-w-4xl pt-8 sm:pt-16">
      <section className="relative overflow-hidden rounded-[32px] border border-[var(--md-outline)] bg-[linear-gradient(135deg,rgba(124,131,255,0.16),rgba(255,179,199,0.08))] px-4 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:px-8 sm:py-8">
        <div className="hero-orb hero-orb--secondary" />
        <div className="hero-orb hero-orb--accent" />
        <div className="relative animate-fade-up">
          <h1 className="mx-auto mt-4 max-w-2xl text-center text-3xl font-normal tracking-[-0.04em] text-[var(--md-text)] sm:text-5xl">
            Search Song With Video Topic
          </h1>

          <form onSubmit={(event) => void runSearch(event)} className="mt-8 w-full">
            <div className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-[20px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-3 shadow-[0_12px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl focus-within:border-[var(--md-primary)] sm:px-4">
              <Search className="h-4 w-4 shrink-0 text-[var(--md-text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search song title, artist, or keywords"
                className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-[var(--md-text-muted)]"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[var(--md-primary)] px-5 py-2 text-sm font-medium text-[var(--md-on-primary)] transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Searching" : "Search"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {categories.map((item) => {
                const active = category === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => void handleCategoryClick(item.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                      active
                        ? "border-[var(--md-primary)] bg-[var(--md-primary)]/12 text-[var(--md-text)]"
                        : "border-transparent text-[var(--md-text-muted)] hover:-translate-y-0.5 hover:border-[var(--md-outline)] hover:text-[var(--md-text)]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </form>
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 shadow-[0_10px_30px_rgba(239,68,68,0.08)]">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <SongResultSkeleton />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div className="mt-6 rounded-[24px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface-2)] px-5 py-8 text-center text-sm text-[var(--md-text-muted)] shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          No songs matched your search. Try a title, a keyword, or a different category.
        </div>
      )}

      {!loading && results.length > 0 && (
        <section className="mt-6 grid gap-5 md:grid-cols-2">
          {results.map((item, index) => (
            <div key={item.id} className="animate-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
              <SongResultCard
                item={item}
                categories={categories}
                playerId={item.id}
                registerPlayer={registerPlayer}
              />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
