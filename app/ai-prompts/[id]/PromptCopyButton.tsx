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
      className="inline-flex items-center gap-2 rounded-full bg-[var(--md-primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--md-on-primary)] transition-all hover:opacity-90"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy Prompt"}
    </button>
  );
}
