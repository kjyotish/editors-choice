import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/app/components/PageShell";
import AiPromptsGallery from "./AiPromptsGallery";

export const metadata: Metadata = {
  title: "AI Prompts | Editors Choice",
  description:
    "Browse minimalist AI prompt cards for image generation, color grading, and image-to-video workflows.",
  alternates: {
    canonical: "/ai-prompts",
  },
};

export default async function AiPromptsPage({
  searchParams,
}: {
  searchParams?: Promise<{ prompt?: string; category?: string; subcategory?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const sharedPromptId =
    typeof resolvedSearchParams.prompt === "string" ? resolvedSearchParams.prompt : "";
  const selectedCategory =
    typeof resolvedSearchParams.category === "string"
      ? resolvedSearchParams.category
      : "";
  const selectedSubcategory =
    typeof resolvedSearchParams.subcategory === "string"
      ? resolvedSearchParams.subcategory
      : "";

  if (sharedPromptId) {
    const categoryQuery = selectedCategory
      ? `?category=${encodeURIComponent(selectedCategory)}`
      : "";
    const subcategoryQuery = selectedSubcategory
      ? `${categoryQuery ? "&" : "?"}subcategory=${encodeURIComponent(selectedSubcategory)}`
      : "";
    redirect(`/ai-prompts/${encodeURIComponent(sharedPromptId)}${categoryQuery}${subcategoryQuery}`);
  }

  return (
    <PageShell>
      <AiPromptsGallery
        initialCategory={selectedCategory}
        initialSubcategory={selectedSubcategory}
        initialItems={[]}
      />
    </PageShell>
  );
}
