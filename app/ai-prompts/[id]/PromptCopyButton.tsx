"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type PromptCopyButtonProps = {
  promptText: string;
};

export default function PromptCopyButton({ promptText }: PromptCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText.trim());
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--md-text)] transition hover:border-[var(--md-primary)] hover:bg-[var(--md-primary)] hover:text-white"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy Prompt"}
    </button>
  );
}
