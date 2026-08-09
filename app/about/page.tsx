"use client";

import React from "react";
import { BookOpenText, Compass, Music2, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import PageShell from "../components/PageShell";

const highlights = [
  {
    title: "Creative references",
    description: "Browse visual inspiration and editor-focused ideas to find a stronger mood, composition, or storytelling direction before you start an edit.",
    icon: Compass,
  },
  {
    title: "Practical AI prompts",
    description: "Explore reusable prompts for cinematic colour grades, image generation, and image-to-video workflows, with clear before-and-after context where available.",
    icon: Sparkles,
  },
  {
    title: "Song discovery",
    description: "Search curated tracks by category, preview linked YouTube content, and save or share a music link when you need a starting point for an edit.",
    icon: Music2,
  },
  {
    title: "Editorial learning",
    description: "Read original articles and workflow notes that explain creative decisions, tools, and techniques in useful context—not just a list of links.",
    icon: BookOpenText,
  },
  {
    title: "Built for working creators",
    description: "Editors Choice is designed for video editors, social creators, freelancers, teams, and brands who need a faster route from reference to execution.",
    icon: WandSparkles,
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--md-primary)]">About</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">A practical creative library for editors</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--md-text-muted)] sm:text-base">
            Editors Choice helps creators discover ideas, understand visual direction, and use AI tools more thoughtfully. We bring inspiration, prompt workflows, and editorial guidance into one focused workspace.
          </p>
        </header>

        <section className="rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-semibold">What we publish</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--md-text-muted)]">
            <p>
              Our content is made for the real questions that come up while editing: what mood fits a scene, how can a still become a motion concept, which song direction might work, and where can you begin when a blank timeline needs direction.
            </p>
            <p>
              Editors Choice publishes curated references, original blog content, and prompt examples for educational and creative-use purposes. We aim to make each page useful on its own, with clear context rather than thin or automatically generated filler.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {highlights.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl">
              <div className="mb-4 inline-flex rounded-2xl bg-[rgba(124,131,255,0.12)] p-3 text-[var(--md-primary)]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--md-text-muted)]">{description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl sm:p-8">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--md-primary)]" />
            <div>
              <h2 className="text-xl font-semibold">How we approach trust</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--md-text-muted)]">
                Creative references and AI prompts are starting points, not legal, licensing, or platform-policy advice. Check rights, permissions, tool terms, and suitability before publishing work commercially. We may use clearly identified advertising to support the site, but advertising does not control our editorial opinions or recommendations.
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--md-text-muted)]">
                Editors Choice is operated by Jyotish Kumar. For support, corrections, or partnership enquiries, visit the contact page or email{" "}
                <a href="mailto:kjyotish124@gmail.com" className="text-[var(--md-primary)] underline underline-offset-4">kjyotish124@gmail.com</a>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
