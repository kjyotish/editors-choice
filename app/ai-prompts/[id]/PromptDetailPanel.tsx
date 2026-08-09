"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PromptCopyButton from "./PromptCopyButton";
import PromptShareButton from "./PromptShareButton";

type PromptDetailPanelProps = {
  promptId: string;
  promptText: string;
  backHref: string;
};

export default function PromptDetailPanel({ promptId, promptText, backHref }: PromptDetailPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const trimmedPromptText = promptText.trim();
  const shouldCollapse = useMemo(() => {
    if (!trimmedPromptText) return false;
    return trimmedPromptText.length > 260 || trimmedPromptText.split(/\s+/).length > 45;
  }, [trimmedPromptText]);

  return (
    <div className="rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-5 sm:p-6">
      <div className="sticky top-4 z-10 -mx-1 mb-4 rounded-[20px] border border-[var(--md-outline)] bg-[var(--md-surface)]/95 p-3 shadow-sm backdrop-blur">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
          Quick Actions
        </div>
        <div className="flex flex-wrap gap-3">
          <PromptCopyButton promptText={trimmedPromptText} />
          <PromptShareButton promptId={promptId} />
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--md-outline)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          >
            Browse more
          </Link>
        </div>
      </div>

      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
        Full Prompt
      </div>

      <div className="relative mt-4">
        <div
          className={`overflow-hidden whitespace-pre-wrap break-words text-sm leading-7 text-[var(--md-text)] sm:text-base ${
            shouldCollapse && !expanded ? "max-h-44" : "max-h-none"
          }`}
        >
          {trimmedPromptText}
        </div>

        {shouldCollapse && !expanded ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--md-surface-2)] to-transparent" />
        ) : null}
      </div>

      {shouldCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--md-text)] transition-colors hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
        >
          {expanded ? "Show less" : "Expand prompt"}
        </button>
      ) : null}
    </div>
  );
}
