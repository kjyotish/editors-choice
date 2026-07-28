import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import PageShell from "@/app/components/PageShell";
import AiPromptsGallery from "./AiPromptsGallery";
import { type AiPromptItem } from "./promptData";

export const metadata: Metadata = {
  title: "AI Prompts | Editors Choice",
  description:
    "Browse minimalist AI prompt cards for image generation, color grading, and image-to-video workflows.",
  alternates: {
    canonical: "/ai-prompts",
  },
};

export const dynamic = "force-dynamic";

export default async function AiPromptsPage({
  searchParams,
}: {
  searchParams?: { prompt?: string; category?: string };
}) {
  const sharedPromptId =
    typeof searchParams?.prompt === "string"
      ? searchParams.prompt
      : "";
  const selectedCategory =
    typeof searchParams?.category === "string"
      ? searchParams.category
      : "";

  if (sharedPromptId) {
    const categoryQuery = selectedCategory
      ? `?category=${encodeURIComponent(selectedCategory)}`
      : "";
    redirect(`/ai-prompts/${encodeURIComponent(sharedPromptId)}${categoryQuery}`);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const promptItems: AiPromptItem[] = [];

  if (supabaseAdmin) {
    const result = await supabaseAdmin
      .from("ai_prompts")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (result.data && Array.isArray(result.data)) {
      promptItems.push(...(result.data as AiPromptItem[]));
    }
  }

  return (
    <PageShell>
      <AiPromptsGallery initialCategory={selectedCategory} initialItems={promptItems} />
    </PageShell>
  );
}
