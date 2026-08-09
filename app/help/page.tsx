"use client";

import { BookOpen, BrainCircuit, Compass, Copy, Music2, Search, Sparkles } from "lucide-react";
import PageShell from "../components/PageShell";

const steps = [
  { title: "Find a visual direction", description: "Open Inspiration to browse creative references and noticeboard updates. Use them to define the mood, framing, pacing, or colour direction for your project.", icon: Compass },
  { title: "Use the prompt library", description: "On AI Prompts, choose Cinematic Colour Grade, Image Generate, or Image to Video. Search by prompt title or use a subcategory to narrow the library.", icon: Search },
  { title: "Open, copy, and adapt", description: "Select a prompt card to see the full prompt and its media reference. Use Copy Prompt, then adapt the wording to your subject, format, and preferred AI tool.", icon: Copy },
  { title: "Search for music", description: "On the home page, search the curated song library by keyword or category. Preview the linked YouTube video, then open, copy, or share the original link. Editors Choice does not provide music downloads or licences.", icon: Music2 },
  { title: "Learn the workflow", description: "Read Blogs for original editor notes, practical techniques, and the creative reasoning behind a workflow or idea.", icon: BookOpen },
  { title: "Manage content safely", description: "Dashboard access is for authorised administrators. It is used to publish and manage prompts, blogs, inspiration posts, and uploads.", icon: BrainCircuit },
  { title: "Use references responsibly", description: "Prompts and references are educational starting points. Review licences, permissions, and each platform’s rules before you publish or monetise a project.", icon: Sparkles },
];

export default function HelpPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-5xl flex-1">
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-2 backdrop-blur-xl">
            <BookOpen className="h-4 w-4 text-[var(--md-secondary)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">Help Center</span>
          </div>
          <h1 className="mb-3 text-3xl font-semibold sm:text-4xl md:text-5xl">Make the most of Editors Choice</h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--md-text-muted)]">A quick guide to finding references, using prompts, and applying the site’s ideas in your own creative process.</p>
        </header>

        <section className="grid gap-5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="flex flex-col items-center gap-5 rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 text-center shadow-lg backdrop-blur-xl sm:flex-row sm:items-start sm:text-left">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface)] text-[var(--md-primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--md-primary)]">Step {index + 1}</p>
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                  <p className="text-sm leading-7 text-[var(--md-text-muted)]">{step.description}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-10 rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-3)] p-6 text-center backdrop-blur-2xl">
          <h2 className="text-lg font-semibold">Need help or want to report an issue?</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--md-text-muted)]">Use the contact page to share feedback, report a broken link, or ask a question about using the site.</p>
        </section>
      </div>
    </PageShell>
  );
}
