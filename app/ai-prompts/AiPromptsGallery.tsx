"use client";

import Link from "next/link";
import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ChevronDown, Copy, Film, LoaderCircle, Search, Share2 } from "lucide-react";
import {
  collectPromptSubcategories,
  groupPromptsByCategory,
  normalizePromptSubcategory,
  promptCategories,
  type AiPromptType,
} from "./promptCategories";
import { fallbackPrompts, type AiPromptItem } from "./promptData";

const mediaFrameClass =
  "relative aspect-square min-w-0 w-full overflow-hidden rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]";

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
  const [isOpening, setIsOpening] = useState(false);
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
    <article
      className={`relative min-w-0 overflow-hidden rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--md-primary)] hover:shadow-[0_0_22px_rgba(124,131,255,0.14)] ${
        isOpening ? "scale-[0.99] border-[var(--md-primary)]" : ""
      }`}
    >
      <Link
        href={detailHref}
        onClick={() => setIsOpening(true)}
        aria-busy={isOpening}
        className="group block"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={mediaFrameClass}>
              {item.before_image_url ? (
                <img
                  src={item.before_image_url}
                  alt={`${item.title} before`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 block h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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
                    loading="lazy"
                    className="absolute inset-0 h-full w-full max-w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={trimmedVideoUrl}
                    controls
                    preload="none"
                    poster={previewPoster}
                    className="absolute inset-0 block h-full w-full max-w-full object-cover"
                    muted
                    playsInline
                  />
                )
              ) : item.after_image_url ? (
                <img
                  src={item.after_image_url}
                  alt={`${item.title} after`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 block h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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

      <div
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[var(--md-surface)]/72 backdrop-blur-[2px] transition-all duration-300 ${
          isOpening ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!isOpening}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--md-text)] shadow-lg">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[var(--md-primary)]" />
          Opening
        </span>
      </div>

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
  const [itemsLoading, setItemsLoading] = useState(initialItems.length === 0);
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
    if (initialItems.length > 0) {
      setItemsLoading(false);
      return;
    }

    let active = true;
    setItemsLoading(true);

    const loadPrompts = async () => {
      try {
        const response = await fetch("/api/ai-prompts");
        const data = (await response.json().catch(() => [])) as AiPromptItem[];
        if (active && response.ok && Array.isArray(data)) {
          setItems(data);
        }
      } catch {
        // The gallery will show the built-in starter prompts if the public API is unavailable.
      } finally {
        if (active) setItemsLoading(false);
      }
    };

    void loadPrompts();

    return () => {
      active = false;
    };
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

  const prompts = useMemo(
    () => (items.length > 0 ? items : itemsLoading ? [] : fallbackPrompts),
    [items, itemsLoading],
  );
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
  const closeSearch = () => {
    setQuery("");
    setSearchOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Free Prompts For Your Edits
        </h1>
      </div>

      <div className="mb-8 flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto pb-1">
          {promptCategories.map((category) => {
            const isActive = selectedCategory === category.key;

            return (
            <button
              key={category.key}
              type="button"
              onClick={() => setSelectedCategory(category.key)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
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

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            aria-haspopup="dialog"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] text-[var(--md-text-muted)] shadow-sm transition-all duration-300 hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56">
          <select
            value={selectedSubcategory}
            onChange={(event) => setSelectedSubcategory(event.target.value)}
            className="peer h-[38px] w-full appearance-none rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-2 pr-11 text-sm font-semibold text-[var(--md-text)] shadow-sm outline-none transition-all duration-300 hover:border-[var(--md-primary)] focus:border-[var(--md-primary)]"
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
              onClick={closeSearch}
              className="rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text-muted)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
            >
              Close
            </button>
          </div>

          {itemsLoading ? (
            <PromptGridSkeleton />
          ) : filteredPrompts.length > 0 ? (
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

          {itemsLoading ? (
            <PromptGridSkeleton />
          ) : filteredPrompts.length > 0 ? (
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
      {searchOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[max(5rem,12vh)] sm:px-6">
              <button
                type="button"
                aria-label="Close search"
                onClick={closeSearch}
                className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-xl"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Search AI prompts"
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeSearch();
                }}
                className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[26px] border border-white/15 bg-[var(--md-surface)]/95 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl"
              >
                <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <Search className="h-5 w-5 shrink-0 text-[var(--md-primary)]" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search prompt titles"
                    aria-label="Search prompts"
                    className="min-w-0 flex-1 border-0 bg-transparent text-base text-[var(--md-text)] outline-none placeholder:text-[var(--md-text-muted)] sm:text-lg"
                  />
                  <button
                    type="button"
                    onClick={closeSearch}
                    className="rounded-full border border-[var(--md-outline)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--md-text-muted)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-text)]"
                  >
                    Esc
                  </button>
                </div>
                {normalizedQuery ? (
                  <div className="max-h-[min(62vh,42rem)] overflow-y-auto border-t border-[var(--md-outline)] p-4 sm:p-5">
                    <p className="mb-4 text-sm text-[var(--md-text-muted)]">
                      {filteredPrompts.length} matches for “{query.trim()}”
                    </p>
                    {filteredPrompts.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {filteredPrompts.map((item) => (
                          <PromptCard
                            key={item.id}
                            item={item}
                            selectedCategory={item.prompt_type}
                            selectedSubcategory={selectedSubcategory}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-[var(--md-outline)] px-4 py-5 text-sm text-[var(--md-text-muted)]">
                        No prompts match that search.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="border-t border-[var(--md-outline)] px-5 py-4 text-sm text-[var(--md-text-muted)] sm:px-6">
                    Search across the prompt library.
                  </p>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function PromptGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading prompts">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="space-y-4 rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4"
        >
          <div className="skeleton-block aspect-square rounded-[18px]" />
          <div className="skeleton-block h-5 w-3/4 rounded-full" />
          <div className="skeleton-block h-10 w-32 rounded-full" />
        </div>
      ))}
    </div>
  );
}
