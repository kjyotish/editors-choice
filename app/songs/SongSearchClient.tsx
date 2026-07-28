"use client";

import React, { useState } from "react";
import { Check, Copy, Search, Share2, Sparkles } from "lucide-react";
import {
  getSongCategoryLabel,
  songCategories,
  type SongItem,
} from "./songTypes";

type SongSearchClientProps = {
  initialCategory?: string;
};

function SongResultCard({ item }: { item: SongItem }) {
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

  return (
    <article className="overflow-hidden rounded-[26px] border border-[var(--md-outline)] bg-[var(--md-surface)] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--md-primary)] hover:shadow-[0_0_22px_rgba(124,131,255,0.14)]">
      <div className="border-b border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--md-primary)]" />
              {getSongCategoryLabel(item.category)}
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[var(--md-text)]">
              {item.title}
            </h2>
            {item.artist_name ? (
              <p className="mt-1 text-sm text-[var(--md-text-muted)]">{item.artist_name}</p>
            ) : null}
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--md-text-muted)]">
              Rating {item.rating}/10
            </p>
          </div>
          <button
            type="button"
            onClick={shareSong}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div className="overflow-hidden rounded-[20px] border border-[var(--md-outline)] bg-black/10">
          {previewUrl ? (
            <iframe
              src={previewUrl}
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
            className="inline-flex items-center gap-2 rounded-full bg-[var(--md-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-on-primary)] transition-all hover:opacity-90"
          >
            Open YouTube
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function SongSearchClient({ initialCategory = "" }: SongSearchClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [results, setResults] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmedQuery = query.trim();
    const selectedCategory = category.trim();

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

  return (
    <div className="mx-auto w-full max-w-4xl pt-12 sm:pt-20">
      <section className="flex flex-col items-center px-3 text-center">
        <h1 className="text-3xl font-normal tracking-[-0.04em] text-[var(--md-text)] sm:text-5xl">
          Search song with video topic
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--md-text-muted)] sm:text-base">
          Type a song name, artist, or topic. Keep it simple, then search.
        </p>

        <form onSubmit={(event) => void runSearch(event)} className="mt-8 w-full">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 shadow-sm focus-within:border-[var(--md-primary)]">
            <Search className="h-4 w-4 shrink-0 text-[var(--md-text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search song"
              className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-[var(--md-text-muted)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[var(--md-primary)] px-5 py-2 text-sm font-medium text-[var(--md-on-primary)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Searching" : "Search"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {songCategories.map((item) => {
              const active = category === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory((current) => (current === item.key ? "" : item.key))}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-[var(--md-text)] text-[var(--md-surface)]"
                      : "text-[var(--md-text-muted)] hover:text-[var(--md-text)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </form>
      </section>

      {error && (
        <div className="mt-5 rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-80 animate-pulse rounded-[26px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]"
            />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div className="mt-6 rounded-[24px] border border-dashed border-[var(--md-outline)] px-5 py-8 text-center text-sm text-[var(--md-text-muted)]">
          No songs matched your search. Try another title or pick a different category.
        </div>
      )}

      {!loading && results.length > 0 && (
        <section className="mt-6 grid gap-5 md:grid-cols-2">
          {results.map((item) => (
            <SongResultCard key={item.id} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
