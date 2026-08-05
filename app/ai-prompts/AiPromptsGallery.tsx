"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Film, Share2, Sparkles } from "lucide-react";
import {
  groupPromptsByCategory,
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
};

const isYouTubeUrl = (value: string) =>
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))/i.test(value);

const getYouTubeEmbedUrl = (value: string) => {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-\-]+)/i);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : null;
};

function PromptCard({ item }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const trimmedVideoUrl = item.video_url?.trim() || "";
  const hasVideoPreview = item.prompt_type === "image_to_video" && trimmedVideoUrl;
  const previewEmbedUrl = hasVideoPreview && isYouTubeUrl(trimmedVideoUrl) ? getYouTubeEmbedUrl(trimmedVideoUrl) : null;
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

    const shareUrl = `${window.location.origin}/ai-prompts/${encodeURIComponent(item.id)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: "Check out this AI prompt.",
          url: shareUrl,
        });
        return;
      } catch {
        // Fall back to clipboard copy
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

  return (
    <article className="rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--md-primary)] hover:shadow-[0_0_22px_rgba(124,131,255,0.14)]">
      <Link
        href={`/ai-prompts/${encodeURIComponent(item.id)}?category=${encodeURIComponent(item.prompt_type)}`}
        className="group block"
      >
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
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--md-text)]">
              {item.title}
            </h2>
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
  initialItems?: AiPromptItem[];
};

export default function AiPromptsGallery({
  initialCategory = "",
  initialItems = [],
}: AiPromptsGalleryProps) {
  const [items, setItems] = useState<AiPromptItem[]>(initialItems);
  const [selectedCategory, setSelectedCategory] = useState<AiPromptType>(() => {
    const match = promptCategories.find((category) => category.key === initialCategory);
    return match?.key ?? promptCategories[0]?.key ?? "image_generation";
  });

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const match = promptCategories.find((category) => category.key === initialCategory);
    if (match) {
      setSelectedCategory(match.key);
    }
  }, [initialCategory]);

  const prompts = useMemo(() => (items.length > 0 ? items : fallbackPrompts), [items]);
  const groupedPrompts = useMemo(() => groupPromptsByCategory(prompts), [prompts]);
  const selectedCategoryItems = useMemo(
    () => groupedPrompts[selectedCategory] ?? [],
    [groupedPrompts, selectedCategory]
  );
  const selectedCategoryMeta =
    promptCategories.find((category) => category.key === selectedCategory) ?? promptCategories[0];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
          <Sparkles className="h-4 w-4 text-[var(--md-primary)]" />
          AI Prompts
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Viral prompts for image, color grade, and image-to-video workflows.
        </h1>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        {promptCategories.map((category) => {
          const isActive = selectedCategory === category.key;

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setSelectedCategory(category.key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-[var(--md-primary)] bg-[var(--md-primary)] text-white"
                  : "border-[var(--md-outline)] bg-[var(--md-surface)] text-[var(--md-text)] hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--md-text)] sm:text-2xl">
              {selectedCategoryMeta?.label ?? "Prompts"}
            </h2>
            <p className="mt-1 text-sm text-[var(--md-text-muted)]">
              {selectedCategoryMeta?.description ?? "Browse curated prompts for this workflow."}
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            {selectedCategoryItems.length} prompts
          </span>
        </div>

        {selectedCategoryItems.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {selectedCategoryItems.map((item) => (
              <PromptCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-[var(--md-outline)] bg-[var(--md-surface)] px-5 py-6 text-sm text-[var(--md-text-muted)]">
            Try another category or check back later for new prompts.
          </div>
        )}
      </section>
    </div>
  );
}
