import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, Compass, Sparkles } from "lucide-react";
import PageShell from "./components/PageShell";
import SongSearchClient from "./songs/SongSearchClient";

export const metadata: Metadata = {
  title: "Songs Search | Editors Choice",
  description:
    "Search curated songs by category, find matching YouTube previews, and discover tracks uploaded by admins.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return (
    <PageShell>
      <div className="w-full">
        <SongSearchClient />

        <section className="mx-auto mt-24 w-full max-w-5xl px-3 pb-8 sm:mt-32 sm:px-0">
          <div className="soft-panel rounded-[28px] p-4 sm:p-6">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--md-text-muted)]">
                More from Editors Choice
              </p>
              <h2 className="mt-3 text-2xl font-normal tracking-[-0.03em] text-[var(--md-text)] sm:text-3xl">
                Explore other free features
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FeatureLink
                href="/inspiration"
                title="Commercial"
                description="Browse visual references, creative direction, and curated mood boards."
                icon={Compass}
              />
              <FeatureLink
                href="/ai-prompts"
                title="AI Prompts"
                description="Explore prompt cards for image, colour, and motion workflows."
                icon={Sparkles}
              />
              <FeatureLink
                href="/blogs"
                title="Blogs"
                description="Read practical notes, workflows, and editing ideas."
                icon={BookOpenText}
              />
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function FeatureLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--md-primary)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.14)]"
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(124,131,255,0.16),transparent_70%)] blur-2xl" />
      <div className="absolute -bottom-10 -right-8 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.12),transparent_70%)] blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--md-text-muted)]">
            <Icon className="h-3.5 w-3.5 text-[var(--md-primary)]" />
            Featured
          </div>
          <h3 className="mt-4 text-lg font-medium tracking-[-0.02em] text-[var(--md-text)]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--md-text-muted)]">
            {description}
          </p>
        </div>
        <div className="mt-1 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-2 text-[var(--md-text-muted)] transition-colors group-hover:text-[var(--md-primary)]">
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
