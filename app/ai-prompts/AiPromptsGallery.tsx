"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, Share2, Sparkles } from "lucide-react";
import {
  getPromptCategoryLabel,
  groupPromptsByCategory,
  promptCategories,
  type AiPromptType,
} from "./promptCategories";

export type AiPromptItem = {
  id: string;
  title: string;
  prompt_type: "image_generation" | "color_grade_image" | "image_to_video";
  prompt_text: string;
  before_image_url: string | null;
  after_image_url: string | null;
  published: boolean;
  sort_order: number | null;
  created_at: string;
};

const fallbackPrompts: AiPromptItem[] = [
  {
    id: "starter-image-generation",
    title: "Cinematic Image Generation",
    prompt_type: "image_generation",
    prompt_text:
      "Create a cinematic editorial portrait with soft rim light, shallow depth of field, dramatic shadows, rich texture, and a premium color palette. Keep the subject sharp, the background moody, and the overall frame ready for a viral thumbnail.",
    before_image_url: null,
    after_image_url: null,
    published: true,
    sort_order: 1,
    created_at: "",
  },
  {
    id: "starter-color-grade",
    title: "Moody Color Grade",
    prompt_type: "color_grade_image",
    prompt_text:
      "Apply a moody teal-orange color grade with clean contrast, soft highlights, deep blacks, muted skin tones, and a polished commercial finish. Preserve detail while adding a premium cinematic atmosphere.",
    before_image_url: null,
    after_image_url: null,
    published: true,
    sort_order: 2,
    created_at: "",
  },
  {
    id: "starter-image-to-video",
    title: "Image to Video Motion",
    prompt_type: "image_to_video",
    prompt_text:
      "Animate this still image into a smooth cinematic clip with gentle camera push-in, natural subject motion, soft parallax depth, realistic lighting shifts, and clean transitions that feel viral on short-form video platforms.",
    before_image_url: null,
    after_image_url: null,
    published: true,
    sort_order: 3,
    created_at: "",
  },
];

type PublicPromptCardProps = {
  item: AiPromptItem;
  copiedId: string | null;
  onCopy: (item: AiPromptItem) => void;
  onShare: (item: AiPromptItem) => void;
};

const mediaFrameClass =
  "aspect-square w-full overflow-hidden rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]";

const placeholderClass =
  "flex h-full w-full items-center justify-center text-center text-xs uppercase tracking-[0.22em] text-[var(--md-text-muted)]";

function PublicPromptCard({ item, copiedId, onCopy, onShare }: PublicPromptCardProps) {
  return (
    <article
      id={`prompt-${item.id}`}
      className="scroll-mt-24 rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            <Sparkles className="h-4 w-4 text-[var(--md-primary)]" />
            {getPromptCategoryLabel(item.prompt_type)}
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[var(--md-text)]">
            {item.title}
          </h2>
        </div>
        <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
          Prompt
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className={mediaFrameClass}>
            {item.before_image_url ? (
              <img
                src={item.before_image_url}
                alt={`${item.title} before`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className={placeholderClass}>Before image</div>
            )}
          </div>
          <div className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            Before
          </div>
        </div>

        <div className="space-y-2">
          <div className={mediaFrameClass}>
            {item.after_image_url ? (
              <img
                src={item.after_image_url}
                alt={`${item.title} after`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className={placeholderClass}>After image</div>
            )}
          </div>
          <div className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            After
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
          Final Prompt
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--md-text)]">
          {item.prompt_text}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCopy(item)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
        >
          {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiedId === item.id ? "Copied" : "Copy Prompt"}
        </button>
        <button
          type="button"
          onClick={() => onShare(item)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </article>
  );
}

type AiPromptsGalleryProps = {
  initialPromptId?: string;
  initialItems?: AiPromptItem[];
};

export default function AiPromptsGallery({
  initialPromptId = "",
  initialItems = [],
}: AiPromptsGalleryProps) {
  const [items, setItems] = useState<AiPromptItem[]>(initialItems);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AiPromptType>(
    promptCategories[0]?.key ?? "image_generation"
  );

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const prompts = useMemo(() => (items.length > 0 ? items : fallbackPrompts), [items]);
  const groupedPrompts = useMemo(() => groupPromptsByCategory(prompts), [prompts]);
  const selectedCategoryItems = useMemo(
    () => groupedPrompts[selectedCategory] ?? [],
    [groupedPrompts, selectedCategory]
  );

  useEffect(() => {
    if (!initialPromptId) return;
    const element = document.getElementById(`prompt-${initialPromptId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [initialPromptId, prompts]);

  const copyPrompt = async (item: AiPromptItem) => {
    try {
      await navigator.clipboard.writeText(item.prompt_text.trim());
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === item.id ? null : current));
      }, 1800);
    } catch {
      // Ignore clipboard issues in unsupported browsers.
    }
  };

  const sharePrompt = async (item: AiPromptItem) => {
    const shareUrl = `${window.location.origin}/ai-prompts?prompt=${encodeURIComponent(item.id)}#prompt-${item.id}`;
    const shareText = `${item.title}\n\n${item.prompt_text.trim()}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopiedId(item.id);
    } catch {
      // Ignore canceled shares and clipboard failures.
    }
  };

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
              {promptCategories.find((category) => category.key === selectedCategory)?.label ?? "Prompts"}
            </h2>
            <p className="mt-1 text-sm text-[var(--md-text-muted)]">
              {promptCategories.find((category) => category.key === selectedCategory)?.description ?? "Browse curated prompts for this workflow."}
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            {selectedCategoryItems.length} prompts
          </span>
        </div>

        {selectedCategoryItems.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            {selectedCategoryItems.slice(0, 1).map((item) => (
              <PublicPromptCard
                key={item.id}
                item={item}
                copiedId={copiedId}
                onCopy={copyPrompt}
                onShare={sharePrompt}
              />
            ))}
            {selectedCategoryItems[0] && (
              <div className="rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--md-primary)]" />
                  Professional Use
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[var(--md-text)]">
                  Clean, cinematic colour-grade prompt
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--md-text-muted)]">
                  Use this prompt to create a premium grade with balanced contrast, soft highlights, muted skin tones, and a polished commercial finish.
                </p>
                <div className="mt-6 rounded-[18px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
                    Prompt Preview
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--md-text)]">
                    {selectedCategoryItems[0].prompt_text}
                  </p>
                </div>
              </div>
            )}
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
