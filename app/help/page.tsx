"use client";
import { BookOpen, BrainCircuit, Compass, PencilRuler, Sparkles } from "lucide-react";
import PageShell from "../components/PageShell";

const steps = [
  {
    title: "1. Start with inspiration",
    description:
      "Open Inspiration to browse curated references, noticeboard updates, and visual ideas for reels, travel edits, and cinematic storytelling.",
    icon: Compass,
  },
  {
    title: "2. Explore AI prompts",
    description:
      "Use the AI Prompts page to switch between the three category chips: Cinematic Colour Grade, Image Generate, and Image to Video. Pick a prompt, preview the reference, and copy or share it in one click.",
    icon: Sparkles,
  },
  {
    title: "3. Read and learn",
    description:
      "Visit Blogs for practical guides, editor workflows, and creative notes that add context behind each prompt or inspiration piece.",
    icon: PencilRuler,
  },
  {
    title: "4. Use the dashboard",
    description:
      "Logged-in admins can manage prompts, blogs, inspiration content, and uploads from the Dashboard for a smoother publishing workflow.",
    icon: BrainCircuit,
  },
];

export default function HelpPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-5xl flex-1 text-center">
        <header className="mb-10 flex flex-col items-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--md-outline)] bg-[var(--md-surface-2)] px-4 py-2 backdrop-blur-xl">
            <BookOpen className="h-4 w-4 text-[var(--md-secondary)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--md-text-muted)]">
              Help Center
            </span>
          </div>
          <h1 className="mb-3 text-3xl font-semibold sm:text-4xl md:text-5xl">
            How to use the new Editors Choice
          </h1>
          <p className="max-w-2xl text-base text-[var(--md-text-muted)]">
            This version brings inspiration, AI prompt discovery, editorial content, and admin tools into one polished creative workspace.
          </p>
        </header>

        <section className="grid gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex flex-col items-center gap-5 rounded-[22px] border border-[var(--md-outline)] bg-[var(--md-surface-2)] p-6 text-center shadow-lg backdrop-blur-xl sm:flex-row sm:items-start sm:text-left"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--md-outline)] bg-[var(--md-surface)]">
                  <Icon className="h-5 w-5 text-[var(--md-primary)]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                  <p className="text-sm leading-relaxed text-[var(--md-text-muted)]">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-10 rounded-[24px] border border-[var(--md-outline)] bg-[var(--md-surface-3)] p-6 text-center backdrop-blur-2xl">
          <h3 className="mb-2 text-lg font-semibold">Tips for better results</h3>
          <ul className="space-y-2 text-sm text-[var(--md-text-muted)]">
            <li>Start with one clear creative goal so the inspiration and prompts stay relevant.</li>
            <li>Use the category chips on the AI Prompts page to jump to a specific workflow quickly.</li>
            <li>Save time by reading a blog before you start so you can apply a stronger visual direction.</li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
