"use client";
import React from "react";
import { Sparkles, Music2, Users, ShieldCheck } from "lucide-react";
import PageShell from "../components/PageShell";

const highlights = [
  {
    title: "Built for editors",
    description:
      "Editors Choice helps video editors, reel creators, and content teams find usable song ideas faster.",
    icon: Music2,
  },
  {
    title: "Focused workflow",
    description:
      "The product is designed around creative intent like gym reels, cinematic edits, bridal videos, travel content, and trending short-form formats.",
    icon: Sparkles,
  },
  {
    title: "Creator-first approach",
    description:
      "Recommendations are made for creators who need practical picks, inspiration, and context instead of generic music lists.",
    icon: Users,
  },
  {
    title: "Platform-aware",
    description:
      "The site is built to support discovery and inspiration without hosting copyrighted full tracks or bypassing licensing rules.",
    icon: ShieldCheck,
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--md-primary)]">
            About
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">About Editors Choice</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--md-text-muted)] sm:text-base">
            Editors Choice, also known as SongFinder AI, is a music discovery tool for video
            editors and creators who need relevant song suggestions for short-form and cinematic
            content.
          </p>
        </header>

        <section className="rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl sm:p-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What the site does</h2>
            <p className="text-sm leading-7 text-[var(--md-text-muted)]">
              Editors Choice helps users discover songs and music directions for reels, social
              videos, edits, travel clips, mood-based storytelling, and creator campaigns. The goal
              is to reduce the time spent searching and give editors a practical starting point for
              their next cut.
            </p>
            <p className="text-sm leading-7 text-[var(--md-text-muted)]">
              The platform focuses on discovery and inspiration. It does not host full copyrighted
              songs for download, and users are responsible for checking licensing and usage rights
              before publishing monetized content.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {highlights.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-[rgba(124,131,255,0.12)] p-3 text-[var(--md-primary)]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--md-text-muted)]">{description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-semibold">Who it is for</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--md-text-muted)]">
            This site is intended for video editors, social media managers, freelance creators,
            production teams, and brand marketers who want music ideas aligned with platform trends
            and editing style.
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--md-text-muted)]">
            Editors Choice is operated by Jyotish Kumar. For partnerships, questions, or support,
            you can reach us through the contact page or by email at{" "}
            <a
              href="mailto:kjyotish124@gmail.com"
              className="text-[var(--md-primary)] underline underline-offset-4"
            >
              kjyotish124@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </PageShell>
  );
}

