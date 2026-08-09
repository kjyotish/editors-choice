import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import PageShell from "@/app/components/PageShell";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { getSiteUrl } from "@/app/lib/site";
import { getPromptCategoryLabel } from "../promptCategories";
import { resolvePromptById, type AiPromptItem } from "../promptData";
import PromptBackButton from "./PromptBackButton";
import PromptDetailPanel from "./PromptDetailPanel";

const isYouTubeUrl = (value: string) =>
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))/i.test(value);

const getYouTubeEmbedUrl = (value: string) => {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-\-]+)/i);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : null;
};

type PromptPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ category?: string; subcategory?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PromptPageProps): Promise<Metadata> {
  const { id: promptId } = await params;
  const supabaseAdmin = getSupabaseAdmin();

  let prompt: AiPromptItem | null = resolvePromptById([], promptId);

  if (supabaseAdmin) {
    const result = await supabaseAdmin
      .from("ai_prompts")
      .select("*")
      .eq("id", promptId)
      .eq("published", true)
      .maybeSingle();

    if (result.data) {
      prompt = result.data as AiPromptItem;
    }
  }

  if (!prompt) {
    return {
      title: "AI Prompt | Editors Choice",
      description: "Browse a curated AI prompt and copy the full text.",
    };
  }

  const canonical = new URL(`/ai-prompts/${prompt.id}`, getSiteUrl()).toString();

  return {
    title: `${prompt.title} | AI Prompts`,
    description: `View the full ${getPromptCategoryLabel(prompt.prompt_type)} prompt and copy it.`,
    alternates: { canonical },
    openGraph: {
      title: `${prompt.title} | AI Prompts`,
      description: `View the full ${getPromptCategoryLabel(prompt.prompt_type)} prompt and copy it.`,
      type: "article",
      url: canonical,
      images: prompt.after_image_url || prompt.before_image_url ? [{ url: prompt.after_image_url || prompt.before_image_url || "" }] : undefined,
    },
  };
}

export default async function AiPromptDetailPage({
  params,
  searchParams,
}: PromptPageProps) {
  const { id: promptId } = await params;
  const { category: backCategory = "", subcategory: backSubcategory = "" } = (await searchParams) ?? {};

  const supabaseAdmin = getSupabaseAdmin();
  let prompt: AiPromptItem | null = null;

  if (supabaseAdmin) {
    const result = await supabaseAdmin
      .from("ai_prompts")
      .select("*")
      .eq("id", promptId)
      .eq("published", true)
      .maybeSingle();

    if (result.data) {
      prompt = result.data as AiPromptItem;
    }
  }

  if (!prompt) {
    prompt = resolvePromptById([], promptId);
  }

  if (!prompt) {
    notFound();
  }

  const backHref = backCategory
    ? `/ai-prompts?category=${encodeURIComponent(backCategory)}${backSubcategory ? `&subcategory=${encodeURIComponent(backSubcategory)}` : ""}`
    : "/ai-prompts";
  const canonical = new URL(`/ai-prompts/${prompt.id}`, getSiteUrl()).toString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: prompt.title,
    description: prompt.prompt_text.slice(0, 300),
    url: canonical,
    datePublished: prompt.created_at,
    dateModified: prompt.updated_at || prompt.created_at,
    keywords: [getPromptCategoryLabel(prompt.prompt_type), prompt.subcategory].filter(Boolean).join(", "),
    author: { "@type": "Organization", name: "Editors Choice" },
  };

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-5xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <PromptBackButton fallbackHref={backHref} />

        <div className="mt-6 overflow-hidden rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-5 shadow-lg sm:p-8">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 self-start rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--md-text-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--md-primary)]" />
              {getPromptCategoryLabel(prompt.prompt_type)}
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--md-text)] sm:text-5xl">
              {prompt.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--md-text-muted)] sm:text-base">
              Open the prompt, copy it, and reuse it in your own workflow.
            </p>
          </div>

          <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
              <PreviewImage
                src={prompt.before_image_url}
                alt={`${prompt.title} before`}
                label="Before"
              />
              {prompt.prompt_type === "image_to_video" ? (
                <PreviewVideoThumbnail
                  videoUrl={prompt.video_url}
                  beforeImageUrl={prompt.before_image_url}
                  afterImageUrl={prompt.after_image_url}
                  title={prompt.title}
                />
              ) : (
                <PreviewImage
                  src={prompt.after_image_url}
                  alt={`${prompt.title} after`}
                  label="After"
                />
              )}
            </div>

            <PromptDetailPanel promptId={prompt.id} promptText={prompt.prompt_text} backHref={backHref} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function PreviewImage({
  src,
  alt,
  label,
}: {
  src: string | null;
  alt: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="relative aspect-square min-w-0 overflow-hidden rounded-[20px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]">
        {src ? (
          <img src={src} alt={alt} className="absolute inset-0 block h-full w-full max-w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center text-xs uppercase tracking-[0.22em] text-[var(--md-text-muted)]">
            {label} image
          </div>
        )}
      </div>
      <div className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
        {label}
      </div>
    </div>
  );
}

function PreviewVideoThumbnail({
  videoUrl,
  beforeImageUrl,
  afterImageUrl,
  title,
}: {
  videoUrl: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  title: string;
}) {
  const trimmedUrl = videoUrl?.trim() || "";
  const embedUrl = trimmedUrl && isYouTubeUrl(trimmedUrl) ? getYouTubeEmbedUrl(trimmedUrl) : null;
  const poster = afterImageUrl || beforeImageUrl || undefined;

  return (
    <div className="space-y-2">
      <div className="relative aspect-square min-w-0 overflow-hidden rounded-[20px] border border-[var(--md-outline)] bg-[var(--md-surface-2)]">
        {trimmedUrl ? (
          embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${title} video preview`}
              className="absolute inset-0 h-full w-full max-w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={trimmedUrl}
              controls
              poster={poster}
              className="absolute inset-0 block h-full w-full max-w-full object-cover"
              muted
              playsInline
            />
          )
        ) : afterImageUrl || beforeImageUrl ? (
          <img
            src={afterImageUrl || beforeImageUrl || ""}
            alt={`${title} video thumbnail`}
            className="absolute inset-0 block h-full w-full max-w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center text-xs uppercase tracking-[0.22em] text-[var(--md-text-muted)]">
            Video thumbnail
          </div>
        )}
      </div>
      <div className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
        Video preview
      </div>
    </div>
  );
}
