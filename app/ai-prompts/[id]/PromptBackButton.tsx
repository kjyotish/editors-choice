"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type PromptBackButtonProps = {
  fallbackHref: string;
};

export default function PromptBackButton({ fallbackHref }: PromptBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text-muted)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to prompts
    </button>
  );
}
