"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
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

function PromptCard({ item }: PromptCardProps) {
  return (
    <Link
      href={`/ai-prompts/${encodeURIComponent(item.id)}?category=${encodeURIComponent(item.prompt_type)}`}
      className="group block rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--md-primary)] hover:shadow-[0_0_22px_rgba(124,131,255,0.14)]"
    >
      <article className="space-y-4">
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
            {item.after_image_url ? (
              <img
                src={item.after_image_url}
                alt={`${item.title} after`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className={placeholderClass}>After image</div>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--md-text)]">
            {item.title}
          </h2>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--md-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--md-primary)]" />
        </div>
      </article>
    </Link>
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
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--md-text-muted)] sm:text-base">
          Preview the before and after reference, then copy or share prompt in one click.
        </p>
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
            No prompts published in this category yet.
          </div>
        )}
      </section>
    </div>
  );
}
