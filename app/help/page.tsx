"use client";
import { BookOpen, MousePointerClick, Music2, Wand2 } from "lucide-react";
import PageShell from "../components/PageShell";

const steps = [
  {
    title: "1. Choose Your Category",
    description:
      "Type or pick the video/post category (e.g., Travel vlog, Makeup). This guides the song style.",
    icon: Wand2,
  },
  {
    title: "2. Set the Mood",
    description:
      "Tap a Feeling, Language, Hashtag, and Depth tag to match the vibe of your edit.",
    icon: MousePointerClick,
  },
  {
    title: "3. Search Songs",
    description:
      "Click \"Search Song\" to generate a focused list of matches tailored to your selections.",
    icon: Music2,
  },
];

// Help center page with usage steps.
export default function HelpPage() {
  return (
    <PageShell>
      <div className="max-w-5xl mx-auto w-full flex-1 text-center">
        <header className="mb-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-[var(--md-surface-2)] border border-[var(--md-outline)] px-4 py-2 rounded-full mb-4 backdrop-blur-xl">
            <BookOpen className="w-4 h-4 text-[var(--md-secondary)]" />
            <span className="text-xs font-semibold text-[var(--md-text-muted)] uppercase tracking-[0.3em]">
              Help Center
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3">
            How to use EditorsChoice
          </h1>
          <p className="text-[var(--md-text-muted)] text-base max-w-2xl">
            Follow these steps to generate song ideas tailored to your edit style and platform.
          </p>
        </header>

        <section className="grid gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-[var(--md-surface-2)] border border-[var(--md-outline)] rounded-[22px] p-6 backdrop-blur-xl shadow-lg text-center sm:text-left"
              >
                <div className="w-11 h-11 rounded-[14px] bg-[var(--md-surface)] border border-[var(--md-outline)] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[var(--md-primary)]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                  <p className="text-sm text-[var(--md-text-muted)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-10 bg-[var(--md-surface-3)] border border-[var(--md-outline)] rounded-[24px] p-6 backdrop-blur-2xl text-center">
          <h3 className="text-lg font-semibold mb-2">
            Tips for better results
          </h3>
          <ul className="text-sm text-[var(--md-text-muted)] space-y-2">
            <li>Be specific with your category to avoid mixed results.</li>
            <li>Use 1-2 depth tags to keep the vibe focused.</li>
            <li>Try different hashtag options for variety.</li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
