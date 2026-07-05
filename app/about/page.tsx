"use client";
import React from "react";
import { BookOpenText, Compass, Sparkles, Users, ShieldCheck } from "lucide-react";
import PageShell from "../components/PageShell";

const highlights = [
  {
    title: "Inspiration-first workflow",
    description:
      "Editors Choice v2 brings together curated inspiration, noticeboard updates, and creative references so editors can discover mood and direction faster.",
    icon: Compass,
  },
  {
    title: "AI prompt library",
    description:
      "The site now offers a polished prompt gallery with category chips for cinematic colour grading, image generation, and image-to-video workflows.",
    icon: Sparkles,
  },
  {
    title: "Built for creators",
    description:
      "Whether you are editing reels, travel films, fashion content, or cinematic shorts, the platform is designed to help you move from idea to execution smoothly.",
    icon: Users,
  },
  {
    title: "Trusted creative support",
    description:
      "The experience is built to support discovery and inspiration without replacing licensing checks, and it stays focused on practical creative use cases.",
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
          <h1 className="text-3xl font-semibold sm:text-4xl">About Editors Choice v2</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--md-text-muted)] sm:text-base">
            Editors Choice is a modern creative toolkit for video editors and content creators. The new version combines inspiration, AI prompts, editorial blogs, and streamlined management tools into one experience.
          </p>
        </header>

        <section className="rounded-[28px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 shadow-lg backdrop-blur-xl sm:p-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What the site does</h2>
            <p className="text-sm leading-7 text-[var(--md-text-muted)]">
              Editors Choice helps users discover visual direction, prompt ideas, and creative reference points for reels, social videos, narrative edits, travel content, and brand campaigns. The goal is to reduce the time spent searching and give creators a practical starting point for their next project.
            </p>
            <p className="text-sm leading-7 text-[var(--md-text-muted)]">
              The platform focuses on discovery and inspiration while keeping its workflow clear and lightweight. It does not host full copyrighted media for download, and users are still responsible for checking licensing and usage rights before publishing monetized content.
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
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-2xl bg-[rgba(124,131,255,0.12)] p-3 text-[var(--md-primary)]">
              <BookOpenText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Who it is for</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--md-text-muted)]">
                This site is intended for video editors, social media managers, freelance creators, production teams, and brand marketers who want faster access to creative ideas and a more structured workflow.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--md-text-muted)]">
            Editors Choice is operated by Jyotish Kumar. For partnerships, questions, or support, you can reach us through the contact page or by email at{" "}
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

