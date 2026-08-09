"use client";

import Link from "next/link";
import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Copy, Film, Search, Share2, Sparkles } from "lucide-react";
import {
  collectPromptSubcategories,
  groupPromptsByCategory,
  normalizePromptSubcategory,
  promptCategories,
  type AiPromptType,
} from "./promptCategories";
import { fallbackPrompts, type AiPromptItem } from "./promptData";

const mediaFrameClass =
  "aspect-square w-full overflow-hidden rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]";

const placeholderClass =
  "flex h-full w-full items-center justify-center text-center text-xs uppercase tracking-[0.22em] text-[var(--md-text-muted)]";

type PromptCardProps = {
  item: AiPromptItem;
  selectedCategory: AiPromptType;
  selectedSubcategory: string;
};

const isYouTubeUrl = (value: string) =>
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))/i.test(value);

const getYouTubeEmbedUrl = (value: string) => {
  const match = value.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-\-]+)/i,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : null;
};

function PromptCard({ item, selectedCategory, selectedSubcategory }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const trimmedVideoUrl = item.video_url?.trim() || "";
  const hasVideoPreview = item.prompt_type === "image_to_video" && trimmedVideoUrl;
  const previewEmbedUrl =
    hasVideoPreview && isYouTubeUrl(trimmedVideoUrl) ? getYouTubeEmbedUrl(trimmedVideoUrl) : null;
  const previewPoster = item.after_image_url || item.before_image_url || undefined;

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(item.prompt_text.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const shareUrl = `${window.location.origin}/ai-prompts/${encodeURIComponent(item.id)}?category=${encodeURIComponent(selectedCategory)}${selectedSubcategory ? `&subcategory=${encodeURIComponent(selectedSubcategory)}` : ""}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: "Check out this AI prompt.",
          url: shareUrl,
        });
        return;
      } catch {
        // Fall back to clipboard copy.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const detailHref = `/ai-prompts/${encodeURIComponent(item.id)}?category=${encodeURIComponent(selectedCategory)}${selectedSubcategory ? `&subcategory=${encodeURIComponent(selectedSubcategory)}` : ""}`;

  return (
    <article className="rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--md-primary)] hover:shadow-[0_0_22px_rgba(124,131,255,0.14)]">
      <Link href={detailHref} className="group block">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={mediaFrameClass}>
              {item.before_image_url ? (
                <img
                  src={item.before_image_url}
                  alt={`${item.title} before`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className={placeholderClass}>Before image</div>
              )}
            </div>

            <div className={mediaFrameClass}>
              {hasVideoPreview ? (
                previewEmbedUrl ? (
                  <iframe
                    src={previewEmbedUrl}
                    title={`${item.title} video preview`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={trimmedVideoUrl}
                    controls
                    poster={previewPoster}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                )
              ) : item.after_image_url ? (
                <img
                  src={item.after_image_url}
                  alt={`${item.title} after`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className={placeholderClass}>After image</div>
              )}
              {hasVideoPreview && !previewEmbedUrl ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[var(--md-text)]">
                    <Film className="h-5 w-5" />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--md-text)]">
                {item.title}
              </h2>
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--md-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--md-primary)]" />
          </div>
        </div>
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--md-text)] transition hover:border-[var(--md-primary)] hover:bg-[var(--md-primary)] hover:text-white"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Prompt"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--md-primary)] hover:bg-[var(--md-primary)] hover:text-white"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </article>
  );
}


type AiPromptsGalleryProps = {
  initialCategory?: string;
  initialSubcategory?: string;
  initialItems?: AiPromptItem[];
};

export default function AiPromptsGallery({
  initialCategory = "",
  initialSubcategory = "",
  initialItems = [],
}: AiPromptsGalleryProps) {
  const [items, setItems] = useState<AiPromptItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [savedSubcategories, setSavedSubcategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AiPromptType>(() => {
    const match = promptCategories.find((category) => category.key === initialCategory);
    return match?.key ?? promptCategories[0]?.key ?? "image_generation";
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialSubcategory);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const match = promptCategories.find((category) => category.key === initialCategory);
    if (match) {
      setSelectedCategory(match.key);
    }
  }, [initialCategory]);

  useEffect(() => {
    setSelectedSubcategory(initialSubcategory);
  }, [initialSubcategory]);

  useEffect(() => {
    let active = true;

    const loadSubcategories = async () => {
      try {
        const res = await fetch("/api/ai-prompt-subcategories");
        if (!res.ok) return;

        const data = (await res.json().catch(() => [])) as string[];
        if (!active || !Array.isArray(data)) return;

        setSavedSubcategories(
          data
            .map((value) => value.trim())
            .filter(Boolean),
        );
      } catch {
        // Keep the dropdown resilient if the API is unavailable.
      }
    };

    void loadSubcategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 50);
  }, [searchOpen]);

  const prompts = useMemo(() => (items.length > 0 ? items : fallbackPrompts), [items]);
  const groupedPrompts = useMemo(() => groupPromptsByCategory(prompts), [prompts]);
  const selectedCategoryItems = useMemo(
    () => groupedPrompts[selectedCategory] ?? [],
    [groupedPrompts, selectedCategory],
  );
  const subcategoryOptions = useMemo(
    () =>
      collectPromptSubcategories([
        ...prompts,
        ...savedSubcategories.map((value) => ({ subcategory: value })),
      ]),
    [prompts, savedSubcategories],
  );
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const normalizedSelectedSubcategory = normalizePromptSubcategory(selectedSubcategory);

  const filteredPrompts = useMemo(() => {
    const searchScope = normalizedQuery ? prompts : selectedCategoryItems;

    return searchScope.filter((item) => {
      const titleMatches =
        !normalizedQuery || item.title.trim().toLowerCase().includes(normalizedQuery);
      const subcategoryMatches =
        !normalizedSelectedSubcategory ||
        normalizePromptSubcategory(item.subcategory || "") === normalizedSelectedSubcategory;
      return titleMatches && subcategoryMatches;
    });
  }, [normalizedQuery, normalizedSelectedSubcategory, prompts, selectedCategoryItems]);

  const selectedCategoryMeta =
    promptCategories.find((category) => category.key === selectedCategory) ?? promptCategories[0];
  const showSearchResults = searchOpen && normalizedQuery;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div
        className={`fixed inset-0 z-10 bg-black/20 backdrop-blur-sm transition-all duration-500 ${
          searchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => {
          if (!query.trim()) {
            setSearchOpen(false);
          }
        }}
        aria-hidden="true"
      />
      <div className="mb-8 max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
          <Sparkles className="h-4 w-4 text-[var(--md-primary)]" />
          AI Prompts
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Free Prompts For Your Edits
        </h1>
      </div>

      <div className="relative z-20 mb-8">
        <div className="flex flex-wrap items-center gap-3 pr-14">
          {promptCategories.map((category) => {
            const isActive = selectedCategory === category.key;

            return (
            <button
              key={category.key}
              type="button"
              onClick={() => setSelectedCategory(category.key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "border-[var(--md-primary)] bg-[var(--md-primary)] text-white"
                  : "border-[var(--md-outline)] bg-[var(--md-surface)] text-[var(--md-text)] hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
              } ${searchOpen ? "blur-[1px] opacity-55" : ""}`}
            >
              {category.label}
            </button>
          );
        })}
        </div>

        <div className="absolute right-0 top-0">
          <button
            type="button"
            onClick={() => {
              if (!searchOpen) {
                setSearchOpen(true);
                return;
              }
              if (!query.trim()) {
                setSearchOpen(false);
              }
            }}
            aria-label={searchOpen ? "Close search" : "Open search"}
            className={`relative z-20 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] text-[var(--md-text-muted)] shadow-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--md-primary)] ${
              searchOpen ? "scale-95" : "scale-100"
            }`}
          >
            <Search className={`h-4 w-4 transition-transform duration-500 ${searchOpen ? "scale-90" : "scale-100"}`} />
          </button>

          <div
            className={`absolute right-0 top-[calc(100%+0.75rem)] z-20 overflow-hidden rounded-[999px] border border-[var(--md-outline)] bg-[var(--md-surface)] shadow-[0_18px_40px_rgba(15,23,42,0.16)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              searchOpen
                ? "pointer-events-auto w-[min(92vw,26rem)] translate-y-0 scale-100 opacity-100"
                : "pointer-events-none w-12 translate-y-[-8px] scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--md-text-muted)]" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (!searchOpen) setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => {
                  if (!query.trim()) {
                    window.setTimeout(() => setSearchOpen(false), 120);
                  }
                }}
                placeholder="Search prompt title"
                aria-label="Search prompts"
                className="ml-3 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[var(--md-text-muted)]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56">
          <select
            value={selectedSubcategory}
            onChange={(event) => setSelectedSubcategory(event.target.value)}
            className="peer w-full appearance-none rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 pr-11 text-sm text-[var(--md-text)] shadow-sm outline-none transition-all duration-300 hover:border-[var(--md-primary)] focus:border-[var(--md-primary)]"
          >
            <option value="">All</option>
            {subcategoryOptions.map((subcategory) => (
              <option key={subcategory} value={subcategory}>
                {subcategory}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--md-text-muted)] transition-colors peer-focus:text-[var(--md-primary)]" />
        </div>
      </div>

      {showSearchResults ? (
        <section className="relative z-20 mb-8 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--md-text)] sm:text-2xl">
                Search Results
              </h2>
              <p className="mt-1 text-sm text-[var(--md-text-muted)]">
                {filteredPrompts.length} matches for “{query.trim()}”
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text-muted)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
            >
              Close
            </button>
          </div>

          {filteredPrompts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPrompts.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <PromptCard
                    item={item}
                    selectedCategory={selectedCategory}
                    selectedSubcategory={selectedSubcategory}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface)] px-5 py-6 text-sm text-[var(--md-text-muted)]">
              Try another category or check back later for new prompts.
            </div>
          )}
        </section>
      ) : (
        <section className="relative z-20 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--md-text)] sm:text-2xl">
                {selectedCategoryMeta?.label ?? "Prompts"}
              </h2>
              <p className="mt-1 text-sm text-[var(--md-text-muted)]">
                {selectedCategoryMeta?.description ?? "Browse curated prompts for this workflow."}
              </p>
            </div>
            <span className="text-xs uppercase tracking-[0.24em] text-[var(--md-text-muted)] transition-all duration-300 opacity-80">
              {filteredPrompts.length} prompts
            </span>
          </div>

          {filteredPrompts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPrompts.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <PromptCard
                    item={item}
                    selectedCategory={selectedCategory}
                    selectedSubcategory={selectedSubcategory}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface)] px-5 py-6 text-sm text-[var(--md-text-muted)]">
              Try another category or check back later for new prompts.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
