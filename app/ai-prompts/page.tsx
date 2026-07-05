import type { Metadata } from "next";
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

export default function AiPromptsPage() {
  return (
    <PageShell>
      <AiPromptsGallery />
    </PageShell>
  );
}
