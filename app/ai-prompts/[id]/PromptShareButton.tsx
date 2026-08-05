"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

type PromptShareButtonProps = {
  promptId: string;
};

export default function PromptShareButton({ promptId }: PromptShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/ai-prompts/${encodeURIComponent(promptId)}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "AI Prompt", text: "Check out this prompt.", url: shareUrl });
        return;
      } catch {
        // fall back to copy
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
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--md-text)] transition hover:border-[var(--md-primary)] hover:bg-[var(--md-primary)] hover:text-white"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Link Copied" : "Share"}
    </button>
  );
}
